// Explicit historical read view; current-source tests must keep node:fs.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {jhuLanguageBytes} from './jhu-language-baseline.mjs';
import {fourSchoolsExpansionBytes} from './four-schools-expansion-baseline.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export default {...fs,readFileSync(file,options){
 const encoding=typeof options==='string'?options:options?.encoding;
 const filename=file instanceof URL?fileURLToPath(file):typeof file==='string'?file:null;
 if(filename===null)return fs.readFileSync(file,options);
 const relative=path.relative(root,filename).split(path.sep).join('/');
 const bytes=jhuLanguageBytes(relative,fourSchoolsExpansionBytes(relative,fs.readFileSync(file)));
 return encoding?bytes.toString(encoding):bytes;
}};
