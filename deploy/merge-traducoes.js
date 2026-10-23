#!/usr/bin/env node
/*
 * ApolloMedia — completa o locale pt com as chaves que o Postiz nunca criou.
 *
 * O PROBLEMA, QUE NÃO É "FALTA TRADUÇÃO"
 * --------------------------------------
 * O locale `pt` do Postiz está completo em relação ao `en` — 732 de 732. Ainda
 * assim meia interface aparece em inglês, e o motivo é sutil: o código chama
 * `t('email_notifications', 'Email Notifications')`, com um TEXTO PADRÃO no
 * segundo argumento, e a chave `email_notifications` NÃO EXISTE em locale
 * nenhum — nem no inglês. Quando a chave não existe, o i18next devolve o texto
 * padrão, que é inglês. Comparar en × pt nunca acusa isso: os dois estão
 * igualmente incompletos.
 *
 * São 240 chaves nessa situação (recurso novo entrando sem passar pelo
 * arquivo de tradução). Este script injeta as nossas traduções no `pt`.
 *
 * ⚠️ POR QUE NÃO EDITAR O JSX
 * A primeira tentativa trocou o texto direto no componente. Funciona para o
 * que está mesmo cravado no JSX, mas para estes casos é o lugar errado: o
 * texto está no ARGUMENTO de uma função, e o certo é preencher a chave. Editar
 * o JSX aqui criaria conflito de rebase em cada release por um efeito que o
 * arquivo de locale entrega de graça.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = process.argv[2] || '/app';
const NOVAS = process.argv[3] || '/tmp/traducoes-pt.json';
const PT = path.join(RAIZ, 'libraries/react-shared-libraries/src/translation/locales/pt/translation.json');

const atual = JSON.parse(fs.readFileSync(PT, 'utf8'));
const novas = JSON.parse(fs.readFileSync(NOVAS, 'utf8'));

let adicionadas = 0, jaExistiam = 0;
for (const [chave, valor] of Object.entries(novas)) {
  // ⚠️ NÃO sobrescreve o que o upstream já traduziu: se numa versão futura o
  // Postiz preencher a chave, a tradução dele é a que fica — assim o nosso
  // arquivo vai encolhendo sozinho em vez de brigar para sempre.
  if (chave in atual) { jaExistiam++; continue; }
  atual[chave] = valor;
  adicionadas++;
}

fs.writeFileSync(PT, JSON.stringify(atual, null, 2) + '\n');

console.log(
  `merge-traducoes: ${adicionadas} chaves adicionadas ao pt, ` +
  `${jaExistiam} ja existiam (upstream traduziu)`
);

// Conferir o EFEITO: reler do disco e provar que uma chave conhecida chegou.
const confere = JSON.parse(fs.readFileSync(PT, 'utf8'));
if (!confere.email_notifications || !/Notifica/.test(confere.email_notifications)) {
  console.error('!! ERRO: o merge nao gravou — locale pt sem as chaves novas.');
  process.exit(1);
}
if (adicionadas === 0) {
  console.error('!! ERRO: nenhuma chave adicionada. O upstream preencheu tudo (ótimo: reduza o arquivo) ou o caminho mudou.');
  process.exit(1);
}
