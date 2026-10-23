#!/usr/bin/env node
/*
 * ApolloMedia — troca a paleta ROXA do Postiz pelo VERDE da Apollo.
 *
 * Roda no BUILD da imagem derivada (ver Dockerfile), nunca no container em
 * execução: mudança feita no container some no primeiro `pull` e não fica em
 * lugar nenhum do git.
 *
 * POR QUE NÃO É UM `sed`
 * ----------------------
 * Mesma lição do ApolloDesk. O roxo do Postiz não é um valor, são muitos —
 * #612bd3, #612ad5, #7236f1, #7950f2, #8155dd, #5826c2, #832ad5, #3900b2,
 * #291259, #262373, #4f46e5, #b69dec, #cebdf2, #ebe8ff, #2d1b57... espalhados
 * por `--color-custom1..55`, cujos nomes não dizem para que servem. Lista fixa
 * sempre deixa roxo sobrando em algum ícone ou borda.
 *
 * Aqui a varredura é por MATIZ: tudo que cai na faixa violeta/índigo vira
 * verde Apollo, preservando luminosidade e saturação relativas — assim fundo
 * sutil continua sutil e destaque continua destaque.
 *
 * ⚠️ A REGRA DE CONTRASTE DA MARCA É O PONTO DELICADO
 * O manual da Apollo proíbe branco sobre verde (1.64:1, reprova em WCAG).
 * O Postiz usa branco sobre o roxo do botão primário — o que funcionava no
 * roxo escuro e QUEBRA no verde claro. Por isso o botão primário não é só
 * recolorido: no tema escuro ele recebe o verde da marca com texto GRAFITE
 * (igual ao "Conecte-se" do Apollo Cloud), e no tema claro recebe o verde
 * escuro #0A7D47, onde o texto branco continua legível.
 *
 * ⚠️ ATRELADO À TAG DA IMAGEM — o compose fixa ghcr.io/gitroomhq/postiz-app:v2.23.0.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = process.argv[2] || '/app/apps/frontend';
const PALETA = path.join(RAIZ, 'src/app/colors.scss');

/*
 * ⚠️ O ROXO NÃO MORA SÓ NA PALETA — e descobrir isso custou uma rodada.
 * Depois de recolorir colors.scss o login ficou verde e o APP CONTINUOU ROXO:
 * o spinner, o logo, os destaques. Porque #612bd3 está TAMBÉM cravado à mão em
 * dezenas de componentes (`text-[#612bd3]`, `stroke="#612BD3"`) e dentro dos
 * SVGs de public/. Variável CSS cobre o tema; hex cravado no componente, não.
 */
const EXTENSOES = ['.tsx', '.ts', '.css', '.scss', '.svg'];

/*
 * ⚠️ NÃO varrer os ícones das plataformas. Roxo de terceiro é MARCA de
 * terceiro — o blurple do Discord e o roxo da Twitch não podem virar verde.
 * Hoje esses ícones são PNG (fora do alcance de uma varredura de hex), mas se
 * um dia virarem SVG a exclusão já está aqui.
 */
const PASTAS_PROIBIDAS = ['/public/icons/', '/node_modules/', '/.next/'];

// --- marca ---------------------------------------------------------------
// Verde claro (destaque, tema escuro) e verde escuro (tema claro) — os dois
// vivem em ~151° de matiz, por isso a rotação para 151 mantém a família.
const VERDE_CLARO = '#2fe68c';
const VERDE_ESCURO = '#0a7d47';
const GRAFITE = '#0e0e0e';
const MATIZ_VERDE = 151;

// Faixa de matiz considerada "roxo do Postiz": violeta e índigo.
const ROXO_MIN = 240;
const ROXO_MAX = 305;
// Abaixo disto a cor é cinza-azulada de interface (#324264, #64748b...) e
// recolorir deixaria a UI esverdeada inteira. Fica como está.
const SAT_MINIMA = 0.28;

function hexParaRgb(hex) {
  const h = hex.replace('#', '');
  const c = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  return [0, 2, 4].map((i) => parseInt(c.substr(i, 2), 16));
}

function rgbParaHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (Math.abs(max - min) < 1e-9) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [((h * 60) % 360 + 360) % 360, s, l];
}

function hslParaHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + t.map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}

function ehRoxo(h, s) {
  return h >= ROXO_MIN && h <= ROXO_MAX && s >= SAT_MINIMA;
}

function listaArquivos(dir, acc = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const cheio = path.join(dir, item.name);
    const barra = cheio.split(path.sep).join('/');
    if (PASTAS_PROIBIDAS.some((p) => barra.includes(p))) continue;
    if (item.isDirectory()) listaArquivos(cheio, acc);
    else if (EXTENSOES.includes(path.extname(item.name))) acc.push(cheio);
  }
  return acc;
}

let trocados = 0, ignorados = 0, arquivosTocados = 0;

for (const arquivo of listaArquivos(RAIZ)) {
  const original = fs.readFileSync(arquivo, 'utf8');
  let texto = original;

  // 1) hex de 6 dígitos
  texto = texto.replace(/#[0-9a-fA-F]{6}\b/g, (hex) => {
    /*
     * ⚠️ O ROXO DO CTA TEM DESTINO FIXO, não pode ir pela rotação de matiz.
     * `#612bd3` é o verde-equivalente... quase: girado por matiz ele vira
     * #2bd382, que é PARECIDO com o verde da marca e não é ele. Como esse hex
     * está CRAVADO em classe Tailwind arbitrária (`bg-[#612bd3]`) em vários
     * botões — "Atualizar canal", entre outros —, o resultado era uma tela com
     * dois verdes quase iguais, que é pior que dois verdes distintos: parece
     * erro de renderização. Aqui ele vai direto para o verde da marca.
     */
    if (hex.toLowerCase() === '#612bd3') { trocados++; return VERDE_CLARO; }
    /*
     * ⚠️ O ROSA DE IA (#d82d7e) TAMBÉM TEM DESTINO FIXO.
     * Ele é MAGENTA (matiz ~330), fora da faixa de roxo — a varredura passava
     * direto e ele sobrevivia como o único ponto fora da paleta num app verde:
     * "Publicar agora", "Adicionar comentário", o botão de IA do editor.
     * São 4 usos cravados em componente mais a variável `--new-ai-btn`.
     */
    if (hex.toLowerCase() === '#d82d7e') { trocados++; return VERDE_CLARO; }
    const [h, s, l] = rgbParaHsl(...hexParaRgb(hex));
    if (!ehRoxo(h, s)) { ignorados++; return hex; }
    trocados++;
    return hslParaHex(MATIZ_VERDE, s, l);
  });

  // 2) rgba(...) — o Postiz usa roxo translúcido em popup e sombra
  texto = texto.replace(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/g,
    (tudo, r, g, b, a) => {
      const [hh, ss, ll] = rgbParaHsl(+r, +g, +b);
      if (!ehRoxo(hh, ss)) return tudo;
      trocados++;
      const [nr, ng, nb] = hexParaRgb(hslParaHex(MATIZ_VERDE, ss, ll));
      return `rgba(${nr}, ${ng}, ${nb}, ${a})`;
    });

  if (texto !== original) {
    fs.writeFileSync(arquivo, texto);
    arquivosTocados++;
  }
}

/*
 * 3) Destaque na cor da marca — e o contraste resolvido no lugar CERTO.
 *
 * ⚠️ ERRO JÁ COMETIDO AQUI, QUE FOI PARAR NA TELA DO LEONARDO:
 * a primeira versão trocava `--new-btn-text` achando que era "a cor do texto
 * do botão". NÃO É. O tailwind.config.cjs mapeia essa variável para
 * `textColor` E `btnText` — ela é a cor de texto de BOA PARTE DO APP. Trocada
 * (e ainda por cima invertida entre os temas), o escuro ficou com texto preto
 * sobre preto e o claro com branco sobre branco. `--new-btn-text` NÃO SE TOCA.
 *
 * E a troca era inútil além de errada: os botões primários trazem `text-white`
 * cravado na própria classe (`bg-btnPrimary ... text-white`), então nunca
 * dependeram dessa variável. Por isso o texto do botão é forçado por REGRA,
 * no fim do arquivo, onde vence a utilitária do Tailwind.
 */
let texto = fs.readFileSync(PALETA, 'utf8');
const ARQUIVO = PALETA;
const blocos = texto.split(/(\.light\s*\{)/);
if (blocos.length >= 3) {
  // Tema escuro: destaque no verde NEON da marca. A pílula do item ativo e o
  // botão primário são o rosto do app — de fábrica vinham BRANCOS, o que
  // deixava o app sem cor de marca nenhuma na navegação.
  /*
   * ⚠️ `--new-boxFocused` (a pílula do estado selecionado) FICA verde — é ela
   * que dá cor de marca às abas "Dia / Semana / Mês" e afins, que de fábrica
   * são brancas. E `--new-textItemFocused`, o texto que vive DENTRO dessa
   * pílula, fica escuro: é a regra da casa, texto sobre verde é grafite.
   *
   * O menu lateral é o caso à parte e por isso NÃO usa mais essas duas: a
   * pílula de largura cheia vazava pela borda da barra estreita, então lá o
   * selecionado virou uma BARRA VERTICAL (ver patches/menu-item.tsx), que
   * pinta o rótulo com `text-btnPrimary` em vez de depender daqui.
   */
  blocos[0] = blocos[0]
    .replace(/--new-btn-primary:\s*#[0-9a-fA-F]{3,8};/, `--new-btn-primary: ${VERDE_CLARO};`)
    .replace(/--new-boxFocused:\s*#[0-9a-fA-F]{3,8};/, `--new-boxFocused: ${VERDE_CLARO};`);

  /*
   * ⚠️ `--color-forth` É O SEGUNDO VERDE DE BOTÃO, e precisa ser o MESMO.
   * O Postiz tem duas famílias de botão: as que usam o componente `Button`
   * compartilhado e 14 lugares com classe própria (`bg-forth`) — "Atualizar
   * canal", "Adicionar" das integrações, "Set Plug"... No roxo original os
   * dois tons eram quase idênticos e ninguém via a diferença; traduzidos para
   * verde, viraram dois verdes distintos de tela para tela.
   *
   * Igualar a variável resolve os 14 de uma vez, sem caçar componente por
   * componente. Também arrasta `text-forth` e `border-forth` (3 usos cada)
   * para o verde da marca, o que é o comportamento desejado: são destaques.
   */
  blocos[0] = blocos[0].replace(/--color-forth:\s*#[0-9a-fA-F]{3,8};/, `--color-forth: ${VERDE_CLARO};`);
  blocos[2] = blocos[2].replace(/--color-forth:\s*#[0-9a-fA-F]{3,8};/, `--color-forth: ${VERDE_ESCURO};`);

  /*
   * Superfícies do tema escuro — o app inteiro lia como uma chapa preta.
   *
   * O problema não era a cor de nenhuma peça isolada: era a DISTÂNCIA entre
   * elas. O Postiz empilha fundo da página (#0e0e0e), painéis (#1a1919) e
   * bordas (#252525) num intervalo pequeno demais; num monitor comum, menu,
   * painel de canais e área de conteúdo viram um bloco só e a divisão some.
   *
   * A correção mantém a HIERARQUIA e abre o degrau: o conteúdo continua o mais
   * escuro (é onde o post tem de saltar), os painéis sobem para um cinza que se
   * distingue à primeira vista, e a borda sobe junto — senão a divisão volta a
   * depender só da diferença de fundo.
   *
   * O tema claro não é tocado: lá o problema não existe.
   */
  const SUPERFICIES = {
    'new-bgColorInner': '#1f2123',   // menu lateral e painéis  (era #1a1919)
    'new-settings': '#26292b',       // painéis de configuração (era #242323)
    // ⚠️ `bgLineColor` é a TELA do calendário, não uma linha — apesar do nome.
    // Ela tem de ficar MAIS ESCURA que os painéis, senão a hierarquia inverte:
    // na primeira tentativa ela subiu para #2a2e30, ficou mais clara que o menu
    // e o efeito foi o oposto do pedido — os menus continuaram parecendo o
    // ponto mais escuro da tela.
    'new-bgLineColor': '#141618',    // tela do calendário      (era #212121)
    'new-blockSeparator': '#343a3d', // separador de bloco      (era #272626)
    'new-border': '#343a3d',         // borda                   (era #252525)
    'new-box-hover': '#2a2e30',      // realce de hover         (era #201f1f)
    'new-col-color': '#343a3d',      // coluna do calendário    (era #2c2b2b)
    'new-big-strips': '#1a1c1e',     // faixas largas           (era #161515)
  };
  for (const [nome, valor] of Object.entries(SUPERFICIES)) {
    const antes = blocos[0];
    blocos[0] = blocos[0].replace(
      new RegExp(`--${nome}:\\s*#[0-9a-fA-F]{3,8};`),
      `--${nome}: ${valor};`
    );
    if (blocos[0] === antes) {
      console.error(`!! ERRO: --${nome} nao encontrada no tema escuro (upstream mudou a paleta?)`);
      process.exit(1);
    }
  }
  // Tema claro: verde escuro, onde o texto branco do componente ainda se lê.
  blocos[2] = blocos[2]
    .replace(/--new-btn-primary:\s*#[0-9a-fA-F]{3,8};/, `--new-btn-primary: ${VERDE_ESCURO};`);
  texto = blocos.join('');
} else {
  console.error('!! ERRO: nao achei o bloco .light — destaque NAO ajustado.');
  process.exit(1);
}

/*
 * A regra de contraste da marca: texto sobre verde é SEMPRE grafite. Branco
 * sobre o verde claro dá 1,64:1 e reprova em WCAG — e é exatamente o que o
 * `text-white` cravado no componente faria. O `!important` aqui não é
 * preguiça: é o único jeito de vencer uma utilitária do Tailwind sem editar
 * dezenas de componentes (e criar dezenas de conflitos de rebase).
 *
 * Vale só no tema ESCURO, onde o botão é verde claro. No tema claro o botão é
 * #0A7D47 e o texto branco tem contraste de sobra.
 */
texto += `
/* ApolloMedia — texto sobre verde = grafite (regra da marca, WCAG).
   Cobre as DUAS famílias de botão verde: o componente compartilhado
   (bg-btnPrimary) e os 14 lugares com classe própria (bg-forth). */
.dark [class*='bg-btnPrimary'],
.dark [class*='bg-btnPrimary'] *,
.dark [class*='bg-forth'],
.dark [class*='bg-forth'] * {
  color: ${GRAFITE} !important;
}
/* O verde claro cravado em classe (ex.: "Publicar agora") é claro nos DOIS
   temas — então o texto grafite vale nos dois, sem depender de \`.dark\`. */
[class*="bg-[${VERDE_CLARO}]"],
[class*="bg-[${VERDE_CLARO}]"] * {
  color: ${GRAFITE} !important;
}
`;

fs.writeFileSync(ARQUIVO, texto);

// ⚠️ Conferir o EFEITO, não o exit code: se a varredura não trocar nada, o
// build seguiria feliz e entregaria um app roxo com a nossa marca.
console.log(
  `rebrand-cores: ${trocados} cores trocadas em ${arquivosTocados} arquivos, ` +
  `${ignorados} preservadas`
);
if (trocados === 0) {
  console.error('!! ERRO: nenhuma cor trocada — a paleta mudou de lugar no upstream?');
  process.exit(1);
}

// Varredura final na árvore inteira: se sobrou UM roxo em qualquer arquivo, o
// build falha. É o que impede o app de sair "verde no login e roxo por dentro"
// — exatamente o que aconteceu quando este script só olhava colors.scss.
const sobrou = [];
for (const arquivo of listaArquivos(RAIZ)) {
  for (const hex of fs.readFileSync(arquivo, 'utf8').match(/#[0-9a-fA-F]{6}\b/g) || []) {
    const [h, s] = rgbParaHsl(...hexParaRgb(hex));
    if (ehRoxo(h, s)) sobrou.push(`${path.relative(RAIZ, arquivo)}: ${hex}`);
  }
}
if (sobrou.length) {
  console.error(`!! ERRO: sobrou roxo em ${sobrou.length} lugares:`);
  console.error(sobrou.slice(0, 15).join('\n'));
  process.exit(1);
}

/*
 * Guarda de regressão do contraste. Existe porque isto JÁ QUEBROU em produção:
 * `--new-btn-text` é a cor de texto de boa parte do app (o Tailwind mapeia
 * para `textColor`), e alterá-la deixou texto preto sobre preto no tema escuro
 * e branco sobre branco no claro. O sintoma não aparece em teste automatizado
 * nenhum — só olhando a tela. Então o build passa a exigir os valores do
 * upstream: claro no tema escuro, escuro no tema claro.
 */
const paleta = fs.readFileSync(PALETA, 'utf8');
const partes = paleta.split(/\.light\s*\{/);
const btnTextEscuro = (partes[0].match(/--new-btn-text:\s*(#[0-9a-fA-F]{3,8});/) || [])[1];
const btnTextClaro = (partes[1] || '').match(/--new-btn-text:\s*(#[0-9a-fA-F]{3,8});/)?.[1];
const claro = (c) => c && /^#(fff|ffffff|f[0-9a-f]{5})$/i.test(c);
if (!claro(btnTextEscuro)) {
  console.error(`!! ERRO: --new-btn-text do tema ESCURO deveria ser claro e esta ${btnTextEscuro}. Texto sumiria no fundo escuro.`);
  process.exit(1);
}
if (claro(btnTextClaro)) {
  console.error(`!! ERRO: --new-btn-text do tema CLARO esta ${btnTextClaro} — texto branco em fundo branco.`);
  process.exit(1);
}
