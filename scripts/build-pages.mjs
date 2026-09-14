import {cp,mkdir,writeFile,rm} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
const root=resolve(import.meta.dirname,'..'),output=resolve(root,'.pages-output');
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await cp(resolve(root,'dist'),output,{recursive:true,filter:source=>!basename(source).startsWith('.')});
await writeFile(resolve(output,'.nojekyll'),'');
console.log('GitHub Pages files prepared in .pages-output.');
