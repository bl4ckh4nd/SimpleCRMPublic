/**
 * Custom Jest transformer for files that use Vite's import.meta.env.DEV.
 * Replaces the Vite-specific syntax with a plain boolean before TypeScript
 * compilation so that Jest (which runs in CommonJS mode) can parse the file.
 */
const ts = require('typescript');

module.exports = {
  process(sourceText, sourcePath) {
    const patched = sourceText.replace(/\bimport\.meta\.env\.DEV\b/g, 'false');
    const result = ts.transpileModule(patched, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
      },
    });
    return { code: result.outputText };
  },

  getCacheKey(fileData, filePath) {
    return `${filePath}::${fileData.length}`;
  },
};
