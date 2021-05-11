import * as vscode from 'vscode';
export const webViewPanel = (context: vscode.ExtensionContext, fileTree: any) => {
    const panel = vscode.window.createWebviewPanel(
        'fileTree',
        'File Tree',
        vscode.ViewColumn.One, 
        {
          enableScripts: true, // 允许 JavaScript
          retainContextWhenHidden: true // 在 hidden 的时候保持不关闭
        }
      );
      const treeDom = getDom(fileTree);
      panel.webview.html = getWebViewContent(treeDom);
      panel.onDidDispose(
        () => {
          console.log('页面关闭');
        },
        null,
        context.subscriptions
      );
};
const getWebViewContent = (treeDom: any):string => {
    return `<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
                    <title>Document</title>
                    <style>
                        * {
                            font-size: 24px;
                        }
                        .dir {
                            background: #7FFFD4;
                            padding: 4px 8px;
                            border-bottom : 4px solid #fff;
                        }
                        .file {
                            background: #FFF8DC;
                            padding: 4px 8px;
                            border-bottom : 2px solid #fff;
                        }
                        .title {
                            font-size: 30px;
                            font-weight: 600;
                        }
                    </style>
                </head>
                <body>
                    <h class = "title">文件命名检查</h>
                    ${treeDom} 
                </body>
                </html>
            `;
};
const getDom = (fileTree: any) => {
    let res = '';
    let isStandard;
    const reg = new RegExp(/([A-Z])/g);
    for(const file of fileTree){
        if(file.type === 'directory'){
            res += `<div style="margin-left: ${file.deep*24}px;" class="dir" >${file.name}</div>`;
            res += getDom(file.children);
        }else{
            res += `<div style="margin-left: ${file.deep*24}px;" class="file">${file.name}</div>`;
        }
    }
    return res;
};