import { TreeItem, TreeItemCollapsibleState, TreeDataProvider, Uri, window, EventEmitter, Event, commands } from 'vscode';
import * as vscode from 'vscode';
import { join } from 'path';
import { ITEM_ICON_MAP } from './configs/configs';
import { types } from 'node:util';

export class TreeItemNode extends TreeItem {
    public path:string;
    public iconPath:any;

    constructor(
        public readonly label: string,
        public readonly collapsibleState: TreeItemCollapsibleState,
        path:string
    ){
        super(label, collapsibleState);
        this.path = path;
        const fileInfo = TreeViewProvider.fileMap.get(this.path);
        this.iconPath = TreeItemNode.getIconUri(fileInfo.error ? 'error' : fileInfo.type);
    }

    static getIconUri(type: string):Uri {
        return Uri.file(join(__filename,'..', '..' ,'resources', ITEM_ICON_MAP.get(type)+''));
    }
}

export class TreeViewProvider implements TreeDataProvider<TreeItemNode>{
    private _onDidChangeTreeData: EventEmitter<TreeItemNode | void> = new EventEmitter<TreeItemNode | void>();
    readonly onDidChangeTreeData: Event<TreeItemNode | void> = this._onDidChangeTreeData.event; 
    
    static fileMap:any;
    private projectFileTree:Array<any>;

    constructor(projectFileTree:any, fileMap:any) {
        this.projectFileTree = projectFileTree;
        TreeViewProvider.fileMap = fileMap;
    }

    getTreeItem(element: TreeItemNode): TreeItem | Thenable<TreeItem> {
        return element;
    }

    getChildren(element?: TreeItemNode) {
        let subTree = [];
        if(element){
           if(element.path) {
                subTree = TreeViewProvider.fileMap.get(element.path).children || [];
           }
        } else {
            subTree = this.projectFileTree;
        }
        subTree.sort((fileFront:any,fileEnd:any)=>fileFront.type.length - fileEnd.type.length);
        return subTree.map(
            (item:any) => {
                const collapsedType = item.type === 'dir' ? 'Collapsed' : 'None';
                const node = new TreeItemNode(
                    item.name as string,
                    TreeItemCollapsibleState[collapsedType],
                    item.path
                );
                return node;
            });
    }

    public static initTreeView(projectFileTree:any, fileMap:any){
        const treeViewProvider = new TreeViewProvider(projectFileTree, fileMap);
        vscode.window.createTreeView('feProjectTree-main', {
            treeDataProvider: treeViewProvider
          });
        commands.executeCommand("setContext", "isProjectTreeInit", true);
        
    }
}