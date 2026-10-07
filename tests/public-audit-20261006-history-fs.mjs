import {detailReturnBytes} from './detail-return-focus-baseline.mjs';
// Explicit pre-public-audit view, solely for historical test input. This is not
// a global fs patch: current-source tests and production retain raw node:fs.
import fs from 'node:fs';
import {raDeadlineBytes} from './ra-deadline-20261007-baseline.mjs';
import {dateSummaryBytes} from './date-summary-20261006-baseline.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {publicAuditReleaseBytes} from './public-audit-release-20261006-baseline.mjs';
import {publicAuditBytes} from './public-audit-20261006-baseline.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export default {...fs,readFileSync(file,options){
 const encoding=typeof options==='string'?options:options?.encoding;
 const filename=file instanceof URL?fileURLToPath(file):typeof file==='string'?file:null;
 if(filename===null)return fs.readFileSync(file,options);
 const relative=path.relative(root,filename).split(path.sep).join('/');
 const bytes=publicAuditBytes(relative,publicAuditReleaseBytes(relative,dateSummaryBytes(relative,raDeadlineBytes(relative,detailReturnBytes(relative,fs.readFileSync(file))))));
 return encoding?bytes.toString(encoding):bytes;
}};
