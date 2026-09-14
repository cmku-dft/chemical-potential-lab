import {readdir,readFile,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join,resolve,dirname} from 'node:path';
const root=resolve(import.meta.dirname,'..');
for(const folder of ['dist','scripts'])for(const name of await readdir(join(root,folder))){
  if(!name.endsWith('.mjs'))continue;
  const path=join(root,folder,name),result=spawnSync(process.execPath,['--check',path],{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
  const source=await readFile(path,'utf8');
  for(const match of source.matchAll(/from\s*['"](\.\/[^'"]+)['"]/g))await access(resolve(dirname(path),match[1]));
}
const html=await readFile(join(root,'dist/index.html'),'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==ids.length)throw Error('Duplicate HTML control IDs.');
for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
  const url=match[1];if(/^(?:[a-z]+:|#|\/\/)/i.test(url))continue;
  await access(resolve(root,'dist',url.split(/[?#]/)[0]));
}
console.log('JavaScript syntax, imports, HTML IDs, and local assets passed.');
