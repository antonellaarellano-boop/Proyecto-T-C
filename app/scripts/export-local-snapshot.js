const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const vm = require('vm');
const Module = require('module');

const rootDir = path.resolve(__dirname, '..');
const seedPath = path.resolve(rootDir, 'src/lib/data/seed.ts');
const outputPath = path.resolve(rootDir, 'local-data-snapshot.json');

const tsSource = fs.readFileSync(seedPath, 'utf8');
const transpiled = ts.transpileModule(tsSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
  },
  fileName: seedPath,
}).outputText;

const normalized = transpiled
  .replace(/require\("@\/lib\/types"\)/g, 'require("../types")')
  .replace(/require\("@\/lib\/env"\)/g, 'require("../env")');

const typesPath = path.resolve(rootDir, 'src/lib/types.ts');
const envPath = path.resolve(rootDir, 'src/lib/env.ts');

function compileTsModule(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    },
    fileName: filePath,
  }).outputText;
}

const requireFromSeed = Module.createRequire(seedPath);
function customRequire(request) {
  if (request === '../types' || request === '@/lib/types') {
    const code = compileTsModule(typesPath);
    const module = { exports: {} };
    const context = {
      require: Module.createRequire(typesPath),
      module,
      exports: module.exports,
      __dirname: path.dirname(typesPath),
      __filename: typesPath,
      process,
      console,
    };
    vm.createContext(context);
    vm.runInContext(code, context, { filename: typesPath });
    return module.exports;
  }
  if (request === '../env' || request === '@/lib/env') {
    const code = compileTsModule(envPath);
    const module = { exports: {} };
    const context = {
      require: Module.createRequire(envPath),
      module,
      exports: module.exports,
      __dirname: path.dirname(envPath),
      __filename: envPath,
      process,
      console,
    };
    vm.createContext(context);
    vm.runInContext(code, context, { filename: envPath });
    return module.exports;
  }
  return requireFromSeed(request);
}

const moduleObj = { exports: {} };
const sandbox = {
  require: customRequire,
  module: moduleObj,
  exports: moduleObj.exports,
  __dirname: path.dirname(seedPath),
  __filename: seedPath,
  process,
  console,
};
vm.createContext(sandbox);
vm.runInContext(normalized, sandbox, { filename: seedPath });

const {
  seedUsers,
  seedVacancies,
  seedCandidates,
  seedStageMovements,
  seedSources,
  seedIngresos,
  seedActivity,
} = sandbox.module.exports;

const users = seedUsers();
const vacancies = seedVacancies();
const candidates = seedCandidates(vacancies);
const snapshot = {
  users,
  vacancies,
  candidates,
  movements: seedStageMovements(candidates),
  sources: seedSources(),
  ingresos: seedIngresos(candidates),
  activity: seedActivity(users),
};
fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2), 'utf8');
console.log('Local snapshot written to', outputPath);
