
A VSCode extension that lets you use the power of GigaChat to improve the quality of your Python code!
##Features

##The extension includes three main features:

    ###"Ask GigaChat" command - Lets you ask GigaChat AI anything, with the answer displayed in a temporary text file.

    ###"Improve with GigaChat" command - Creates a temporary text file containing:

        An improved version of the user's code (from the currently open editor)

        An explanation of the improvements

        Suggestions for new features

    ###"Rewrite with GigaChat" command - Generates an new version of the code, with new functions that user asks for, and displays it in an HTML window, asking the user whether to rewrite the original code. If the user agrees to rewrite, the command automatically creates a backup file of the original code and replaces all the code with new one.

##Known Issues

    ###Internet connection required

    ###You will need to get your own:

        GigaChat API key

        RqUID (Client ID)

        SCOPE

(These can be acquired through GigaChat's official website:
https://developers.sber.ru/portal/products/gigachat-api)

    ###Sometimes, "Rewrite with GigaChat" might generate empty output:
     This rarely happens, the issue is not fixable due to it being a GigaChat-side error. 
     If this happens, you should just try using command again.

##Release Notes
1.0.0 - Initial release of pickmehelper

##Enjoy!
