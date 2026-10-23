#!/usr/bin/env node
/*
 * ApolloMedia — tira do produto o que a casa não usa:
 *   • a visão "Dia" do calendário (ficam Semana e Mês)
 *   • a aba "Integrações" (HeyGen, Reel.Farm e afins)
 *
 * DECISÕES DO LEONARDO (02/set). As integrações listadas ali são serviços de
 * terceiros com conta e cobrança próprias — não fazem parte do que a Apollo
 * entrega, e deixá-las visíveis convida o cliente a contratar coisa fora do
 * nosso escopo dentro da nossa interface.
 */
const fs = require('fs');

const FILTROS =
  process.argv[2] || '/app/apps/frontend/src/components/launches/filters.tsx';
const CONTEXTO =
  process.argv[3] || '/app/apps/frontend/src/components/launches/calendar.context.tsx';
const MENU =
  process.argv[4] || '/app/apps/frontend/src/components/layout/top.menu.tsx';

// --- 1. botão "Dia" --------------------------------------------------------
const BOTAO_DIA = `          <div
            className={clsx(
              'pt-[6px] pb-[5px] cursor-pointer w-[74px] text-center rounded-[6px]',
              calendar.display === 'day' && 'text-textItemFocused bg-boxFocused'
            )}
            onClick={setDay}
          >
            {t('day', 'Day')}
          </div>
`;

const filtros = fs.readFileSync(FILTROS, 'utf8');
if (!filtros.includes(BOTAO_DIA)) {
  console.error('!! ERRO: botao "Dia" nao encontrado (upstream mudou o seletor?)');
  process.exit(1);
}
fs.writeFileSync(FILTROS, filtros.replace(BOTAO_DIA, ''));

/*
 * ⚠️ TIRAR O BOTÃO NÃO BASTA — quem já usou a visão Dia tem `day` gravado no
 * COOKIE `calendar-display`, e continuaria preso nela sem nenhum controle na
 * tela para sair. O padrão do upstream já é 'week'; o que falta é converter o
 * valor salvo. Sem isso, o sintoma seria "sumiu o botão e travou na tela do
 * dia" — pior que o problema original.
 */
const SALVO_ANTIGO = "const display = searchParams.get('display') || displaySaved;";
const SALVO_NOVO = `// ApolloMedia: a visao "Dia" saiu do produto. Cookie ou URL antigos que
  // ainda peçam 'day' caem em 'week' — senão o usuario ficaria preso numa
  // visao sem botao para sair dela.
  const displayPedido = searchParams.get('display') || displaySaved;
  const display = displayPedido === 'day' ? 'week' : displayPedido;`;

const contexto = fs.readFileSync(CONTEXTO, 'utf8');
if (!contexto.includes(SALVO_ANTIGO)) {
  console.error('!! ERRO: leitura da visao salva nao encontrada no contexto do calendario');
  process.exit(1);
}
fs.writeFileSync(CONTEXTO, contexto.replace(SALVO_ANTIGO, SALVO_NOVO));

// --- 2. aba "Integrações" --------------------------------------------------
/*
 * Mesmo mecanismo usado na aba "Agente": `hide: true`, que o próprio
 * MenuItemInterface do Postiz prevê e os filtros do menu respeitam. Esconde
 * sem apagar — reverter é apagar uma linha.
 */
const MENU_ANTIGO = "      path: '/third-party',";
const MENU_NOVO = "      path: '/third-party',\n      hide: true,";

const menu = fs.readFileSync(MENU, 'utf8');
const ocorrencias = menu.split(MENU_ANTIGO).length - 1;
if (ocorrencias !== 1) {
  console.error(`!! ERRO: esperava 1 entrada de menu para /third-party, encontrei ${ocorrencias}`);
  process.exit(1);
}
fs.writeFileSync(MENU, menu.replace(MENU_ANTIGO, MENU_NOVO));

// --- Conferir o EFEITO, não o exit code ------------------------------------
const erros = [];
if (fs.readFileSync(FILTROS, 'utf8').includes("{t('day', 'Day')}")) erros.push('botao Dia continua na tela');
if (!fs.readFileSync(CONTEXTO, 'utf8').includes("displayPedido === 'day' ? 'week'")) erros.push('cookie antigo nao cai em week');
if (!fs.readFileSync(MENU, 'utf8').includes(MENU_NOVO)) erros.push('aba Integracoes continua visivel');
if (erros.length) {
  console.error('!! ERRO: ' + erros.join(' | '));
  process.exit(1);
}
console.log('patch-remove-telas: visao "Dia" e aba "Integracoes" fora do produto');
