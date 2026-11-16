/* Bundle the maintained sanitizer for Vercel's CommonJS loader. */
const { build } = require('esbuild');
build({
  stdin: { contents: "module.exports = require('sanitize-html');", resolveDir: __dirname, sourcefile: 'sanitize-entry.cjs' },
  outfile: '.generated/sanitize.cjs',
  bundle: true, platform: 'node', target: 'node24', format: 'cjs', minify: true,
}).then(() => console.log('Sanitizer prepared for the Vercel runtime.')).catch(error => { console.error(error.message); process.exitCode = 1; });
