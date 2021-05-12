import { EXCLUDE_DIR_NAME, EXCLUDE_FILE_NAME, SWITCH_TYPE } from '../configs/configs';
import { TreeViewProvider } from '../tree-view-provider';
import * as vscode from 'vscode';
import { TYPE_MAP, TYPE_REGEXP_MAP } from '../configs/configs';

const isIncludeDir = (fileName:string):boolean => {
  //特殊文件夹排除，文件夹中含有. 排除
  if(EXCLUDE_DIR_NAME.includes(fileName) || fileName.includes('.')){
    return false;
  }
  return true;
};

const isIncludeFile = (fileName:string):boolean => {
  const list = fileName.split('.').reverse();
  //排除有多个. （两个及以上）以及具有特殊后缀名的文件
  if(list.length > 2 || EXCLUDE_FILE_NAME.includes(list[0]) || fileName.startsWith('.')){
    return false;
  }
  return true;
};

const getFileTree = (filePath: any) => {
    let path = require('path');
    let fs = require('fs');
    let fileStats = fs.statSync(filePath);
    if(!fileStats.isDirectory()){
        return [{
            path: filePath,
            name: path.basename(filePath),
            type: 'file',
            deep: 0
        }];
    }
    let fileTree = [];
    const readDir = (filePath:any, deep:any) => {
      let result:any = {
        path: filePath,
        name: path.basename(filePath),
        type: 'dir',
        deep: deep
      };
      let files = fs.readdirSync(filePath);
      result.children = files.map((file:any) => {
        let subPath = path.join(filePath, file);
        let stats = fs.statSync(subPath);
        if (stats.isDirectory() && isIncludeDir(file)) {
          return readDir(subPath, deep + 1);
        }else if(!stats.isDirectory() && isIncludeFile(file)){
          return {
            path: subPath,
            name: file,
            type: 'file',
            deep: deep + 1
          };
        }else{
          return {};
        }
      }).filter((item:any) => item.name);
      return result;
    };
    fileTree.push(readDir(filePath, 0));
    return fileTree;
  };

const lodashFormat = (str:string, rule:string) => {
  const _ = require('lodash');
  switch (rule) {
    case 'LowerCamelCase':
      return _.camelCase(str);
    case 'UpperCamelCase':
      let strTemp = _.camelCase(str);
      return strTemp[0].toUpperCase() + strTemp.slice(1);
    case 'ConnectingLine':
      return _.kebabCase(str);
    case 'UnderLine':
      return _.snakeCase(str);
  }
};

export const getSwitchType = (type: string) => {
  const switchType = SWITCH_TYPE.slice();
  if(type === 'file'){
    return switchType;
  }
  switchType.pop();
  return switchType;
};

export const getProjectDir = (filePath: any):string => {
  let path = require('path');
  let fs = require('fs');
  let fileStats = fs.statSync(filePath);
  if(!fileStats.isDirectory()){
    //文件直接去上层
    return getProjectDir(path.join(filePath,'..'));
  } else {
    //目录去判断package.json
    let files = fs.readdirSync(filePath);
    if(files.some((item:any) => item === 'package.json')){
      return filePath;
    }
    const upperDir = path.join(filePath,'..');
    if(upperDir === filePath){
      return '';
    }else {
      return getProjectDir(upperDir);
    }
  }
};

export const showProjectTree = (projectRootPath:any, currentTypes:any, ) => {
  if(!projectRootPath){
    vscode.window.showErrorMessage('不是前端项目');
    return new Map();
  }
  const projectFileTree = getFileTree(projectRootPath);
  const fileMap = getFileMap(projectFileTree, currentTypes);
  TreeViewProvider.initTreeView(projectFileTree, fileMap);
  return fileMap;
};

export const showTypeMessage = (currentTypes:Array<any>) => {
  vscode.window.showInformationMessage(`文件夹名称校验规则为：${TYPE_MAP.get(currentTypes[0])}`);
  vscode.window.showInformationMessage(`文件名称校验规则为：${TYPE_MAP.get(currentTypes[1])}`);
};

export const getFileMap = (projectFileTree:any, types:any, map?:any) => {
  const dirReg = new RegExp(TYPE_REGEXP_MAP.get(types[0]) as string);
  const fileReg = new RegExp(TYPE_REGEXP_MAP.get(types[1]) as string);
  const isRoot = !map;
  let fileMap = map? map : new Map();
  for(const item of projectFileTree){
    const isErrorFile = item.type === 'file' && !fileReg.test(item.name.split('.')[0]);
    // 根节点不让改名
    const isErrorDir = item.type === 'dir' && !dirReg.test(item.name) && !isRoot;
    if(isErrorFile || isErrorDir){
      item.error = true;
    }
    fileMap.set(item.path,item);
    if(item.children){
        getFileMap(item.children, types, fileMap);
    }
  }
  return fileMap;
};

export const formatFileName = (fileName:string, type:string, rule:string) => {
  const underlineReg = new RegExp(/^(_)\1$/);
  if(type === 'dir'){
    if(underlineReg.test(fileName)){
      return `_${lodashFormat(fileName.substring(1,fileName.length - 1), rule)}_`;
    }else{
      return lodashFormat(fileName, rule);
    }
  } else if(type === 'file') {
    const fileInfoList = fileName.split('.');
    const fileSuffix = fileInfoList[1]||'';
    const fileBaseName = fileInfoList[0];
    if(underlineReg.test(fileName)) {
      return fileSuffix ? `_${lodashFormat(fileBaseName.substring(1,fileBaseName.length - 1), rule)}_.${fileSuffix}`:`_${lodashFormat(fileBaseName.substring(1,fileBaseName.length - 1), rule)}_`;
    } else {
      return fileSuffix ? `${lodashFormat(fileBaseName, rule)}.${fileSuffix}`:lodashFormat(fileBaseName, rule);
    }
  }
};

// export const checkOperable = (oldSource:string, newFileName:string) => {
//   let path = require('path');
//   let fs = require('fs');
//   let fileStats = fs.statSync(oldSource);
//   const isFile = !fileStats.isDirectory();
//   const isDifferent = path.basename(oldSource).toLowerCase() !== newFileName.toLowerCase;
//   if(isFile || isDifferent) {
//     return true;
//   }
//   return false;
// };


//TODO:注释信息丢弃处
// private getSubTreeByPath(path:string,fileTree:Array<any>):Array<any>{
//     let treeTemp:Array<any> = [];
//     for(const item of fileTree){
//         if(item.path === path){
//             return item.children || [];
//         }else{
//             if(item.children && item.children.length && !treeTemp.length){
//                 treeTemp = this.getSubTreeByPath(path,item.children);
//                 if(treeTemp.length) {
//                     return treeTemp;
//                 }
//             }
//         }
//     }
//     return treeTemp;
// }
// TODO: 大驼峰、连接线、小驼峰、下划线等格式互相转化，或自行重命名
// TODO: 移动文件/文件夹自动更新依赖
// let rename = vscode.commands.registerCommand('fe-file-rename.rename', (params) => {
// 	const filePath = params.fsPath;
// 	vscode.window.showInformationMessage(JSON.stringify(params));
// 	vscode.window.showInformationMessage(filePath);
// 	// TODO: 调用移动文件函数
// 	// move("filepath", "newpath", {
// 	// 	root: "projectRootPath"
// 	// });
// webViewPanel(context, projectFileTree);
// });

// function test(i:any, operator:any){
	// 	const path = require('path');
	// 	setTimeout(() => {
	// 		fileMap = showProjectTree(projectRootPath, currentTypes);
	// 		if(i < operator.length){
	// 			const normativeName = formatFileName(operator[i].name, operator[i].type, operator[i].type === 'dir' ? currentTypes[0] : currentTypes[1]);
	// 			const newPath = path.join(operator[i].path, '..', normativeName);
	// 			move(operator[i].path, newPath, {
	// 				root: projectRootPath
	// 			});
	// 			test(i+1, operator);
	// 		}
	// 	}, 1000);
	// }



