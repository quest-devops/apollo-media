#!/usr/bin/env node
/*
 * ApolloMedia — remove o seletor de idioma da barra superior.
 *
 * O app é monolíngue em português (ver rebrand-textos.js, que reduz
 * `languages` a um item só). Com um idioma apenas, o seletor não escolhe nada:
 * é um controle que só ocupa espaço e convida ao clique inútil.
 *
 * ⚠️ O SEPARADOR VAI JUNTO. Aquele `<div className="w-[1px] ...">` antes do
 * seletor é a barrinha vertical que o separa do vizinho. Removendo só o
 * seletor sobram duas barrinhas coladas — some o controle e fica a cicatriz.
 */
const fs = require('fs');

const ARQ =
  process.argv[2] ||
  '/app/apps/frontend/src/components/new-layout/layout.component.tsx';

const BLOCO =
  '<div className="w-[1px] h-[20px] bg-blockSeparator" />\n                          <LanguageComponent />\n';

const antes = fs.readFileSync(ARQ, 'utf8');
if (!antes.includes(BLOCO)) {
  console.error('!! ERRO: seletor de idioma nao encontrado no layout (upstream mudou?)');
  process.exit(1);
}

// A linha do import fica: remover só o uso é o suficiente para o controle
// sumir, e mexer no bloco de imports por regex tem mais chance de quebrar o
// arquivo do que benefício.
fs.writeFileSync(ARQ, antes.replace(BLOCO, ''));

const final = fs.readFileSync(ARQ, 'utf8');
if (final.includes('<LanguageComponent />')) {
  console.error('!! ERRO: o seletor de idioma continua sendo renderizado');
  process.exit(1);
}
console.log('patch-sem-idioma: seletor de idioma e separador removidos');
