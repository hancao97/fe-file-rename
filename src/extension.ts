import * as vscode from 'vscode';
import { changeReferenceSync } from 'fe-mv/lib/move';
import { getProjectDir, showProjectTree, showTypeMessage, showOnOffMessage, formatFileName, getSwitchType, checkOperable } from './handlers/handlers';
import { DEFAULT_TYPES } from './configs/configs';

export function activate(context: vscode.ExtensionContext) {
	let currentTypes:Array<any> = DEFAULT_TYPES;
	let projectRootPath = '';
	let fileMap = new Map();
	let isAutoReference = false;
	const onWillRenameFiles: vscode.Event<vscode.FileWillRenameEvent> = vscode.workspace.onWillRenameFiles;
	const watcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher("**/*", false, false, false);
	watcher.onDidChange(() => {
		// 更新文件视图
		fileMap = showProjectTree(projectRootPath, currentTypes);
	});
	onWillRenameFiles(async ({ files }) => {
		if(!isAutoReference){
			return;
		}
		const path = require('path');
		if(files.length !== 1) { //单文件拖拽，避免引用修改错误
			vscode.window.showErrorMessage('一次仅操作一个文件时可以使用本工具进行引用修改~');
			return;
		}
		const oldPath = path.normalize(files[0].oldUri.fsPath);
		const newPath = path.normalize(files[0].newUri.fsPath);
		const operable = checkOperable(oldPath, newPath);
		if( operable ){
			changeReferenceSync(oldPath, newPath, projectRootPath);
		} else {
			const tempNamePath = path.join(oldPath, '..', 'feFileRenameTempNamePath' + path.basename(newPath));;
			changeReferenceSync(oldPath, tempNamePath, projectRootPath);
			changeReferenceSync(tempNamePath, newPath, projectRootPath);
		}
	});

	const init = vscode.commands.registerCommand('fe-file-rename.init',(params) => {
		projectRootPath = getProjectDir(params.fsPath);
		showOnOffMessage(isAutoReference);
		showTypeMessage(currentTypes);
		fileMap = showProjectTree(projectRootPath, currentTypes);
	});

	const refresh = vscode.commands.registerCommand('fe-file-rename.refresh',() => {
		showTypeMessage(currentTypes);
		fileMap = showProjectTree(projectRootPath, currentTypes);
	});

	const switchOnOff = vscode.commands.registerCommand('fe-file-rename.switchOnOff',(params) => {
		isAutoReference = !isAutoReference;
		showOnOffMessage(isAutoReference);
	});

	const switchType = vscode.commands.registerCommand('fe-file-rename.switchCheckType', async () => {
		let optTemp:Array<any> = [];
		let operator = await vscode.window.showQuickPick(getSwitchType('dir'),{
			canPickMany: false,
        	placeHolder: '请选择文件夹校验规则'
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
			showTypeMessage(currentTypes);
			// vscode.window.showErrorMessage('你未选择文件夹或者文件名校验规则，校验规则未发生变化！');
			optTemp = [];
			return;
		}
		currentTypes = optTemp;
		optTemp = [];
		showTypeMessage(currentTypes);
		fileMap = showProjectTree(projectRootPath, currentTypes);
	});

	const batchOp = vscode.commands.registerCommand('fe-file-rename.batchOp', async () => {
		let path = require('path');
		let fs = require('fs');
		let errorList = [];
		for(let file of fileMap.values()){
			if(file.error){
				errorList.push({
					label:	`【${file.type}】${file.name}【${file.path.replace(projectRootPath,'')}】`,
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
			const operable = checkOperable(operateItem.path, newPath);
			if( operable ){
				changeReferenceSync(operateItem.path, newPath, projectRootPath);
				fs.renameSync(operateItem.path, newPath);
			} else {
				const tempNamePath = path.join(operateItem.path, '..', 'feFileRenameTempNamePath' + normativeName);;
				changeReferenceSync(operateItem.path, tempNamePath, projectRootPath);
				fs.renameSync(operateItem.path, tempNamePath);
				changeReferenceSync(tempNamePath, newPath, projectRootPath);
				fs.renameSync(tempNamePath, newPath);
			}
		}
		fileMap = showProjectTree(projectRootPath, currentTypes);
	});
	context.subscriptions.push(...[init, switchOnOff, switchType, batchOp, refresh]);
}

export function deactivate() {}
