import * as vscode from 'vscode';
import { changeReference } from 'fe-mv/lib/move';
import { getProjectDir, showProjectTree, showTypeMessage, formatFileName, getSwitchType } from './handlers/handlers';
import { SWITCH_TYPE, DEFAULT_TYPES } from './configs/configs';

export function activate(context: vscode.ExtensionContext) {
	let currentTypes:Array<any> = DEFAULT_TYPES;
	let projectRootPath = '';
	let fileMap = new Map();
	let showMessageAndRefreshTree = () => {
		showTypeMessage(currentTypes);
		fileMap = showProjectTree(projectRootPath, currentTypes);
	};

	let checkName = vscode.commands.registerCommand('fe-file-rename.checkName',(params) => {
		projectRootPath = getProjectDir(params.fsPath);
		showMessageAndRefreshTree();
	});

	let refresh = vscode.commands.registerCommand('fe-file-rename.refresh',() => {
		showMessageAndRefreshTree();
	});

	let switchType = vscode.commands.registerCommand('fe-file-rename.switchCheckType', async () => {
		let optTemp:Array<any> = [];
		let operator = await vscode.window.showQuickPick(getSwitchType('dir'),{
			canPickMany: false,
        	placeHolder: '请选择文件夹校验规则【文件名建议只使用小写字母，现不支持大驼峰】'
		});
		if( operator) {
			optTemp = [operator.key];
			operator = await vscode.window.showQuickPick(getSwitchType('file'), {
				canPickMany: false,
				placeHolder: '请选择文件校验规则'
			});
			if( operator ){
				optTemp.push(operator.key);
			}
		}
		if(optTemp.length < 2){
			vscode.window.showErrorMessage('你未选择文件夹或者文件名校验规则，校验规则未发生变化！');
			optTemp = [];
			return;
		}
		currentTypes = optTemp;
		optTemp = [];
		showMessageAndRefreshTree();
	});

	let batchOp = vscode.commands.registerCommand('fe-file-rename.batchOp', async () => {
		let path = require('path');
		let fs = require('fs');
		let errorList = [];
		const rootDirName = path.basename(projectRootPath);
		for(let file of fileMap.values()){
			if(file.error){
				errorList.push({
					label:	`【${file.type}】${file.name}【${rootDirName + file.path.replace(projectRootPath,'')}】`,
					type: file.type,
					path: file.path,
					name: file.name
				});
			}
		}
		if(errorList.length === 0) {
			vscode.window.showErrorMessage('文件命名全部符合规范，无需修改');
			return;
		}
		errorList.sort((front, behind) => {
			return front.type.length - behind.type.length;
		});
		const operator = await vscode.window.showQuickPick(errorList,{
			canPickMany: true,
        	placeHolder: '请选择需要规范化的文件'
		});
		if(!operator || !operator.length) {
			vscode.window.showErrorMessage('你未做选择！');
			return;
		}
		operator.sort((a, b) => {
			return path.normalize(b.path).split(/[\\]/).length - path.normalize(a.path).split(/[\\]/).length;
		});
		for(const operateItem of operator) {
			const normativeName = formatFileName(operateItem.name, operateItem.type, operateItem.type === 'dir' ? currentTypes[0] : currentTypes[1]);
			const newPath = path.join(operateItem.path, '..', normativeName);
			changeReference(operateItem.path, newPath, projectRootPath);
			fs.renameSync(operateItem.path, newPath);
		}
		fileMap = showProjectTree(projectRootPath, currentTypes);
	});
	context.subscriptions.push(...[checkName, switchType, batchOp, refresh]);
}

export function deactivate() {}
