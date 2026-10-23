#!/usr/bin/env node
/*
 * ApolloMedia — gera favicon e ícones do app a partir da arte da marca.
 *
 * Roda no BUILD, dentro da imagem, usando o `sharp` que o Next já traz
 * (0.33.5) — nada é instalado a mais e nada depende da máquina de quem builda.
 *
 * POR QUE GERAR NO BUILD E NÃO COMMITAR OS PNGs PRONTOS
 * Um favicon commitado desatualiza em silêncio quando a arte muda. Gerando da
 * fonte, trocar a logo é trocar UM arquivo.
 *
 * ⚠️ O .ico É MONTADO NA MÃO, e não é frescura: o `sharp` não escreve ICO. O
 * formato aceita PNG embutido (desde o Vista), então o arquivo é o cabeçalho
 * ICONDIR + uma entrada por tamanho + os PNGs concatenados. É pouca coisa e
 * evita puxar uma dependência só para isso.
 *
 * ⚠️ E O .ico IMPORTA MESMO COM <link rel="icon">: o navegador pede
 * /favicon.ico por conta própria, e o Postiz aponta o <link> justamente para
 * ele em três layouts. Gerar só PNG deixaria o ícone do Postiz na aba.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const FONTE = process.argv[2] || '/tmp/icone-fonte.png';
const PUBLICO = process.argv[3] || '/app/apps/frontend/public';

const TAMANHOS_ICO = [16, 32, 48];
const PNGS = { 'favicon.png': 512, 'apple-touch-icon.png': 180, 'postiz-fav.png': 512 };

function entradaIco(tamanho, offset, bytes) {
  const e = Buffer.alloc(16);
  // 0 significa 256 no formato ICO; nossos tamanhos são todos < 256.
  e.writeUInt8(tamanho % 256, 0);   // largura
  e.writeUInt8(tamanho % 256, 1);   // altura
  e.writeUInt8(0, 2);               // cores da paleta (0 = sem paleta)
  e.writeUInt8(0, 3);               // reservado
  e.writeUInt16LE(1, 4);            // planos
  e.writeUInt16LE(32, 6);           // bits por pixel
  e.writeUInt32LE(bytes, 8);        // tamanho da imagem
  e.writeUInt32LE(offset, 12);      // deslocamento da imagem
  return e;
}

(async () => {
  if (!fs.existsSync(FONTE)) {
    console.error(`!! ERRO: arte de origem nao encontrada: ${FONTE}`);
    process.exit(1);
  }

  // PNGs soltos
  for (const [nome, tamanho] of Object.entries(PNGS)) {
    await sharp(FONTE)
      .resize(tamanho, tamanho, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(PUBLICO, nome));
  }

  /*
   * Avatar genérico (`no-picture.jpg`) — o que aparece quando a rede social
   * não devolve foto de perfil, e também nas prévias de publicação.
   *
   * ⚠️ É UM ARQUIVO SÓ PARA 28 USOS. O caminho `/no-picture.jpg` está cravado
   * em 28 lugares do frontend (prévias de Facebook, Instagram, TikTok,
   * LinkedIn, YouTube, seletor de canais...). Trocar o ARQUIVO, mantendo o
   * nome, cobre todos sem editar nenhum componente — e sobrevive a upgrade.
   *
   * A arte é o ícone da marca sobre o cinza dos painéis: some com o fundo da
   * interface em vez de virar um quadrado branco no meio da lista, que é como
   * o genérico do Postiz se comportava no tema escuro.
   */
  const FUNDO = { r: 0x1f, g: 0x21, b: 0x23 };
  const iconeAvatar = await sharp(FONTE)
    .resize(150, 150, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: { width: 256, height: 256, channels: 3, background: FUNDO },
  })
    .composite([{ input: iconeAvatar, gravity: 'center' }])
    .jpeg({ quality: 88 })
    .toFile(path.join(PUBLICO, 'no-picture.jpg'));

  // favicon.ico multi-tamanho
  const imagens = [];
  for (const t of TAMANHOS_ICO) {
    imagens.push(
      await sharp(FONTE)
        .resize(t, t, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
    );
  }
  const cabecalho = Buffer.alloc(6);
  cabecalho.writeUInt16LE(0, 0); // reservado
  cabecalho.writeUInt16LE(1, 2); // 1 = ícone
  cabecalho.writeUInt16LE(TAMANHOS_ICO.length, 4);

  let offset = 6 + 16 * TAMANHOS_ICO.length;
  const entradas = [];
  for (let i = 0; i < TAMANHOS_ICO.length; i++) {
    entradas.push(entradaIco(TAMANHOS_ICO[i], offset, imagens[i].length));
    offset += imagens[i].length;
  }
  const ico = Buffer.concat([cabecalho, ...entradas, ...imagens]);
  fs.writeFileSync(path.join(PUBLICO, 'favicon.ico'), ico);

  // Conferir o EFEITO, não o exit code.
  const tamIco = fs.statSync(path.join(PUBLICO, 'favicon.ico')).size;
  const assinatura = fs.readFileSync(path.join(PUBLICO, 'favicon.ico')).subarray(0, 4);
  const ok = assinatura[0] === 0 && assinatura[1] === 0 && assinatura[2] === 1 && assinatura[3] === 0;
  const avatar = fs.readFileSync(path.join(PUBLICO, 'no-picture.jpg'));
  const ehJpeg = avatar[0] === 0xff && avatar[1] === 0xd8;
  console.log(
    `gera-favicon: favicon.ico ${tamIco} bytes (${TAMANHOS_ICO.join('/')}) + ` +
    `${Object.keys(PNGS).length} PNGs + no-picture.jpg ${avatar.length} bytes`
  );
  if (!ok || tamIco < 1000) {
    console.error('!! ERRO: favicon.ico invalido');
    process.exit(1);
  }
  if (!ehJpeg || avatar.length < 2000) {
    console.error('!! ERRO: no-picture.jpg invalido');
    process.exit(1);
  }
})();
