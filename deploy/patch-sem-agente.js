#!/usr/bin/env node
/*
 * ApolloMedia — tira a aba "Agente" do menu lateral.
 *
 * Decisão do Leonardo (02/set): o agente de IA não roda por dentro do
 * ApolloMedia. A camada de IA da casa mora em `mcps/` e opera os apps de fora
 * — um assistente embutido aqui duplicaria essa função com outro dono e outro
 * custo (o de dentro do Postiz consome chave de LLM própria).
 *
 * ⚠️ ESCONDE, NÃO APAGA — e isso é de propósito. O `MenuItemInterface` do
 * próprio Postiz já tem `hide?: boolean`, e os dois filtros do menu o
 * respeitam. Usar o mecanismo que o upstream oferece é o patch de menor
 * superfície possível: nenhuma linha removida, nada para reconciliar no rebase
 * e reverter é apagar uma linha.
 *
 * ⚠️ A ROTA `/agents` CONTINUA EXISTINDO. Isto é navegação, não permissão:
 * quem digitar o endereço ainda chega na tela. Se a decisão for bloquear de
 * verdade, o lugar é o backend — e aí é outra conversa, não um patch de menu.
 */
const fs = require('fs');

const ARQ =
  process.argv[2] || '/app/apps/frontend/src/components/layout/top.menu.tsx';

const ANTES = "      path: '/agents',\n    },";
const DEPOIS = "      path: '/agents',\n      hide: true,\n    },";

const texto = fs.readFileSync(ARQ, 'utf8');

const ocorrencias = texto.split(ANTES).length - 1;
if (ocorrencias !== 1) {
  console.error(
    `!! ERRO: esperava 1 entrada de menu para /agents, encontrei ${ocorrencias} (upstream mudou?)`
  );
  process.exit(1);
}

fs.writeFileSync(ARQ, texto.replace(ANTES, DEPOIS));

// Conferir o EFEITO, não o exit code.
const final = fs.readFileSync(ARQ, 'utf8');
if (!final.includes(DEPOIS)) {
  console.error('!! ERRO: a aba Agente nao foi escondida');
  process.exit(1);
}
console.log('patch-sem-agente: aba "Agente" escondida do menu lateral');
