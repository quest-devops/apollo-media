#!/usr/bin/env node
/*
 * ApolloMedia — botões do app no mesmo padrão do "Criar publicação".
 *
 * O componente `Button` compartilhado (usado em Integrações, Divulgações,
 * Análises e nos modais) pintava com `bg-forth` — uma cor DIFERENTE do CTA
 * principal. No Postiz os dois eram roxos parecidos e ninguém notava; com a
 * paleta da marca, `forth` virou um verde e `btnPrimary` outro, e a diferença
 * ficou visível de tela para tela.
 *
 * Agora todos usam `bg-btnPrimary` — o mesmo verde por tema do CTA — mais o
 * peso 600 e o canto arredondado que o "Criar publicação" já tinha.
 *
 * ⚠️ SEM O HALO VERDE, a pedido do Leonardo. O brilho é o que distingue a
 * AÇÃO PRINCIPAL da tela; se todo botão brilhar, nenhum se destaca — e em
 * telas com dois ou três botões lado a lado (Integrações) viraria borrão.
 *
 * ⚠️ `text-white` FICA na classe e isso não é descuido: no tema claro o botão
 * é o verde escuro #0A7D47 e o texto branco é o correto. No tema escuro, a
 * regra da marca em colors.scss (`.dark [class*='bg-btnPrimary'] *`) força
 * grafite por cima — é ela que garante o contraste, não a classe.
 *
 * ⚠️ `secondary` NÃO é tocado: continua em `bg-third`. Botão secundário verde
 * deixaria de ser secundário.
 */
const fs = require('fs');

const ARQ =
  process.argv[2] || '/app/libraries/react-shared-libraries/src/form/button.tsx';

const ANTES = "secondary ? 'bg-third' : 'bg-forth text-white'";
const DEPOIS =
  "secondary ? 'bg-third' : 'bg-btnPrimary text-white font-[600] rounded-md'";

const texto = fs.readFileSync(ARQ, 'utf8');
if (!texto.includes(ANTES)) {
  console.error('!! ERRO: classe do Button compartilhado nao encontrada (upstream mudou?)');
  process.exit(1);
}

fs.writeFileSync(ARQ, texto.replace(ANTES, DEPOIS));

// Conferir o EFEITO, não o exit code.
const final = fs.readFileSync(ARQ, 'utf8');
if (!final.includes(DEPOIS) || final.includes("'bg-forth text-white'")) {
  console.error('!! ERRO: o patch dos botoes nao gravou');
  process.exit(1);
}
console.log('patch-botoes: Button compartilhado no verde do CTA (sem halo)');
