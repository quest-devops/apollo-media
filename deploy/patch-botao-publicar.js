#!/usr/bin/env node
/*
 * ApolloMedia — botão "Criar publicação": peso da fonte, ícone e brilho.
 *
 * TRÊS PROBLEMAS, TRÊS CAUSAS DIFERENTES
 *
 * 1. A fonte parecia mais fina que a dos botões vizinhos porque ELA ERA: o
 *    rótulo só declara tamanho (`text-[14px]`), sem peso, então herda 400,
 *    enquanto "Adicionar canal" e companhia usam 500/600.
 *
 * 2. O "+" continuava branco mesmo com a regra de contraste da marca (texto
 *    sobre verde = grafite). Motivo: a regra pinta `color`, e o ícone traz
 *    `stroke="white"` CRAVADO no SVG — atributo de apresentação não olha para
 *    a cor herdada. Trocando por `currentColor`, ele passa a obedecer.
 *
 * 3. O botão não tinha brilho nenhum: é a ação principal da tela e competia de
 *    igual para igual com os botões secundários. Ganha o mesmo halo verde do
 *    CTA da tela de login — os valores são copiados de lá, não redesenhados.
 *
 * ⚠️ O halo é SÓ NO TEMA ESCURO (`dark:`). No claro o botão é o verde escuro
 * #0A7D47 sobre fundo branco, e um halo neon ali vira borrão sujo em vez de
 * destaque.
 */
const fs = require('fs');

const ARQ =
  process.argv[2] || '/app/apps/frontend/src/components/launches/new.post.tsx';
const LISTA =
  process.argv[3] || '/app/apps/frontend/src/components/launches/launches.component.tsx';

const BOTAO_ANTIGO =
  'className="text-white flex-1 pt-[12px] pb-[14px] ps-[16px] pe-[20px] group-[.sidebar]:p-0 min-h-[44px] max-h-[44px] rounded-md bg-btnPrimary flex justify-center items-center gap-[5px] outline-none"';
const BOTAO_NOVO =
  'className="text-white flex-1 pt-[12px] pb-[14px] ps-[16px] pe-[20px] group-[.sidebar]:p-0 min-h-[44px] max-h-[44px] rounded-md bg-btnPrimary flex justify-center items-center gap-[5px] outline-none transition-shadow dark:shadow-[0_0_12px_rgba(47,230,140,0.45),0_0_28px_rgba(47,230,140,0.25)] dark:hover:shadow-[0_0_16px_rgba(47,230,140,0.65),0_0_38px_rgba(47,230,140,0.38)]"';

const ICONE_ANTIGO = 'd="M10.5001 4.16699V15.8337M4.66675 10.0003H16.3334"\n          stroke="white"';
const ICONE_NOVO = 'd="M10.5001 4.16699V15.8337M4.66675 10.0003H16.3334"\n          stroke="currentColor"';

const ROTULO_ANTIGO =
  '<div className="flex-1 text-start text-[14px] group-[.sidebar]:hidden">';
const ROTULO_NOVO =
  '<div className="flex-1 text-start text-[14px] font-[600] group-[.sidebar]:hidden">';

/*
 * ⚠️ O HALO PRECISA DE ESPAÇO, SENÃO ELE É CORTADO.
 * A lista de canais começa logo abaixo do botão, e a primeira linha tem fundo
 * OPACO (`bg-newBgColorInner`). Como o brilho se espalha por ~28px, ele passa
 * por baixo dessa linha e some num corte reto — o efeito fica pior do que não
 * ter brilho nenhum, porque parece defeito de renderização.
 *
 * A folga entra na LISTA, não no botão: assim o respiro existe só onde o
 * brilho precisa dele e nada muda quando a barra está recolhida.
 */
const LISTA_ANTIGA =
  '<div className="gap-[32px] flex flex-col select-none flex-1">';
const LISTA_NOVA =
  '<div className="gap-[32px] mt-[14px] flex flex-col select-none flex-1">';

const antes = fs.readFileSync(ARQ, 'utf8');
const erros = [];
if (!antes.includes(BOTAO_ANTIGO)) erros.push('classe do botao nao encontrada');
if (!antes.includes(ICONE_ANTIGO)) erros.push('icone "+" com stroke branco nao encontrado');
if (!antes.includes(ROTULO_ANTIGO)) erros.push('rotulo do botao nao encontrado');
if (erros.length) {
  console.error('!! ERRO: ' + erros.join(' | ') + ' (upstream mudou o componente?)');
  process.exit(1);
}

fs.writeFileSync(
  ARQ,
  antes
    .replace(BOTAO_ANTIGO, BOTAO_NOVO)
    .replace(ICONE_ANTIGO, ICONE_NOVO)
    .replace(ROTULO_ANTIGO, ROTULO_NOVO)
);

// Conferir o EFEITO, não o exit code.
const final = fs.readFileSync(ARQ, 'utf8');
const ok =
  final.includes('dark:shadow-[0_0_12px_rgba(47,230,140,0.45)') &&
  final.includes('stroke="currentColor"') &&
  final.includes('text-[14px] font-[600]') &&
  !final.includes('stroke="white"');
if (!ok) {
  console.error('!! ERRO: o patch do botao de publicar nao gravou por completo');
  process.exit(1);
}
// Folga entre o botao e a lista, para o halo nao ser cortado pela primeira linha.
const listaAntes = fs.readFileSync(LISTA, 'utf8');
if (!listaAntes.includes(LISTA_ANTIGA)) {
  console.error('!! ERRO: container da lista de canais nao encontrado');
  process.exit(1);
}
fs.writeFileSync(LISTA, listaAntes.replace(LISTA_ANTIGA, LISTA_NOVA));
if (!fs.readFileSync(LISTA, 'utf8').includes('gap-[32px] mt-[14px]')) {
  console.error('!! ERRO: a folga da lista nao gravou');
  process.exit(1);
}
console.log('patch-botao-publicar: peso 600, "+" em currentColor, halo verde e folga p/ o halo');
