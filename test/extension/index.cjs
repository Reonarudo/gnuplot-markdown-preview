const vscode=require('vscode');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
exports.run=async()=>{
 const root=process.env.GNUPLOT_TEST_WORKSPACE;
 assert(vscode.workspace.isTrusted,'integration fixture must be trusted');
 for(const folder of ['a','b'])await fs.mkdir(path.join(root,folder),{recursive:true});
 const source='```gnuplot {alt="External data" caption="File-backed plot"}\nset datafile separator comma\nplot "data.csv" using 1:2 with lines title "external"\n```';
 for(const folder of ['a','b'])await fs.writeFile(path.join(root,folder,'demo.md'),source);
 await fs.writeFile(path.join(root,'a/data.csv'),'0,0\n1,1\n2,2\n');
 await fs.writeFile(path.join(root,'b/data.csv'),'0,0\n1,2\n2,4\n');
 const extension=vscode.extensions.getExtension('ReoX86.gnuplot-markdown-preview');assert(extension);
 const api=await extension.activate();
 const observed=[];const original=api.extendMarkdownIt;
 api.extendMarkdownIt=md=>{const result=original(md);const fence=result.renderer.rules.fence;result.renderer.rules.fence=(...args)=>{const html=fence(...args);observed.push({uri:args[3].currentDocument?.toString(),html});return html;};return result;};
 await vscode.extensions.getExtension('vscode.markdown-language-features').activate();
 const a=await vscode.workspace.openTextDocument(path.join(root,'a/demo.md'));
 const b=await vscode.workspace.openTextDocument(path.join(root,'b/demo.md'));
 const render=doc=>vscode.commands.executeCommand('markdown.api.render',doc);
 const ready=async(doc,pattern=/<svg\b/)=>{for(let i=0;i<100;i++){const html=await render(doc);if(pattern.test(html))return html;await delay(100);}throw Error('Timed out: '+doc.uri+' '+await render(doc));};
 const normalized=html=>html.replace(/gp-[a-z0-9-]+/g,'');
 const basic=await render('```gnuplot\nplot sin(x)\n```\n```swift\nlet x = 42\n```\n```javascript\nconst x = 1;\n```\n```gnuplot\nthis is invalid gnuplot\n```');
 assert.match(basic,/<svg/);assert.match(basic,/gnuplot-error/);assert.match(basic,/language-swift/);assert.match(basic,/language-javascript/);
 const attributed=await render('```gnuplot {alt="Sine curve" caption="Figure 1: <sine>"}\nplot sin(x)\n```');
 assert.match(attributed, /<figure class="gnuplot-markdown-preview">/);
 assert.match(attributed, /role="img" aria-label="Sine curve"/);
 assert.match(attributed, /<svg/);
 assert.match(attributed, /<figcaption>Figure 1: &lt;sine&gt;<\/figcaption>/);
 const tolerant=await render('```gnuplot {unknown="ignored" alt=bad caption="Still renders"}\nplot sin(x)\n```');
 assert.match(tolerant, /<svg/); assert.match(tolerant, /<figcaption>Still renders<\/figcaption>/);
 assert.doesNotMatch(tolerant, /gnuplot-error/);
 const repeated=await render('```gnuplot\nplot sin(x)\n```\n```gnuplot\nplot sin(x)\n```');
 const ids=[...repeated.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length);

 assert.match(await render(a),/Loading/);
 const ha=await ready(a),hb=await ready(b);assert.notEqual(normalized(ha),normalized(hb));
 await vscode.commands.executeCommand('markdown.showPreviewToSide',a.uri);
 await vscode.commands.executeCommand('markdown.preview.toggleLock');
 await vscode.window.showTextDocument(b);
 await delay(600);observed.length=0;
 await fs.writeFile(path.join(root,'a/data.csv'),'0,0\n1,4\n2,8\n');
 for(let i=0;i<100&&!observed.some(x=>x.uri===a.uri.toString()&&x.html.includes('<svg'));i++)await delay(100);
 assert(observed.some(x=>x.uri===a.uri.toString()&&x.html.includes('<svg')),'saved dependency must refresh locked preview automatically');
 const changed=await ready(a);assert.notEqual(normalized(changed),normalized(ha));
 await fs.unlink(path.join(root,'a/data.csv'));await delay(500);assert.match(await ready(a,/gnuplot-error/),/Cannot load/);
 await fs.writeFile(path.join(root,'a/data.csv'),'0,0\n1,1\n2,2\n');await delay(500);await ready(a);
 const rename=new vscode.WorkspaceEdit();
 rename.renameFile(vscode.Uri.file(path.join(root,'a/data.csv')),vscode.Uri.file(path.join(root,'a/renamed.csv')));
 assert(await vscode.workspace.applyEdit(rename));await delay(500);await ready(a,/gnuplot-error/);
 const restore=new vscode.WorkspaceEdit();
 restore.renameFile(vscode.Uri.file(path.join(root,'a/renamed.csv')),vscode.Uri.file(path.join(root,'a/data.csv')));
 assert(await vscode.workspace.applyEdit(restore));await delay(500);await ready(a);
 const bad=await vscode.workspace.openTextDocument({language:'markdown',content:source});assert.match(await render(bad),/Save this Markdown/);
 for(const [name,text,pattern] of [['outside','../../outside.csv',/outside|Cannot load/],['large','large.csv',/1 MiB/]]){
  await fs.writeFile(path.join(root,'a',name+'.md'),source.replace('data.csv',text));
  if(name==='large')await fs.writeFile(path.join(root,'a/large.csv'),Buffer.alloc(1024*1024+1));
  const doc=await vscode.workspace.openTextDocument(path.join(root,'a',name+'.md'));assert.match(await ready(doc,/gnuplot-error/),pattern);
 }
 // Static custom preview must complete asynchronous loading too.
 const move=new vscode.WorkspaceEdit();
 const movedUri=vscode.Uri.file(path.join(root,'b/moved.md'));
 move.renameFile(a.uri,movedUri);assert(await vscode.workspace.applyEdit(move));
 const moved=await vscode.workspace.openTextDocument(movedUri);
 assert.equal(normalized(await ready(moved)),normalized(hb),'moving Markdown must resolve data from its new directory');
 if((await vscode.commands.getCommands(true)).includes('markdown.reopenAsPreview')){
  await fs.writeFile(path.join(root,'a/static.md'),source+'\n'+source+'\n```gnuplot\nplot "missing.csv"\n```');
  const staticDoc=await vscode.workspace.openTextDocument(path.join(root,'a/static.md'));
  await vscode.window.showTextDocument(staticDoc);observed.length=0;
  await vscode.commands.executeCommand('markdown.reopenAsPreview');
  for(let i=0;i<100&&!observed.some(x=>x.uri===staticDoc.uri.toString()&&x.html.includes('<svg'));i++)await delay(100);
  assert(observed.some(x=>x.uri===staticDoc.uri.toString()&&x.html.includes('<svg')),'Open as Preview must finish loading without manual refresh');
 }
 console.log('Extension host PASS: '+vscode.version+' first load, document isolation, locked preview/save refresh, delete/recreate, untitled, traversal and size limits.');
};
