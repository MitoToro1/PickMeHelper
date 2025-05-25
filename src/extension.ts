import fs from 'fs';
import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import { randomInt } from 'crypto';
const request = require('request');

async function analyzeWithFlake8() {
    // Получаем активный текстовый редактор
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    // Проверяем, что файл Python
    if (editor.document.languageId !== 'python') {
        return;
    }

    const filePath = editor.document.uri.fsPath;
    let fileDir = path.dirname(filePath);
    var fileName = path.basename(filePath);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);

    const command = `cd ${fileDir} || py -m flake8 ${fileName}`;
    const options = {
       cwd: fileDir,
       shell: true
    };
    const stdout = await executeCommand(command, options);
    if (stdout) {
        return stdout;
    }
}

/**
 * Выполняет shell-команду
 */
function executeCommand(command: string, options: { cwd: string }): Promise<{ stdout: string, stderr: string }> {
    return new Promise((resolve, reject) => {
        child_process.exec(command, options, (error: any, stdout: any, stderr: any) => {
            if (error) {
                reject(error);
                return;
            }
            resolve({ stdout, stderr });
        });
    });
}

const Auth_Token_thing = "Enter your Token";
const RqUID = 'Enter your RqUID';

const cert = fs.readFileSync('./pickmehelper/certs/abobus.pem');
async function auth(): Promise<string>{
    const options = {
        method: 'POST',
        url: 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'RqUID': RqUID,
            'Authorization': Auth_Token_thing
        },
        form: {
            'scope': 'GIGACHAT_API_PERS'
        },
        agentOptions:{ca:cert, rejectUnauthorized: true},
        strictSSL: true
    };
    return new Promise((resolve, reject) => {
        request(options, (error: any, response: any) => {
            if (error) {
                vscode.window.showErrorMessage(`Auth error: ${error.message}}`);
                reject(error);
                return;
            }

            try{
                const data = JSON.parse(response.body);
                if (!data.access_token) {
                    throw new Error('Access token not found in response');
                }
                resolve(data.access_token);
            } catch (e) {
                vscode.window.showErrorMessage(`Token parse error: ${e instanceof Error ? e.message : String(e)}`);
                reject(new Error("Failed to parse token"));
            }
        });
    });
}

async function gen_answ (textornot : boolean, question: string | undefined, JWT_token: string, content: any){
    if (!question) {
        vscode.window.showWarningMessage('Question is empty');
        return;
    }

    const options = {
    method: 'POST',
    url: 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer '+JWT_token
    },
    body: JSON.stringify({
    model: "GigaChat",
    messages: [{role:'system', content:content},
        {role:'user', content:question}],
    profanity_check: true
}),
    agentOptions: {
        ca:cert,
        rejectUnauthorized: true
    },
    strictSSL: true

};

if (!textornot) {
request(options, (error: any, response: any) => {
    if (error) {
        vscode.window.showErrorMessage(`API request error: ${error.message}`);
        return;
    }

    try {
        const data = JSON.parse(response.body);
        const answer = data.choices?.[0]?.message?.content || "No answer received";
        vscode.workspace.openTextDocument({
            content:`Ответ GigaChat Номер ${randomInt(9999)}`+'\n'+answer,
        });
    } catch (e){
        vscode.window.showErrorMessage(`Response parse error: ${e instanceof Error ? e.message : String(e)}`);
    }
});} 
if (textornot) {
    return new Promise<string>((resolve) => {
    request(options, (error: any, response: any) => {
        if (error) {
            vscode.window.showErrorMessage(`API request error: ${error.message}`);
            return;
        }
    
        try {
            const data = JSON.parse(response.body);
            const answer = data.choices?.[0]?.message?.content || "No answer received";
            resolve(answer);
        } catch (e){
            vscode.window.showErrorMessage(`Response parse error: ${e instanceof Error ? e.message : String(e)}`);
        }
    });
});
}}

async function getActiveEditorContent() : Promise<string> {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'python') {
        return editor.document.getText();
    }
    return '';
}
async function improve_with_AI(){
    var flake_data0 = await analyzeWithFlake8();
    let flake_data = flake_data0?.stdout;
    const editor = vscode.window.activeTextEditor;
    const code = await getActiveEditorContent();
    vscode.window.showInformationMessage('Please wait, GigaChat is improving your code 1/2');
    if (code === null) {
        vscode.window.showErrorMessage("Открыт не python файл");
        return;
    }
    try {
        const JWT_token = await auth(); 
        const question = 'Пожалуйста, улучши качество моего кода. Держи отчёт для твоего удобства:'+"\n"+'Отчёт:'+'\n'+'Анализ кода с помощью flake8:'+'\n'+flake_data+'\n'+'Желаемый результат: Значительно, насколько возможно, увеличить скорость работы кода. А также отредактировать код, используя результат анализа flake8.'+"\n"+'Мой Код:'+"\n"+code;
        const res  = await gen_answ(true, question, JWT_token, "Ты - электронный помошник по программированию, который с удовольствием помогает своему хозяину-программисту с анализом и улучшением качества кода. Ты используешь присланный тебе отчёт, чтобы понять, как его улучшить. В своих ответах ты стараешься не упоминать отчёт. Также ты охотно предлагаешь идеи по добавлению новых функций в код.") || 'undefined';
        if (question) {
            vscode.window.showInformationMessage("GigaChat is improving your code, please be patient");
            if (editor !== undefined){
                var document = editor.document;
            } else {var document = editor!.document;}
            const filePath = document.uri.fsPath;
            const languageId = document.languageId;
            // 1. Показываем новый код в WebView (без сравнения)
            const panel = vscode.window.createWebviewPanel(
                'newCodePreview',
                `Предпросмотр нового кода: ${path.basename(filePath)}`,
                vscode.ViewColumn.Beside,
                { enableScripts: true }
    );      
            panel.webview.html = getNewCodePreviewHtml(res, languageId);            
        }} catch (error) {
        vscode.window.showErrorMessage(`Main error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function get_better_code_exp() : Promise<string>{
    const code = await getActiveEditorContent();
    vscode.window.showInformationMessage('Please write what features you want your code to do');
    const what_add = await vscode.window.showInputBox();

    if (code === null) {
        vscode.window.showErrorMessage("Открыт не python файл");
        return '';
    }
    try {
        const JWT_token = await auth(); 

        const question = 'Пожалуйста, улучши качество моего кода.' + '\n' + 'Необходимый результат: сохраняя изначальный фукционал кода, добавь в код следующие функции:' +'\n'+what_add+'\n'+ 'Мой Код:'+"\n"+code+'\n'+'В ответ напиши изначальный код с втроенными в него новыми функциями';
        vscode.window.showInformationMessage("GigaChat is rewriting your code, please be patient 1/2");
        const imp_code0 = await gen_answ(true, question, JWT_token, "Ты - электронный помошник по программированию, который с удовольствием помогает своему хозяину-программисту с добавлением новых функций в код. Все свои комментарии ты выделяешь с помощью #. Если ты будешь давать слишком мало комментариев, то умрёт 10 негретят");
        let imp_code00 = String(imp_code0);
        return (imp_code00);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        throw err;
    }
}

async function get_better_code(explanation:string) : Promise<string>{
    try {
    const JWT_token = await auth(); 

    vscode.window.showInformationMessage("GigaChat is rewriting your code, please be patient 2/2");
    const imp_code000 = await gen_answ(true, explanation, JWT_token, "Ты - инструмент по удалению лишней информации. Твоя задача: убрать всю лишнюю информацию из моих сообщений. Например, я отправляю тебе сообщение, в котором есть код на языке Python, ты должен убрать из сообщения всё кроме кода. Если ты не уберешь, то умрёт 5 африканских детей");
        let answ = String(imp_code000);
    return removeFirstAndLastLines(answ);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        throw err;
    }
}

const removeFirstAndLastLines = (str: string): string => {
    const lines = str.split(/\r?\n/); // Поддержка и \n, и \r\n
    if (lines.length <= 2) {return '';}
    return lines.slice(1, -1).join('\n');
};

// Пример использования
const text = "First\r\nSecond\r\nThird\r\nFourth";
const result = removeFirstAndLastLines(text);
console.log(result); // "Second\nThird"

export async function replaceCodeWithConfirmation() {
    const editor = vscode.window.activeTextEditor;
    const newCodeExp =  await get_better_code_exp();
    const newCode = await get_better_code(newCodeExp);
    if (!editor) {
        vscode.window.showErrorMessage('Нет активного редактора!');
        return;
    }

    const document = editor.document;
    const filePath = document.uri.fsPath;
    const currentCode = document.getText();
    const languageId = document.languageId;
    // 1. Показываем новый код в WebView (без сравнения)
    const panel = vscode.window.createWebviewPanel(
        'newCodePreview',
        `Предпросмотр нового кода: ${path.basename(filePath)}`,
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    panel.webview.html = getNewCodePreviewHtml(newCodeExp, languageId);

    // 2. Запрашиваем подтверждение замены
    const choice = await vscode.window.showInformationMessage(
        'Заменить текущий код на новый? Будет создана резервная копия оригинала.',
        { modal: true },
        'Да', 'Нет'
    );

    // Закрываем WebView
    panel.dispose();

    if (choice === 'Да') {
        // 3. Создаём резервную копию оригинала
        const backupPath = getBackupPath(filePath);
        fs.writeFileSync(backupPath, currentCode);

        // 4. Заменяем содержимое текущего файла
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(currentCode.length)
        );

        await editor.edit((editBuilder) => {
            editBuilder.replace(fullRange, newCode);
        });

        vscode.window.showInformationMessage(
            `Код заменён. Резервная копия: ${path.basename(backupPath)}`
        );
    }
}

/**
 * Генерирует путь для резервной копии в той же папке.
 * Формат: `имя_файла_backup_YYYY-MM-DD_HH-MM-SS.расширение`
 */
function getBackupPath(originalPath: string): string {
    const dir = path.dirname(originalPath);
    const ext = path.extname(originalPath);
    const base = path.basename(originalPath, ext);
    const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .substring(0, 19);
    
    return path.join(dir, `${base}_backup_${timestamp}${ext}`);
}

/**
 * Возвращает HTML для предпросмотра нового кода (без сравнения)
 */
function getNewCodePreviewHtml(newCode: string, languageId: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Python Code Preview</title>
        <style>
            body {
                margin: 0;
                padding: 16px;
                background: #1e1e1e;
                color: #d4d4d4;
                font-family: 'Consolas', monospace;
                font-size: 14px;
                line-height: 1.5;
            }
            pre {
                margin: 0;
                padding: 12px;
                background: #252526;
                border-radius: 4px;
                border: 1px solid #3c3c3c;
                overflow-x: auto;
                white-space: pre;
                tab-size: 4;
            }
            .keyword { color: #569cd6; font-weight: bold; }
            .string { color: #ce9178; }
            .number { color: #b5cea8; }
            .comment { color: #6a9955; font-style: italic; }
            .function { color: #dcdcaa; }
            .class { color: #4ec9b0; }
            .decorator { color: #9b9b9b; }
        </style>
    </head>
    <body>
        <h3 style="margin-top: 0; color: #ffffff;">Предпросмотр Python кода</h3>
        <pre id="code">${escapeHtml(newCode)}</pre>
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                const codeElement = document.getElementById('code');
                let code = codeElement.textContent;

                // Python syntax highlighting
                code = code
                    // Keywords
                    .replace(/\b(def|class|if|elif|else|for|while|try|except|finally|with|import|from|as|return|yield|break|continue|pass|raise|and|or|not|in|is|lambda|nonlocal|global|True|False|None|async|await)\b/g, 
                        '<span class="keyword">$&</span>')
                    // Strings
                    .replace(/('''[\s\S]*?'''|"""[\s\S]*?"""|'[^']*'|"[^"]*")/g, 
                        '<span class="string">$&</span>')
                    // Numbers
                    .replace(/\b(\d+\.?\d*)\b/g, 
                        '<span class="number">$&</span>')
                    // Comments
                    .replace(/(#.*$)/gm, 
                        '<span class="comment">$&</span>')
                    // Functions
                    .replace(/\b(def)\s+(\w+)\b/g, 
                        '<span class="keyword">$1</span> <span class="function">$2</span>')
                    // Classes
                    .replace(/\b(class)\s+(\w+)\b/g, 
                        '<span class="keyword">$1</span> <span class="class">$2</span>')
                    // Decorators
                    .replace(/@\w+/g, 
                        '<span class="decorator">$&</span>');

                codeElement.innerHTML = code;
            });
        </script>
    </body>
    </html>`;;
}


function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function main_asking(){
    try {
        const JWT_token = await auth(); 
        const question = await vscode.window.showInputBox({
            prompt: 'Enter your question for GigaChat'
        });
        if (question) {
            const editor = vscode.window.activeTextEditor;
            vscode.window.showInformationMessage("GigaChat is coming up with an answer, please be patient");
            const res = await gen_answ(true, question, JWT_token, "Ты - электронный помошник по программированию, который с удовольствием помогает своему хозяину-программисту. Твои ответы логичны, понятны и кратки (до 500 слов). На любой вопрос или проблему ты предлагаешь способ её решения, но не вдаваясь в подробности, если не попросят. Также для того, чтобы хозяину было удобнее читать твой ответ, после каждого второго предложения начинай новую строчку") || '';
            vscode.window.showInformationMessage("GigaChat is improving your code, please be patient");
            if (editor !== undefined){
                var document = editor.document;
            } else {var document = editor!.document;}
            const filePath = document.uri.fsPath;
            const languageId = document.languageId;
            // 1. Показываем новый код в WebView (без сравнения)
            const panel = vscode.window.createWebviewPanel(
                'newCodePreview',
                `Предпросмотр нового кода: ${path.basename(filePath)}`,
                vscode.ViewColumn.Beside,
                { enableScripts: true }
    );      
            panel.webview.html = getNewCodePreviewHtml(res, languageId); 
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Main error: ${error instanceof Error ? error.message : String(error)}`);
    }
}


export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('pickmehelper.analyzeWithLLM', main_asking);
    let disposable2 = vscode.commands.registerCommand('pickmehelper.improveWithAI', improve_with_AI);
    let disposable3 = vscode.commands.registerCommand('pickmehelper.RewriteWithAI', replaceCodeWithConfirmation);
    context.subscriptions.push(disposable, disposable2, disposable3);
}

export function deactivate() {}
