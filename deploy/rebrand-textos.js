#!/usr/bin/env node
/*
 * ApolloMedia — idioma padrão em português e a palavra "Postiz" fora da
 * interface. Roda no BUILD da imagem derivada (ver Dockerfile).
 *
 * NÃO É UMA TRADUÇÃO À MÃO, E ISSO É O PONTO
 * ------------------------------------------
 * O Postiz já traz `pt` como locale completo (~40 KB, e é português do Brasil
 * de verdade: "Excluir", "Salvar", "Configurações"). Traduzir à mão seria
 * refazer o que existe e criar divergência a cada release. Aqui só se troca o
 * idioma PADRÃO e se limpa a marca de dentro dos textos.
 *
 * ⚠️ TRÊS ARMADILHAS QUE UM `sed 's/Postiz/ApolloMedia/g'` CAUSARIA
 *
 * 1. CHAVE DE TRADUÇÃO NÃO PODE MUDAR. As chaves do locale são a frase em
 *    inglês em snake_case, e dez delas contêm "postiz"
 *    (`..._happens_in_postiz_via_an_http_request`). O código procura por essa
 *    chave exata: renomear = a string some da tela e sobra a chave crua.
 *    Por isso o JSON é percorrido trocando SÓ VALOR.
 *
 * 2. CAMINHO E PACOTE NÃO PODEM MUDAR. `postiz.svg`, `docs.postiz.com`,
 *    `postiz-app` — trocar quebra import e 404 em asset. Todos são minúsculos,
 *    então a troca é sensível a maiúscula: só `Postiz` isolado.
 *
 * 3. NOME DE COMPONENTE NÃO PODE MUDAR. `PostizProvider` viraria
 *    `ApolloMediaProvider` e o import continuaria apontando para o antigo.
 *    Daí o `Postiz` precisar estar cercado por não-letra dos dois lados.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = process.argv[2] || '/app';
const FRONT = path.join(RAIZ, 'apps/frontend');
const LOCALES = path.join(RAIZ, 'libraries/react-shared-libraries/src/translation/locales');
const CONFIG = path.join(RAIZ, 'libraries/react-shared-libraries/src/translation/i18n.config.ts');

const MARCA = 'ApolloMedia';
const IDIOMA = 'pt';
// Isolado: nem letra antes, nem letra depois. Ver armadilhas 2 e 3.
const PALAVRA = /(?<![A-Za-z])Postiz(?![A-Za-z])/g;

let trocasValor = 0, trocasFonte = 0, arquivos = 0;

// --- 1. locales: troca só nos VALORES, nunca nas chaves -------------------
for (const lang of fs.readdirSync(LOCALES)) {
  const arq = path.join(LOCALES, lang, 'translation.json');
  if (!fs.existsSync(arq)) continue;
  const dados = JSON.parse(fs.readFileSync(arq, 'utf8'));
  let mudou = false;
  for (const chave of Object.keys(dados)) {
    if (typeof dados[chave] !== 'string') continue;
    const novo = dados[chave].replace(PALAVRA, MARCA);
    if (novo !== dados[chave]) { dados[chave] = novo; trocasValor++; mudou = true; }
  }
  if (mudou) fs.writeFileSync(arq, JSON.stringify(dados, null, 2) + '\n');
}

// --- 2. fonte: textos visíveis (inclui os <title> das páginas) ------------
function varre(dir, acc = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const cheio = path.join(dir, item.name);
    if (cheio.includes('node_modules') || cheio.includes('.next')) continue;
    if (item.isDirectory()) varre(cheio, acc);
    else if (['.tsx', '.ts'].includes(path.extname(item.name))) acc.push(cheio);
  }
  return acc;
}
for (const arq of varre(path.join(FRONT, 'src'))) {
  const antes = fs.readFileSync(arq, 'utf8');
  const depois = antes.replace(PALAVRA, MARCA);
  if (depois !== antes) {
    trocasFonte += (antes.match(PALAVRA) || []).length;
    fs.writeFileSync(arq, depois);
    arquivos++;
  }
}

// --- 3. idioma padrão -----------------------------------------------------
/*
 * O app fica MONOLÍNGUE em português — decisão do Leonardo (02/set).
 *
 * ⚠️ Não basta esconder o seletor de idioma. O `proxy.ts` resolve o idioma
 * assim: cookie → cabeçalho `accept-language` → fallback. Com a lista de
 * idiomas cheia, o navegador de quem estiver em inglês continuaria recebendo
 * inglês, seletor ou não. Reduzir `languages` a um único item é o que faz o
 * `acceptLanguage.get()` devolver 'pt' para qualquer visitante.
 *
 * Os arquivos dos outros locales continuam no disco — reverter é devolver a
 * lista, sem precisar rebaixar nada.
 */
let conf = fs.readFileSync(CONFIG, 'utf8');
const confAntes = conf;
conf = conf.replace(/export const fallbackLng = '(\w+)';/, `export const fallbackLng = '${IDIOMA}';`);
conf = conf.replace(/export const languages = \[[\s\S]*?\];/, 'export const languages = [fallbackLng];');
fs.writeFileSync(CONFIG, conf);

// --- Conferir o EFEITO, não o exit code ----------------------------------
console.log(
  `rebrand-textos: ${trocasValor} valores de locale, ${trocasFonte} trechos de fonte ` +
  `em ${arquivos} arquivos, idioma padrao -> ${IDIOMA}`
);

const erros = [];
if (trocasValor === 0) erros.push('nenhum valor de locale trocado');
if (trocasFonte === 0) erros.push('nenhum trecho de fonte trocado');
if (conf === confAntes) erros.push('i18n.config.ts nao mudou');
if (!/fallbackLng = 'pt'/.test(conf)) erros.push('fallbackLng nao virou pt');
// ⚠️ Os colchetes precisam estar escapados: sem a barra, `[fallbackLng]` vira
// CLASSE DE CARACTERES e a guarda passa a testar outra coisa — falharia
// sempre, mesmo com o arquivo correto.
if (!/languages = \[fallbackLng\];/.test(conf)) erros.push('lista de idiomas nao ficou so com pt');

// As chaves TÊM de continuar em inglês — se uma virou ApolloMedia, o texto
// correspondente some da tela sem erro nenhum no console.
const ptJson = fs.readFileSync(path.join(LOCALES, 'pt/translation.json'), 'utf8');
const chavesQuebradas = (ptJson.match(/^\s*"[^"]*ApolloMedia[^"]*":/gm) || []);
if (chavesQuebradas.length) erros.push(`chave de traducao renomeada: ${chavesQuebradas.length}`);

if (erros.length) {
  console.error('!! ERRO: ' + erros.join(' | '));
  process.exit(1);
}
