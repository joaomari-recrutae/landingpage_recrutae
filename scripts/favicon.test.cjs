const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const sharp = require(process.env.SHARP_MODULE || 'sharp');

const file = path.join(__dirname, '../assets/logos/favicon-square.png');

test('favicon ocupa todo o quadrado com roxo, sem transparência que exponha o fundo branco do buscador', async () => {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) {
    assert.equal(data[i], 255, 'Todos os pixels precisam ser opacos, inclusive o respiro da marca');
  }
  assert.equal(info.width, 512);
  assert.equal(info.height, 512);
  assert.deepEqual([...data.subarray(0, 4)], [31, 30, 66, 255]);
});

test('favicon mantém o ê branco e o acento amarelo oficiais, sem cortar o símbolo', async () => {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let white = 0;
  let yellow = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      const isWhite = data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245;
      const isYellow = data[i] > 200 && data[i + 1] > 140 && data[i + 2] < 80;
      if (isWhite || isYellow) {
        assert.ok(x >= 64 && x < 448 && y >= 64 && y < 448, 'Marca deve ter respiro para a máscara circular');
      }
      if (isWhite) white++;
      if (isYellow) yellow++;
    }
  }
  assert.ok(white > 15000, 'O ê branco precisa continuar visível');
  assert.ok(yellow > 2000, 'O acento amarelo precisa continuar visível');
});
