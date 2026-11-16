const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

test('funções carregam sem depender de require de módulos ES, como no runtime Vercel', () => {
  const result = spawnSync(process.execPath, ['--no-experimental-require-module', '-e', "require('./api/blog-post.js'); require('./api/industria-template.js'); require('./api/posicao-template.js');"], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr.slice(0, 1200));
});
