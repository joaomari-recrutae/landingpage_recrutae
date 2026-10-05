// Reusa a versão branca/amarela oficial do símbolo; não redesenha a marca.
// Requer sharp instalado, ou SHARP_MODULE apontando para o módulo.
const path = require('node:path');
const sharp = require(process.env.SHARP_MODULE || 'sharp');

async function main() {
  const logos = path.join(__dirname, '../assets/logos');
  const background = '#1F1E42';
  const symbol = await sharp(path.join(logos, 'êfundo roxo.png'))
    // Limites da marca no arquivo oficial; remove apenas o respiro externo.
    .extract({ left: 393, top: 308, width: 431, height: 603 })
    .resize(384, 384, { fit: 'contain', background })
    .extend({ top: 64, bottom: 64, left: 64, right: 64, background })
    .flatten({ background })
    .png()
    .toBuffer();
  await sharp(symbol).toFile(path.join(logos, 'favicon-square.png'));
  console.log('Favicon Recrutaê: 512×512, símbolo oficial branco/amarelo sobre roxo opaco.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
