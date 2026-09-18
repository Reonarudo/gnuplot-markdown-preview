import * as vscode from 'vscode';
import { createHash } from 'node:crypto';
import { resolve, dirname, sep } from 'node:path';
import { dataReferences, mountSource, validateDataPath } from './dataReferences';
import { MAX_FILE_BYTES, MAX_TOTAL_BYTES, MAX_FILES, validateLocalFile } from './dataLoader';
import type { RenderInput } from './renderer';
interface Entry { document:string; paths:Set<string>; bytes:number; input?:RenderInput; error?:string; }
const MAX_CACHE_BYTES=32*1024*1024;
const MAX_ENTRIES=128;
const MAX_PENDING=8;
export class DocumentData implements vscode.Disposable {
  private readonly entries=new Map<string,Entry>();
  private readonly subscriptions:vscode.Disposable[]=[];
  private bytes=0;
  private pending=0;
  private disposed=false;
  private timer:ReturnType<typeof setTimeout>|undefined;
  constructor() {
    const watcher=vscode.workspace.createFileSystemWatcher('**/*');
    const changed=(uri:vscode.Uri):void=>this.invalidate(uri);
    this.subscriptions.push(watcher,watcher.onDidChange(changed),watcher.onDidCreate(changed),watcher.onDidDelete(changed),
      vscode.commands.registerCommand('gnuplotMarkdownPreview.refreshData',()=>this.clear()),
      vscode.workspace.onDidRenameFiles(event=>{for(const file of event.files){changed(file.oldUri);changed(file.newUri);}}),
      vscode.workspace.onDidSaveTextDocument(doc=>changed(doc.uri)),
      vscode.workspace.onDidChangeTextDocument(({document})=>{if(document.languageId==='markdown')for(const [key,entry] of this.entries)if(entry.document===document.uri.toString())this.remove(key);}),
      vscode.workspace.onDidCloseTextDocument(doc=>{for(const [key,entry] of this.entries)if(entry.document===doc.uri.toString())this.remove(key);}),
      vscode.workspace.onDidChangeWorkspaceFolders(()=>this.clear()),
      vscode.workspace.onDidGrantWorkspaceTrust(()=>this.clear()));
  }
  private remove(key:string):void {const entry=this.entries.get(key);if(entry){this.bytes-=entry.bytes;this.entries.delete(key);}}
  private clear():void {this.entries.clear();this.bytes=0;this.refresh();}
  private refresh():void {
    if(this.disposed || this.timer)return;
    this.timer=setTimeout(()=>{this.timer=undefined;void vscode.commands.executeCommand('markdown.preview.refresh').then(undefined,()=>{});},100);
  }
  private invalidate(uri:vscode.Uri):void {
    if(uri.scheme!=='file')return;
    let changed=false;
    for(const [key,entry] of this.entries) {
      if([...entry.paths].some(p=>p===uri.fsPath || p.startsWith(uri.fsPath+sep))) {this.remove(key);changed=true;}
    }
    if(changed)this.refresh();
  }
  prepare(source:string,env:unknown):RenderInput|undefined {
    const refs=dataReferences(source);
    if(!refs.length)return {source};
    if(!vscode.workspace.isTrusted)throw new Error('External data requires a trusted workspace. Function and inline-data plots remain available.');
    const candidate=(env as {currentDocument?:unknown}|undefined)?.currentDocument;
    if(!(candidate instanceof vscode.Uri) || candidate.scheme==='untitled')throw new Error('Save this Markdown document inside a workspace folder to use data files.');
    const root=vscode.workspace.getWorkspaceFolder(candidate)?.uri;
    if(!root)throw new Error('Open this Markdown document’s folder as a workspace to use data files.');
    if(candidate.scheme!=='file' || root.scheme!=='file')throw new Error('External data currently requires a local filesystem workspace. Inline data still works on this provider.');
    const paths=[...new Set(refs.map(ref=>ref.path))];
    if(paths.length>MAX_FILES)throw new Error(`A plot can reference at most ${MAX_FILES} data files.`);
    for(const path of paths)validateDataPath(path);
    const key=JSON.stringify([candidate.toString(),source]);
    let entry=this.entries.get(key);
    if(!entry) {
      if(this.entries.size>=MAX_ENTRIES)throw new Error('Too many file-backed plots are open. Close unused Markdown documents and refresh.');
      if(this.pending>=MAX_PENDING){this.refresh();return undefined;}
      entry={document:candidate.toString(),paths:new Set(paths.map(p=>resolve(dirname(candidate.fsPath),p))),bytes:0};
      this.entries.set(key,entry);this.pending++;
      const current=entry;
      void this.load(source,refs,paths,root.fsPath,candidate.fsPath).then(input=>{
        if(this.disposed || this.entries.get(key)!==current)return;
        const count=input.files?.reduce((sum,f)=>sum+f.bytes.length,0)??0;
        if(this.bytes+count>MAX_CACHE_BYTES){current.error='Open data exceeds the 32 MiB cache budget. Close unused Markdown documents and run Gnuplot: Refresh Data.';return;}
        current.bytes=count;this.bytes+=count;current.input=input;
      },error=>{if(this.entries.get(key)===current)current.error=error instanceof Error?error.message:'Unable to load plot data.';})
      .finally(()=>{this.pending--;this.refresh();});
    }
    if(entry.error)throw new Error(entry.error);
    return entry.input;
  }
  private async load(source:string,refs:ReturnType<typeof dataReferences>,paths:string[],root:string,document:string):Promise<RenderInput> {
    const files=[];const names=new Map<string,string>();let total=0;
    for(const [index,operand] of paths.entries()) {
      try {
        const path=await validateLocalFile(root,document,operand);
        const uri=vscode.Uri.file(path);
        const before=await vscode.workspace.fs.stat(uri);
        if(before.type!==vscode.FileType.File)throw new Error('Expected a regular data file.');
        if(before.size>MAX_FILE_BYTES)throw new Error('Data file exceeds the 1 MiB limit.');
        const bytes=await vscode.workspace.fs.readFile(uri);
        // Recheck containment and metadata after the asynchronous provider read.
        await validateLocalFile(root,document,operand);
        const after=await vscode.workspace.fs.stat(uri);
        if(before.size!==after.size || before.mtime!==after.mtime)throw new Error('Data changed while loading. Save the file again or refresh the preview.');
        if(bytes.length>MAX_FILE_BYTES)throw new Error('Data file exceeds the 1 MiB limit.');
        total+=bytes.length;if(total>MAX_TOTAL_BYTES)throw new Error('Plot data exceeds the combined 4 MiB limit.');
        const name=`data-${index}.dat`;names.set(operand,name);files.push({name,bytes,displayName:operand});
      } catch(error) {
        const code=(error as {code?:string}).code;
        const message=code || (error instanceof Error?error.message:'Unable to read data.');
        // Never include provider errors containing absolute host paths.
        throw new Error(`Cannot load data file ${JSON.stringify(operand)}: ${message.includes(root)?'File unavailable or access denied.':message}`);
      }
    }
    const identity=createHash('sha256').update(document).update(source);
    for(const file of files)identity.update(file.name).update(createHash('sha256').update(file.bytes).digest());
    return {source:mountSource(source,refs,names),files,identity:identity.digest('hex')};
  }
  dispose():void {this.disposed=true;if(this.timer)clearTimeout(this.timer);for(const item of this.subscriptions)item.dispose();this.entries.clear();this.bytes=0;}
}
