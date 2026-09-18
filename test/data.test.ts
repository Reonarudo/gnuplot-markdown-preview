import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {dataReferences,validateDataPath,mountSource} from '../src/dataReferences';
import {validateLocalFile} from '../src/dataLoader';
import {createRenderer,createRuntime} from '../src/renderer';
test('discover only file operands across comments, labels, functions and datablocks',()=>{
 const source=`set title "not.csv"\n# plot "comment.csv"\n$data << EOD\nplot "datablock.csv"\nEOD\nplot sin(x), "./data/a.csv" using 1:2 title "title.csv", \\\n 'data/雪 b.dat' with lines, '' using 1:3\nsplot "c.txt" using 1:2:3`;
 const refs=dataReferences(source);assert.deepEqual(refs.map(r=>r.path),['./data/a.csv','data/雪 b.dat','c.txt']);
 const rewritten=mountSource(source,refs,new Map(refs.map((r,i)=>[r.path,`data-${i}.dat`])));
 assert.match(rewritten,/title "title.csv"/);assert.match(rewritten,/"data-0.dat" using/);assert.match(rewritten,/'datablock.csv'|"datablock.csv"/);
});
test('paths and unsupported filename expressions fail explicitly',()=>{
 for(const p of ['/etc/passwd','C:/secret.csv','\\\\host\\file.csv','<cat file.csv','https://a/data.csv','data.gp','a\0.csv'])assert.throws(()=>validateDataPath(p));
 assert.equal(validateDataPath('../data/a.csv'),'../data/a.csv');
 assert.throws(()=>dataReferences('plot "data" . ".csv"'),/Computed/);
 assert.throws(()=>dataReferences('plot "unclosed.csv'),/Unterminated/);
});
test('local containment rejects traversal and symlink components',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'gnuplot-path-'));const root=join(temp,'workspace');
 try{await mkdir(join(root,'notes'),{recursive:true});await writeFile(join(root,'data.csv'),'0,1');await writeFile(join(temp,'secret.csv'),'0,2');
  assert.equal(await validateLocalFile(root,join(root,'notes','demo.md'),'../data.csv'),join(root,'data.csv'));
  await assert.rejects(validateLocalFile(root,join(root,'demo.md'),'../secret.csv'),/outside/);
  await symlink(join(temp,'secret.csv'),join(root,'link.csv'));
  await assert.rejects(validateLocalFile(root,join(root,'demo.md'),'link.csv'),/Symlink/);
  await symlink(temp,join(root,'linked'),'dir');
  await assert.rejects(validateLocalFile(root,join(root,'demo.md'),'linked/secret.csv'),/Symlink/);
 }finally{await rm(temp,{recursive:true,force:true});}
});
test('real WASM file snapshots render CSV, whitespace, multiple files, reuse and 3D, then disappear',async()=>{
 const runtime=await createRuntime(resolve('dist'));const encode=(s:string)=>new TextEncoder().encode(s);
 try{
  const files=[{name:'data-0.dat',bytes:encode('x,y,z\n0,0,1\n1,2,2\n2,3,4\n')},{name:'data-1.dat',bytes:encode('0,1\n1,4\n2,7\n')}];
  assert.match(runtime.render({source:'set datafile separator comma\nplot "data-0.dat" using 1:2 with lines, "" using 1:3, "data-1.dat" using 1:2',files}),/<svg/);
  assert.match(runtime.render({source:'set datafile separator comma\nsplot "data-0.dat" using 1:2:3',files}),/<svg/);
  assert.match(runtime.render({source:'plot "data-0.dat" using 1:2',files:[{name:'data-0.dat',bytes:encode('0 1\n1 2\n')}]}),/<svg/);
  assert.throws(()=>runtime.render('plot "data-0.dat"'),/valid|open|Cannot|cannot/i);
  assert.throws(()=>runtime.render({source:'load "data-0.dat"',files}),/scripts/);
  const baseline=runtime.render({source:'set datafile separator comma\nplot "data-0.dat" using 1:2',files});
  // Gnuplot can recover from a denied print destination; the data must remain intact.
  const afterWrite=runtime.render({source:'set print "data-0.dat"\nprint "999,999"\nset datafile separator comma\nplot "data-0.dat" using 1:2',files});
  assert.equal(afterWrite,baseline);
  assert.throws(()=>runtime.render({source:'plot x',files:[{name:'script.gp',bytes:encode('plot x')}]}),/Invalid/);
  assert.match(runtime.render('plot cos(x)'),/<svg/);
 }finally{runtime.dispose();}
});
test('cache includes file bytes and document identity',()=>{
 let calls=0;const render=createRenderer({render:()=>{calls++;return '<svg xmlns="http://www.w3.org/2000/svg"/>';}});
 const input={source:'plot "data-0.dat"',files:[{name:'data-0.dat',bytes:new Uint8Array([1])}],identity:'doc-a'};
 render(input);render(input);assert.equal(calls,1);
 render({...input,identity:'doc-b'});assert.equal(calls,2);
 render({...input,files:[{name:'data-0.dat',bytes:new Uint8Array([2])}]});assert.equal(calls,3);
});
test('literal paths after plot ranges are discovered',()=>{
 assert.deepEqual(dataReferences('plot [0:10] [0:20] "data.csv" using 1:2, "other.dat"').map(r=>r.path),['data.csv','other.dat']);
});
