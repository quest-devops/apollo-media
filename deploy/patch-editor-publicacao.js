#!/usr/bin/env node
/*
 * ApolloMedia — editor de publicação: barra de mídia enxuta e botão de
 * adicionar comentário/postagem no verde da marca.
 *
 * 1. SAEM "Mídia de design" e "IA Image".
 *    Decisão do Leonardo (02/set). São recursos do Postiz que a casa não usa:
 *    a arte do post nasce no `mkt-engine` (apollo-marketing), não dentro do
 *    agendador — e a geração de imagem por IA aqui consome chave de LLM
 *    própria do Postiz, fora do nosso controle de custo. "Inserir mídia"
 *    continua, que é o caminho real: o post vem pronto e é anexado.
 *
 *    ⚠️ `AiVideo` FICA. O pedido foi por "IA Image"; remover o vídeo junto
 *    seria decidir por conta própria uma coisa que ninguém pediu.
 *
 * 2. O botão "Adicionar comentário / postagem" era ROSA (#D82D7E) — a cor de
 *    IA do Postiz, que a varredura de matiz não tocou (é magenta, fora da
 *    faixa do roxo). Num app verde, o rosa era o único ponto fora da paleta.
 *
 *    ⚠️ O texto NÃO vira preto nos dois temas. No claro o botão é o verde
 *    escuro #0A7D47, onde preto sobre verde escuro é ilegível — ali o branco
 *    é o certo. Por isso `dark:` no grafite: preto no tema escuro (verde
 *    claro), branco no tema claro (verde escuro).
 */
const fs = require('fs');

const MEDIA =
  process.argv[2] || '/app/apps/frontend/src/components/media/media.component.tsx';
const BOTAO =
  process.argv[3] || '/app/apps/frontend/src/components/new-launch/add.post.button.tsx';

// --- 1. barra de mídia -----------------------------------------------------
const BLOCO_DESIGN = `              <div
                onClick={designMedia}
                className="cursor-pointer h-[30px] rounded-[6px] justify-center items-center flex bg-newColColor px-[8px]"
              >
                <div className="flex gap-[5px] items-center">
                  <div>
                    <DesignMediaIcon />
                  </div>
                  <div className="text-[10px] font-[600] iconBreak:hidden block">
                    {t('design_media', 'Design Media')}
                  </div>
                </div>
              </div>
`;
const LINHA_AI_IMAGE = `                  <AiImage value={text} onChange={changeMedia} />
`;

const midia = fs.readFileSync(MEDIA, 'utf8');
const errosMidia = [];
if (!midia.includes(BLOCO_DESIGN)) errosMidia.push('bloco "Design Media" nao encontrado');
if (!midia.includes(LINHA_AI_IMAGE)) errosMidia.push('componente AiImage nao encontrado');
if (errosMidia.length) {
  console.error('!! ERRO: ' + errosMidia.join(' | ') + ' (upstream mudou o editor?)');
  process.exit(1);
}
fs.writeFileSync(
  MEDIA,
  midia.replace(BLOCO_DESIGN, '').replace(LINHA_AI_IMAGE, '')
);

const midiaFinal = fs.readFileSync(MEDIA, 'utf8');
if (midiaFinal.includes('onClick={designMedia}') || midiaFinal.includes('<AiImage ')) {
  console.error('!! ERRO: os botoes de design/IA continuam sendo renderizados');
  process.exit(1);
}

/*
 * --- 2. botão de adicionar comentário/postagem ----------------------------
 *
 * ⚠️ A COR JÁ CHEGA VERDE AQUI, e é por isso que este patch NÃO mexe no fundo.
 * O `rebrand-cores.js` roda ANTES (passo 1 do Dockerfile) e leva o rosa de IA
 * (#d82d7e) direto para o verde da marca — nos 4 componentes que o traziam
 * cravado. Uma versão anterior deste script procurava `bg-[#D82D7E]` e teria
 * quebrado o build procurando uma cor que já não existe.
 *
 * O que sobra para cá é o TEXTO: ele está cravado como `!text-white`, com o
 * `!` do Tailwind (important), sobre um fundo que agora é verde claro. Branco
 * sobre verde claro reprova em WCAG — a regra da marca pede grafite.
 */
const TEXTO_ANTIGO = '<div className="!text-white">';
const TEXTO_NOVO = '<div className="!text-[#0e0e0e]">';
const TRACO_ANTIGO = 'stroke="white"';
const TRACO_NOVO = 'stroke="currentColor"';

const botao = fs.readFileSync(BOTAO, 'utf8');
const errosBotao = [];
if (!botao.includes(TEXTO_ANTIGO)) errosBotao.push('rotulo do botao nao encontrado');
if (!botao.includes(TRACO_ANTIGO)) errosBotao.push('icone "+" nao encontrado');
if (errosBotao.length) {
  console.error('!! ERRO: ' + errosBotao.join(' | ') + ' (upstream mudou o botao?)');
  process.exit(1);
}
fs.writeFileSync(
  BOTAO,
  botao.replace(TEXTO_ANTIGO, TEXTO_NOVO).replace(TRACO_ANTIGO, TRACO_NOVO)
);

// Conferir o EFEITO, não o exit code.
const botaoFinal = fs.readFileSync(BOTAO, 'utf8');
const ok =
  botaoFinal.includes('!text-[#0e0e0e]') &&
  !botaoFinal.includes('stroke="white"') &&
  !botaoFinal.includes('#D82D7E') &&
  !botaoFinal.includes('#d82d7e');
if (!ok) {
  console.error('!! ERRO: o patch do botao de comentario nao gravou por completo (ou sobrou rosa)');
  process.exit(1);
}
console.log('patch-editor-publicacao: "Midia de design" e "IA Image" removidos; botao de comentario no verde da marca');
