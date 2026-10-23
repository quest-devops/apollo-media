#!/usr/bin/env node
/*
 * ApolloMedia — troca a setinha "<" do painel de Canais por um ícone de
 * RECOLHER PAINEL.
 *
 * A seta sozinha não diz o que faz: parece "voltar" (é o mesmo desenho do
 * botão de voltar do navegador e do topo de app mobile). O ícone de painel com
 * a chevron dentro diz a ação — encolher a coluna lateral.
 *
 * ⚠️ POR QUE UM SCRIPT E NÃO UM PATCH DO ARQUIVO INTEIRO
 * O `launches.component.tsx` tem mais de 500 linhas e muda a cada release do
 * Postiz. Substituir o arquivo todo transformaria qualquer atualização num
 * conflito gigante; aqui a troca é ancorada no `d=` do path, que é único no
 * arquivo, e o build falha se ele sumir.
 *
 * ⚠️ O ícone é desenhado com a linha do painel À ESQUERDA de propósito: o
 * componente aplica `rotate-[180deg]` quando a coluna está recolhida, então o
 * mesmo desenho vira o ícone de "expandir" com a linha do outro lado — que é
 * exatamente o significado certo, sem precisar de um segundo ícone.
 */
const fs = require('fs');

const ARQ =
  process.argv[2] ||
  '/app/apps/frontend/src/components/launches/launches.component.tsx';

// Assinatura da chevron original — única no arquivo.
const ALVO = /<svg[\s\S]{0,400}?d="M6 11\.5L1 6\.5L6 1\.5"[\s\S]{0,300}?<\/svg>/;

const NOVO = `<svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <rect
                    x="1.75"
                    y="2.75"
                    width="12.5"
                    height="10.5"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                  <path
                    d="M6 2.75V13.25"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M11.5 6L9.5 8L11.5 10"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>`;

/*
 * O botão também perde o quadrado cinza: com fundo, ele competia com o título
 * "Canais" e parecia um bloco solto no cabeçalho. Sem fundo, sobra o ícone —
 * maior, para continuar clicável — alinhado ao texto.
 *
 * ⚠️ `h-[24px]` sai junto. Mantendo a altura fixa menor que a linha do título,
 * o ícone encostava no topo do bloco em vez de ficar no meio; com `h-full` o
 * item acompanha a altura da linha e o `items-center` do pai faz a
 * centralização de verdade.
 */
const CAIXA_ANTIGA =
  'text-btnText bg-btnSimple rounded-[6px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer select-none';
const CAIXA_NOVA =
  'text-btnText w-[28px] h-full flex items-center justify-center cursor-pointer select-none hover:opacity-70 transition-opacity';

const antes = fs.readFileSync(ARQ, 'utf8');
if (!ALVO.test(antes)) {
  console.error('!! ERRO: nao achei a chevron do botao de recolher (upstream mudou o icone?)');
  process.exit(1);
}
if (!antes.includes(CAIXA_ANTIGA)) {
  console.error('!! ERRO: nao achei a caixa do botao de recolher (classes mudaram no upstream?)');
  process.exit(1);
}
const depois = antes.replace(ALVO, NOVO).replace(CAIXA_ANTIGA, CAIXA_NOVA);
fs.writeFileSync(ARQ, depois);

// Conferir o EFEITO, não o exit code.
const final = fs.readFileSync(ARQ, 'utf8');
if (final.includes('M6 11.5L1 6.5L6 1.5') || !final.includes('M11.5 6L9.5 8L11.5 10') || final.includes('bg-btnSimple rounded-[6px] w-[24px]')) {
  console.error('!! ERRO: a troca do icone nao gravou');
  process.exit(1);
}
console.log('patch-icone-recolher: chevron -> icone de recolher painel');
