const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createSiteServer } = require('./serve-site.cjs');

const root = path.resolve(__dirname, '..');
const fontFiles = [
  'bricolage-grotesque-latin.woff2',
  'bricolage-grotesque-latin-ext.woff2',
  'dm-sans-latin.woff2',
  'dm-sans-latin-ext.woff2',
  'dm-sans-italic-latin.woff2',
  'dm-sans-italic-latin-ext.woff2',
];

test('local font files are complete WOFF2 binaries, not download error pages', () => {
  for (const name of fontFiles) {
    const file = path.join(root, 'assets', 'fonts', name);
    assert.ok(fs.existsSync(file), `Missing local font: ${name}`);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'wOF2', `${name}: WOFF2 signature`);
    assert.equal(bytes.readUInt32BE(8), bytes.length, `${name}: complete file length`);
    assert.ok(bytes.readUInt16BE(12) > 0, `${name}: font tables exist`);
  }
});

test('both bundled typefaces include their redistribution licenses', () => {
  for (const family of ['bricolage-grotesque', 'dm-sans']) {
    const file = path.join(root, 'assets', 'fonts', `${family}-OFL.txt`);
    assert.ok(fs.existsSync(file), `Missing license: ${family}`);
    const license = fs.readFileSync(file, 'utf8');
    assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/);
    assert.match(license, /Copyright/);
  }
});

test('every font URL in the public stylesheet serves a valid local WOFF2 asset', async () => {
  assert.ok(fs.existsSync(path.join(root, 'fonts.css')), 'Missing public fonts.css');
  const server = createSiteServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${origin}/fonts.css`);
    assert.equal(response.status, 200);
    const stylesheet = await response.text();
    const urls = [...stylesheet.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)].map(match => match[1]);
    assert.equal(urls.length, fontFiles.length, 'Each bundled subset has a font-face URL');
    for (const url of urls) {
      assert.ok(url.startsWith('/assets/fonts/'), `Font URL must resolve from nested pages: ${url}`);
      const resource = await fetch(`${origin}${url}`);
      assert.equal(resource.status, 200, `${url}: public asset response`);
      const bytes = Buffer.from(await resource.arrayBuffer());
      assert.equal(bytes.subarray(0, 4).toString('ascii'), 'wOF2', `${url}: public response is a font`);
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
