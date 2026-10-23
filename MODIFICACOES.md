# Modificações em relação ao Postiz

Este documento existe para cumprir o que a **AGPL-3.0** pede de um trabalho derivado: avisar, de forma
destacada, que o programa foi modificado e o que mudou.

**Base:** `ghcr.io/gitroomhq/postiz-app:v2.23.0` ([gitroomhq/postiz-app](https://github.com/gitroomhq/postiz-app))
**Modificado por:** Apollo Solution — a partir de setembro de 2026.

Nenhuma mudança altera o funcionamento do motor de publicação, da fila ou da integração com as redes. Tudo
abaixo é **marca, idioma e recorte de produto** — aparência e quais telas o usuário vê.

## Marca

* **Paleta**: o roxo do Postiz foi trocado pelo verde da Apollo, por varredura de matiz (`rebrand-cores.js`),
  com mapeamentos de destino fixo para o verde do CTA e para o rosa da IA. Inclui a escala de superfícies do
  tema escuro.
* **Tela de login** substituída pelo padrão visual da casa: painel de arte à esquerda, formulário à direita
  (`patches/auth-layout.tsx`, `patches/apollo-login.css`). O painel de depoimentos do Postiz foi removido.
* **Logo, ícone e favicon** trocados pela marca ApolloMedia. Os arquivos de logo do upstream que sobraram em
  `public/` são sobrescritos pelo nome, para que qualquer tela que ainda os peça receba a nossa arte.
* A palavra **"Postiz" foi substituída por "ApolloMedia"** nos textos de interface (valores dos arquivos de
  idioma e ocorrências isoladas no fonte). As referências ao projeto original **neste repositório** e nos
  avisos de licença permanecem.

## Idioma

* **Português do Brasil como único idioma.** O seletor de idioma da barra superior foi removido e a lista de
  idiomas reduzida a uma entrada — sem isso o app voltava ao inglês.
* **240 chaves** que não existiam em nenhum arquivo de idioma (e por isso caíam no texto inglês embutido no
  código) foram traduzidas e acrescentadas (`patches/traducoes-pt.json`, aplicadas por `merge-traducoes.js`,
  que nunca sobrescreve chave já fornecida pelo upstream).

## Recorte de produto

* **Removidos do menu/produto**: a aba de agente de IA, a aba de integrações e a visão "Dia" do calendário.
* **"Equipes" e "Desenvolvedores"** saíram das abas de Configurações e viraram telas próprias, com item no
  menu lateral (`patches/teams-page.tsx`, `patches/developers-page.tsx`).
* **Editor de publicação**: removidos os botões de mídia de design e de geração de imagem por IA.
* **Ajustes de interação**: item de menu com barra lateral em vez de pílula de fundo cheio; estados de hover
  do menu e da lista de canais; ícones de ação do cartão de publicação; botões padronizados.

## Operação (não altera o programa)

`deploy/` traz ainda o `docker-compose.yml` do stack, o bloco de vhost do Caddy e scripts de apoio (backup,
migração de host, carga de demonstração, teste de isolamento entre organizações). Eles não modificam o
Postiz — só descrevem como esta instância é construída e operada.
