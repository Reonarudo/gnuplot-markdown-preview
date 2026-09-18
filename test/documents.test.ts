import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import {mkdtemp,mkdir,writeFile,readFile,stat,rm} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
const compiled=buildSync({entryPoints:['src/documents.ts'],bundle:true,platform:'node',format:'cjs',external:['vscode'],write:false}).outputFiles[0]!.text;
class Uri {constructor(readonly fsPath:string,readonly scheme='file'){} toString(){return this.scheme+':'+this.fsPath;}static file(path:string){return new Uri(path);}}
test('document coordinator blocks untrusted/provider reads and discards stale snapshots',async()=>{
 const root=await mkdtemp(join(tmpdir(),'gnuplot-coordinator-'));await mkdir(join(root,'a'));
 const file=join(root,'a/data.csv');await writeFile(file,'0,1\n1,2\n');
 let reads=0,refreshes=0;
 const callbacks=new Map<string,(arg:unknown)=>void>();
 const event=(name:string)=>(cb:(arg:unknown)=>void)=>{callbacks.set(name,cb);return {dispose(){}};};
 const workspace={isTrusted:false,getWorkspaceFolder:()=>({uri:new Uri(root)}),
  createFileSystemWatcher:()=>({onDidChange:event('change'),onDidCreate:event('create'),onDidDelete:event('delete'),dispose(){}}),
  onDidRenameFiles:event('rename'),onDidSaveTextDocument:event('save'),onDidChangeTextDocument:event('edit'),onDidCloseTextDocument:event('close'),onDidChangeWorkspaceFolders:event('folders'),onDidGrantWorkspaceTrust:event('trust'),
  fs:{stat:async(uri:Uri)=>{const s=await stat(uri.fsPath);return {type:1,size:s.size,mtime:s.mtimeMs};},readFile:async(uri:Uri)=>{reads++;return readFile(uri.fsPath);}}};
 const exports:{DocumentData?:new()=>{prepare(source:string,env:unknown):{files?:{bytes:Uint8Array}[]}|undefined;dispose():void}}={};
 const module={exports};
 const nativeRequire=createRequire(import.meta.url);
 runInNewContext(compiled,{exports,module,require:(id:string)=>id==='vscode'?{workspace,Uri,FileType:{File:1},commands:{registerCommand:()=>({dispose(){}}),executeCommand:async()=>{refreshes++;}}}:nativeRequire(id),setTimeout,clearTimeout,console,Buffer});
 const documents=new module.exports.DocumentData!();const env={currentDocument:new Uri(join(root,'a/demo.md'))};const source='plot "data.csv"';
 try {
  assert.throws(()=>documents.prepare(source,env),/trusted/);assert.equal(reads,0);
  assert(documents.prepare('plot sin(x)',undefined));assert.equal(reads,0);
  workspace.isTrusted=true;
  assert.throws(()=>documents.prepare(source,{currentDocument:new Uri('/demo.md','vscode-remote')}),/local filesystem/);assert.equal(reads,0);
  assert.equal(documents.prepare(source,env),undefined);
  // Invalidate while the first asynchronous load is still pending.
  callbacks.get('change')!(new Uri(file));
  await new Promise(r=>setTimeout(r,50));
  assert.equal(documents.prepare(source,env),undefined,'invalidated load must not repopulate the cache');
  for(let i=0;i<50&&!documents.prepare(source,env);i++)await new Promise(r=>setTimeout(r,10));
  assert(documents.prepare(source,env)?.files);assert.equal(reads,2);
  assert.throws(()=>documents.prepare('plot '+Array.from({length:17},(_,i)=>`"a${i}.csv"`).join(','),env),/at most 16/);
  await new Promise(r=>setTimeout(r,150));assert(refreshes>0);const count=refreshes;
  documents.dispose();await new Promise(r=>setTimeout(r,150));assert.equal(refreshes,count);
 }finally{documents.dispose();await rm(root,{recursive:true,force:true});}
});
