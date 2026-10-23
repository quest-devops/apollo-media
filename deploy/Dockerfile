# ApolloMedia — imagem derivada do Postiz com a marca Apollo.
#
# O Postiz NÃO tem rebrand por configuração (as únicas variáveis de marca
# mudam o botão de login, não o app), então a marca exige fork do frontend.
# Este Dockerfile é o fork: parte da imagem oficial PINADA, aplica os patches
# e RECONSTRÓI o frontend Next.js.
#
# Dá para reconstruir dentro da imagem porque ela já traz o fonte e o
# node_modules completos — o build do frontend leva menos de um minuto e não
# precisa de rede. Medido em 02/set/2026.
#
# Build:  docker compose -f docker-compose.yml build postiz
#
# ⚠️ AGPL §13 — esta imagem é um trabalho derivado servido pela rede: o fonte
# modificado (este repo) tem de continuar público e oferecido aos usuários.
#
# ⚠️ AO SUBIR DE VERSÃO: conferir se `colors.scss` e o layout de auth ainda
# estão onde estão. O rebrand-cores.js aborta se não achar roxo — de propósito.
FROM ghcr.io/gitroomhq/postiz-app:v2.23.0

WORKDIR /app

# 1. Paleta: roxo -> verde Apollo, por varredura de matiz.
COPY deploy/rebrand-cores.js /tmp/rebrand-cores.js
RUN node /tmp/rebrand-cores.js /app/apps/frontend

# 2. Idioma padrão em português e a palavra "Postiz" fora da interface.
COPY deploy/rebrand-textos.js /tmp/rebrand-textos.js
RUN node /tmp/rebrand-textos.js /app
COPY deploy/rebrand-textos-cravados.js /tmp/rebrand-textos-cravados.js
RUN node /tmp/rebrand-textos-cravados.js /app/apps/frontend/src
COPY deploy/merge-traducoes.js /tmp/merge-traducoes.js
COPY deploy/patches/traducoes-pt.json /tmp/traducoes-pt.json
RUN node /tmp/merge-traducoes.js /app /tmp/traducoes-pt.json

# 3. Tela de login no padrão da casa (split com painel de arte).
COPY deploy/patches/auth-layout.tsx "/app/apps/frontend/src/app/(app)/auth/layout.tsx"
COPY deploy/patches/apollo-login.css "/app/apps/frontend/src/app/(app)/auth/apollo-login.css"

# Logo da barra lateral — troca o "P" do Postiz pelo ícone ApolloMedia.
COPY deploy/patches/logo.tsx /app/apps/frontend/src/components/new-layout/logo.tsx

# Item do menu: barra vertical verde no selecionado, no lugar da pílula de
# fundo cheio — que, em verde, vazava pela borda da barra lateral estreita.
COPY deploy/patches/menu-item.tsx /app/apps/frontend/src/components/new-layout/menu-item.tsx

# O grupo de baixo da barra (Configurações) passa a ser SÓ ÍCONE.
#
# ⚠️ Os dois grupos de menu renderizam o mesmo `<MenuItem>`; o que os separa no
# arquivo é a INDENTAÇÃO (12 espaços no de baixo, 16 no de cima). Por isso o
# alvo do sed inclui os espaços — sem eles, o menu de cima perderia os rótulos
# junto.
RUN sed -i 's|^            <MenuItem$|            <MenuItem\n              soIcone|' \
      /app/apps/frontend/src/components/layout/top.menu.tsx \
 && test "$(grep -c 'soIcone' /app/apps/frontend/src/components/layout/top.menu.tsx)" = "1" \
 || (echo "!! ERRO: o modo so-icone nao foi aplicado ao menu de baixo (ou vazou para o de cima)" && exit 1)

# Hover dos canais e do menu do canal: barra cinza na lista (sem fundo), fundo
# cinza no menu suspenso, e a linha inteira do canal abrindo o menu.
COPY deploy/patch-hover-canais.js /tmp/patch-hover-canais.js
RUN node /tmp/patch-hover-canais.js

# Ícones de ação do cartão de publicação (duplicar, prévia, excluir).
COPY deploy/patch-icones-cartao.js /tmp/patch-icones-cartao.js
RUN node /tmp/patch-icones-cartao.js

# "Equipes" e "Desenvolvedores" saem de Configurações e viram telas próprias,
# com item no menu lateral abaixo de "Divulgações".
COPY deploy/patches/teams-page.tsx "/app/apps/frontend/src/app/(app)/(site)/teams/page.tsx"
COPY deploy/patches/developers-page.tsx "/app/apps/frontend/src/app/(app)/(site)/developers/page.tsx"
COPY deploy/patch-menu-equipes-dev.js /tmp/patch-menu-equipes-dev.js
RUN node /tmp/patch-menu-equipes-dev.js

# Visão "Dia" e aba "Integrações" fora do produto.
COPY deploy/patch-remove-telas.js /tmp/patch-remove-telas.js
RUN node /tmp/patch-remove-telas.js

# Editor de publicação: sem "Mídia de design" e "IA Image"; botão de adicionar
# comentário/postagem com texto grafite sobre o verde.
COPY deploy/patch-editor-publicacao.js /tmp/patch-editor-publicacao.js
RUN node /tmp/patch-editor-publicacao.js

# Botões do app (Integrações, Divulgações, Análises, modais) no verde do CTA.
COPY deploy/patch-botoes.js /tmp/patch-botoes.js
RUN node /tmp/patch-botoes.js

# Aba "Agente" fora do menu — o agente de IA não roda por dentro do app.
COPY deploy/patch-sem-agente.js /tmp/patch-sem-agente.js
RUN node /tmp/patch-sem-agente.js

# Seletor de idioma fora da barra superior — o app é monolíngue em português.
COPY deploy/patch-sem-idioma.js /tmp/patch-sem-idioma.js
RUN node /tmp/patch-sem-idioma.js

# Botão "Criar publicação": peso da fonte, "+" na cor herdada e halo verde.
COPY deploy/patch-botao-publicar.js /tmp/patch-botao-publicar.js
RUN node /tmp/patch-botao-publicar.js

# Ícone de recolher o painel de Canais (a setinha "<" não dizia a ação).
COPY deploy/patch-icone-recolher.js /tmp/patch-icone-recolher.js
RUN node /tmp/patch-icone-recolher.js

# Setas de navegação do calendário no cinza dos cards de publicação.
#
# Elas usavam `bg-newBgColorInner` — a MESMA superfície do menu e dos painéis —
# então sumiam dentro do próprio bloco de navegação: não dava para ver que eram
# botões. Passam a usar `newColColor` (#343a3d), o cinza dos cards de post.
#
# ⚠️ A troca é ancorada nas linhas que têm `rtl:rotate-180` (a marca das
# setas). O arquivo tem 7 usos de `bg-newBgColorInner` no mesmo bloco — trocar
# todos repintaria também o rótulo da data e o botão "Hoje", que devem
# continuar na superfície do painel para as setas se destacarem deles.
RUN sed -i '/rtl:rotate-180/s/bg-newBgColorInner/bg-newColColor/g' \
      /app/apps/frontend/src/components/launches/filters.tsx \
 && test "$(grep -c 'rtl:rotate-180.*bg-newColColor' /app/apps/frontend/src/components/launches/filters.tsx)" -ge 4 \
 || (echo "!! ERRO: as setas do calendario nao foram repintadas" && exit 1)

# Favicon e ícones do app, gerados da arte da marca com o sharp que o Next já
# traz na imagem. Ver gera-favicon.js para o porquê do .ico montado na mão.
#
# ⚠️ O script mora em /app, não em /tmp, DE PROPÓSITO: o `require` do Node
# resolve a partir da pasta do PRÓPRIO ARQUIVO, não do diretório de trabalho.
# Em /tmp ele não enxerga /app/node_modules e quebra com "Cannot find module
# 'sharp'" — e nenhum `cd /app` antes resolve isso.
COPY brand/icone-fonte.png /tmp/icone-fonte.png
COPY deploy/gera-favicon.js /app/gera-favicon.js
RUN node /app/gera-favicon.js /tmp/icone-fonte.png /app/apps/frontend/public \
 && rm -f /app/gera-favicon.js

# 4. Ativos de marca.
#
# ⚠️ VÃO NA RAIZ DO public/, COM PREFIXO `apollo-`, E ISSO NÃO É ESTILO.
# O `proxy.ts` do Postiz tem o matcher
#     '/((?!api/|_next/|_static/|_vercel|[\w-]+\.\w+).*)'
# — a exclusão `[\w-]+\.\w+` só casa com UM segmento. Arquivo em subpasta
# (/apollo/login-panel.webp) não é excluído, cai no middleware e volta 307
# para /auth. O sintoma é cruel: a página monta certinho, sem erro nenhum no
# log, só com o painel preto e o logo quebrado. Custou uma rodada de build.
COPY brand/login/ /app/apps/frontend/public/

# Os arquivos de logo do Postiz que sobraram em public/ apontam para a marca
# deles e ainda são usados em telas soltas (ex.: a página pública de preview de
# publicação, que renderiza /postiz.svg). Sobrescrever pelo nome é mais seguro
# que caçar cada referência: qualquer tela que ainda peça o arquivo antigo
# recebe a nossa arte.
RUN cd /app/apps/frontend/public \
 && cp apollo-icone.svg postiz.svg \
 && cp apollo-icone.svg logo.svg \
 && cp apollo-lockup.svg postiz-text.svg \
 && cp apollo-lockup.svg logo-text.svg

# ⚠️ Conferir o EFEITO, não o exit code — regra da casa. Se o painel de
# marketing do Postiz sobreviver ao patch, é porque o upstream moveu o
# arquivo: melhor o build falhar aqui do que a propaganda do produto de base
# aparecer para o cliente.
#
# ⚠️ A guarda procura `TestimonialComponent` — o COMPONENTE do painel — e não
# o texto da propaganda. A primeira versão procurava a frase "Entrepreneurs" e
# quebrou o build achando a palavra no comentário deste próprio patch, que
# explica o que foi removido. Guarda tem de olhar código, não prosa.
RUN grep -q "apollo-painel" "/app/apps/frontend/src/app/(app)/auth/layout.tsx" \
 && ! grep -q "TestimonialComponent" "/app/apps/frontend/src/app/(app)/auth/layout.tsx" \
 && test -f /app/apps/frontend/public/apollo-login-panel.webp \
 && test -f /app/apps/frontend/public/apollo-lockup.svg \
 && test -f /app/apps/frontend/public/apollo-icone.svg \
 && grep -q "apollo-icone" /app/apps/frontend/src/components/new-layout/logo.tsx \
 || (echo "!! ERRO: patch de marca nao aplicou" && exit 1)

# ⚠️ GUARDA DE CONFORMIDADE — AGPL §13.
# A licença exige OFERECER o fonte a quem usa o serviço pela rede, não apenas
# publicá-lo. O link mora na tela de login (por onde todo mundo passa, já que o
# cadastro é fechado) e na tela de Desenvolvedores. Se um upgrade do upstream
# derrubar esses patches, a imagem sai sem a oferta e a inadimplência volta SEM
# NINGUÉM PERCEBER. Por isso o build falha aqui, em vez de entregar uma imagem
# silenciosamente fora de conformidade.
RUN grep -q "quest-devops/apollo-media" "/app/apps/frontend/src/app/(app)/auth/layout.tsx" \
 && grep -q "quest-devops/apollo-media" "/app/apps/frontend/src/app/(app)/(site)/developers/page.tsx" \
 || (echo "!! ERRO: o aviso de fonte aberto (AGPL 13) sumiu das telas" && exit 1)

# 5. Reconstrói o frontend com os patches dentro.
RUN pnpm run build:frontend

# Sanidade: o build tem de ter gerado CSS com o verde da marca. Sem isto, uma
# falha silenciosa do Next entregaria a imagem antiga com cara nova.
RUN grep -rqi "2fe68c" /app/apps/frontend/.next/static/chunks/*.css \
 || (echo "!! ERRO: o verde da marca nao apareceu no CSS compilado" && exit 1)
