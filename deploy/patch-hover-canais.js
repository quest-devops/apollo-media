#!/usr/bin/env node
/*
 * ApolloMedia — hover dos canais na mesma regra do menu lateral:
 * sem fundo, só a barra cinza à esquerda.
 *
 * O item de canal já trazia a barra do upstream (aparece no hover), mas
 * SOMADA a um fundo cinza que ocupa a linha inteira — o mesmo efeito que
 * incomodava no menu. E a barra estava VERDE: ela era roxa no Postiz e a
 * varredura de matiz a recoloriu junto com o resto, o que a fazia parecer
 * seleção, não passagem do mouse.
 *
 * Regra da casa, agora nos dois lugares:
 *   • passar o mouse  → barra CINZA
 *   • selecionado     → barra VERDE (só o menu tem esse estado)
 *
 * ⚠️ A barra vira um `div` com cor de fundo, e o `<SVGLine />` sai de cena
 * AQUI — mas o componente continua exportado e usado em outras telas
 * (configurações, plugs). Trocar o componente inteiro mudaria aquelas telas
 * de tabela por tabela sem ninguém pedir.
 */
const fs = require('fs');

const ARQ =
  process.argv[2] ||
  '/app/apps/frontend/src/components/launches/launches.component.tsx';

// 1. o fundo cinza do item inteiro
const COM_FUNDO =
  "'flex gap-[12px] items-center bg-newBgColorInner hover:bg-boxHover group/profile transition-all rounded-e-[8px]',";
// `relative` entra aqui porque o gatilho do menu vira um overlay da linha
// inteira (ver mais abaixo) e precisa de um pai posicionado.
const SEM_FUNDO =
  "'relative flex gap-[12px] items-center bg-newBgColorInner group/profile transition-all rounded-e-[8px]',";

/*
 * O nome do canal era a ALÇA DE ARRASTAR (`role="Handle"`, `cursor-move`), e
 * arrastar solta o canal dentro de um GRUPO (`changeItemGroup`). A função é
 * real — mas só faz sentido quando existem grupos criados, e sem nenhum a
 * seta de mover anuncia uma ação que não leva a lugar nenhum.
 *
 * O `cursor-move` sai. A mesma ação continua disponível, e mais explícita, no
 * item "Mover / adicionar ao grupo" do menu.
 */
const NOME_ANTIGO =
  "'group-[.sidebar]:hidden flex-1 whitespace-nowrap text-ellipsis overflow-hidden cursor-move',";
/*
 * O nome também ganha estado: cinza claro parado, branco sob o mouse. Vale por
 * si — é o retorno visual que o usuário lê primeiro, e sobrevive mesmo que a
 * barra de 3px passe despercebida em tela grande.
 */
const NOME_NOVO =
  "'group-[.sidebar]:hidden flex-1 whitespace-nowrap text-ellipsis overflow-hidden text-textItemBlur group-hover/profile:text-menuDotsHover transition-colors',";

// 2. a barra: de gradiente verde para cinza chapado, do mesmo tom do menu
const BARRA_ANTIGA =
  '<div className="h-full w-[4px] -ms-[12px] rounded-s-[3px] opacity-0 group-hover/profile:opacity-100 transition-opacity">\n          <SVGLine />\n        </div>';
/*
 * ⚠️ A BARRA NUNCA APARECEU, E O MOTIVO NÃO ERA A COR.
 * O upstream desenha `h-full`, mas o pai dela (o bloco do avatar) não tem
 * altura definida — então `h-full` resolve para ZERO. Medido: 3px de largura,
 * 0 de altura, em qualquer estado. Trocar a cor ou a opacidade nunca ia
 * resolver, porque não havia o que pintar.
 *
 * Agora ela é posicionada por absoluto dentro do bloco do avatar, tirando a
 * altura de `top`/`bottom` em vez de depender de um pai dimensionado.
 */
const BARRA_NOVA =
  '<div className="absolute start-[-12px] top-0 bottom-0 w-[3px] rounded-e-[3px] bg-menuDots opacity-0 group-hover/profile:opacity-100 transition-opacity" />';

const antes = fs.readFileSync(ARQ, 'utf8');
const erros = [];
if (!antes.includes(COM_FUNDO)) erros.push('classe do item de canal nao encontrada');
if (!antes.includes(BARRA_ANTIGA)) erros.push('barra de hover do canal nao encontrada');
if (!antes.includes(NOME_ANTIGO)) erros.push('alca de arrastar (cursor-move) nao encontrada');
if (erros.length) {
  console.error('!! ERRO: ' + erros.join(' | ') + ' (upstream mudou o componente?)');
  process.exit(1);
}

fs.writeFileSync(
  ARQ,
  antes
    .replace(COM_FUNDO, SEM_FUNDO)
    .replace(BARRA_ANTIGA, BARRA_NOVA)
    .replace(NOME_ANTIGO, NOME_NOVO)
);

// Conferir o EFEITO, não o exit code.
const final = fs.readFileSync(ARQ, 'utf8');
if (final.includes('hover:bg-boxHover group/profile') || !final.includes('bg-menuDots opacity-0 group-hover/profile') || final.includes('h-full w-[4px] -ms-[12px]')) {
  console.error('!! ERRO: o patch do hover dos canais nao gravou');
  process.exit(1);
}
console.log('patch-hover-canais: fundo removido, barra verde -> cinza');

/*
 * ---------------------------------------------------------------------------
 * O menu suspenso do canal (⋮) segue a regra OPOSTA — e de propósito.
 *
 * Na lista e no menu lateral, fundo no hover atrapalha: são faixas largas,
 * coladas na borda, onde o retângulo vaza. Num menu suspenso o padrão é o
 * contrário: cada linha É um alvo de clique dentro de uma caixa flutuante, e
 * o realce de fundo é o que diz onde o clique vai cair.
 *
 * O que faltava era hierarquia: os 11 itens vinham todos em branco, sem
 * distinção entre "onde o mouse está" e "o resto". Agora o texto nasce cinza
 * claro e só o item sob o mouse fica branco, com fundo.
 * ---------------------------------------------------------------------------
 */
const MENU =
  process.argv[3] || '/app/apps/frontend/src/components/launches/menu/menu.tsx';

const ITEM_ANTIGO = 'className="flex gap-[12px] items-center py-[8px] px-[10px]"';
const ITEM_NOVO =
  'className="flex gap-[12px] items-center py-[8px] px-[10px] rounded-[6px] cursor-pointer text-textItemBlur hover:text-menuDotsHover hover:bg-boxHover transition-colors"';

const menuAntes = fs.readFileSync(MENU, 'utf8');
const quantos = menuAntes.split(ITEM_ANTIGO).length - 1;
if (quantos === 0) {
  console.error('!! ERRO: itens do menu suspenso nao encontrados (upstream mudou as classes?)');
  process.exit(1);
}
fs.writeFileSync(MENU, menuAntes.split(ITEM_ANTIGO).join(ITEM_NOVO));

const menuFinal = fs.readFileSync(MENU, 'utf8');
if (menuFinal.includes(ITEM_ANTIGO) || !menuFinal.includes('hover:bg-boxHover transition-colors')) {
  console.error('!! ERRO: o patch do menu suspenso nao gravou');
  process.exit(1);
}
console.log(`patch-hover-canais: ${quantos} itens do menu suspenso com hover cinza e texto claro`);

/*
 * ---------------------------------------------------------------------------
 * Fora os três pontinhos: a LINHA INTEIRA abre o menu.
 *
 * O ⋮ é um alvo de 24px que o usuário precisa acertar para descobrir que
 * existem opções. Com a linha inteira como gatilho, a descoberta é imediata e
 * o alvo passa a ter a altura toda do item.
 *
 * COMO: o gatilho deixa de ser a caixinha do ícone e vira um overlay
 * `absolute inset-0` sobre a linha (que ganhou `relative` acima), com o ícone
 * escondido. O `justify-end` mantém o ponto de ancoragem do popup à direita,
 * onde ele já abria.
 *
 * ⚠️ CONSEQUÊNCIA ASSUMIDA: o overlay cobre a alça de arrastar, então mover o
 * canal para um grupo ARRASTANDO deixa de funcionar. A ação continua no item
 * "Mover / adicionar ao grupo" do próprio menu — que é mais explícito. O aviso
 * de canal desconectado segue clicável: aquele overlay tem z-[200], acima
 * deste.
 * ---------------------------------------------------------------------------
 */
const GATILHO_ANTIGO = 'className="cursor-pointer relative select-none flex"';
const GATILHO_NOVO =
  'className="cursor-pointer absolute inset-0 select-none flex items-center justify-end pe-[10px]"';
const PONTINHOS_ANTIGO =
  'className="text-menuDots group-hover/profile:text-menuDotsHover"';
const PONTINHOS_NOVO = 'className="hidden"';

const m2 = fs.readFileSync(MENU, 'utf8');
if (!m2.includes(GATILHO_ANTIGO) || !m2.includes(PONTINHOS_ANTIGO)) {
  console.error('!! ERRO: gatilho ou icone do menu nao encontrados (upstream mudou o componente?)');
  process.exit(1);
}
fs.writeFileSync(
  MENU,
  m2.replace(GATILHO_ANTIGO, GATILHO_NOVO).replace(PONTINHOS_ANTIGO, PONTINHOS_NOVO)
);

const m3 = fs.readFileSync(MENU, 'utf8');
if (!m3.includes('absolute inset-0 select-none flex items-center justify-end')) {
  console.error('!! ERRO: o gatilho de linha inteira nao gravou');
  process.exit(1);
}
console.log('patch-hover-canais: pontinhos escondidos, linha inteira abre o menu');
