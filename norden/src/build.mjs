import { cpSync,mkdirSync,readdirSync,readFileSync,writeFileSync,existsSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(process.argv[2]||join(root,'dist'));
for(const directory of ['src','public','tests']) {
  for(const file of readdirSync(join(root,directory)).filter(file=>file.endsWith('.mjs'))) {
    const result=spawnSync(process.execPath,['--check',join(root,directory,file)],{stdio:'inherit'});
    if(result.status!==0) process.exit(result.status||1);
    const code=readFileSync(join(root,directory,file),'utf8');
    for(const match of code.matchAll(/from ['"](\.\.?\/[^'"]+)['"]/g)) {
      if(!existsSync(resolve(root,directory,match[1]))) throw new Error('Importação ausente em '+directory+'/'+file+': '+match[1]);
    }
  }
}
mkdirSync(output,{recursive:true});
for(const directory of ['src','public','migrations','tests']) cpSync(join(root,directory),join(output,directory),{recursive:true});
for(const file of ['package.json','package-lock.json','README.md','QA.md','Iniciar_NORDEN_Windows.cmd']) cpSync(join(root,file),join(output,file));
writeFileSync(join(output,'.gitignore'),'data/\n');
console.log('Build NORDEN em '+output);
