// Explicit pre-profile-expansion read view for historical assertions only.
// No global fs patch and no production imports.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {profileCoverageBytes} from './profile-coverage-baseline.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
export default {
  ...fs,
  readFileSync(file, options) {
    const encoding = typeof options === 'string' ? options : options?.encoding;
    const filename = file instanceof URL ? fileURLToPath(file) : typeof file === 'string' ? file : null;
    if (filename === null) return fs.readFileSync(file, options);
    const relative = path.relative(root, filename).split(path.sep).join('/');
    const bytes = profileCoverageBytes(relative, fs.readFileSync(file));
    return encoding ? bytes.toString(encoding) : bytes;
  },
};
