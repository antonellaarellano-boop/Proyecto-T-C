const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const seedPath = path.resolve(__dirname, '../src/lib/data/seed.ts');
const src = fs.readFileSync(seedPath, 'utf8');
const out = ts.transpileModule(src, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
  },
  fileName: seedPath,
}).outputText;
console.log(out);
