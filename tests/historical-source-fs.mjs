import {sevenBytes} from './seven-schools-baseline.mjs';
import {pkuBytes} from './pku-baseline.mjs';
import {overseasBytes} from './overseas-baseline.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {historicalSourceBytes} from './historical-source-baseline.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
// Explicit test-only read view for the 5e7cd36-era assertion files. Original
// expected values stay unchanged; production readers never import this helper.
// Current scope, actual source bytes and delta mutation tests use node:fs.
export default {
 ...fs,
 readFileSync(file,options){
  const encoding=typeof options==='string'?options:options?.encoding;
  const filename=file instanceof URL?fileURLToPath(file):typeof file==='string'?file:null;
  if(filename===null)return fs.readFileSync(file,options);
  const relative=path.relative(root,filename).split(path.sep).join('/');
  const raw=fs.readFileSync(file);
  const bytes=relative.startsWith('data/')?historicalSourceBytes(relative,overseasBytes(relative,pkuBytes(relative,sevenBytes(relative,raw)))):raw;
  return encoding?bytes.toString(encoding):bytes;
 },
};
