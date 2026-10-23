# ApolloMedia

**ApolloMedia é a publicação e agendamento em redes sociais da [Apollo Solution](https://apollosolution.com.br).**
Ele é um **trabalho derivado do [Postiz](https://github.com/gitroomhq/postiz-app)** (AGPL-3.0): parte da imagem
oficial `ghcr.io/gitroomhq/postiz-app:v2.23.0`, aplica um conjunto de patches de marca e idioma, e reconstrói
o frontend Next.js por cima.

No ar em **https://app.apollomedia.com.br**.

---

## AGPL-3.0 notice (English)

This is a **modified version of [Postiz](https://github.com/gitroomhq/postiz-app)**, licensed under the
**GNU Affero General Public License v3.0**. It is operated as a network service at
`https://app.apollomedia.com.br`, and this repository is the public source of the modifications, published to
comply with **section 13** of the AGPL.

* Upstream: `ghcr.io/gitroomhq/postiz-app:v2.23.0` (pinned — see `deploy/Dockerfile`)
* What we changed: see [`MODIFICACOES.md`](MODIFICACOES.md)
* License: [`LICENSE`](LICENSE) (AGPL-3.0)

The modifications in this repository are applied on top of the pinned upstream image by the scripts in
`deploy/`. The build is reproducible: `docker compose -f deploy/docker-compose.yml build postiz`.

---

## Como funciona o fork

O Postiz **não tem rebrand por configuração** — as únicas variáveis de marca mudam o botão de login, não o
app. Então a marca exige fork do frontend. O `deploy/Dockerfile` é esse fork:

1. parte da imagem oficial **pinada** (`:v2.23.0`, nunca `:latest`);
2. aplica os patches de `deploy/` (paleta, textos, traduções, tela de login, menu, ícones, remoções);
3. roda `pnpm run build:frontend` **dentro da imagem**.

Dá para reconstruir ali porque a imagem já traz o fonte e o `node_modules` completos: o build leva menos de
um minuto e **não precisa de rede**.

> ⚠️ **Ao subir de versão do Postiz**, conferir se `colors.scss` e o layout de auth continuam onde estão.
> O `rebrand-cores.js` aborta se não achar roxo — de propósito. Várias etapas do Dockerfile têm guardas que
> **falham o build** em vez de entregar uma imagem com cara nova e conteúdo velho.

## Estrutura

| Pasta | O quê |
|---|---|
| `deploy/` | `Dockerfile` do fork, `docker-compose.yml` do stack, scripts de patch e de operação |
| `deploy/patches/` | arquivos que substituem os do upstream por inteiro (tela de login, menu, páginas novas) |
| `brand/` | arte da marca ApolloMedia usada no build (ícone, lockup, painel de login, fontes) |

## Subir

```sh
cp deploy/.env.example deploy/.env   # preencher; o real nunca vai para o git
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d
```

O stack são 6 contêineres (app, Postgres, Redis, Temporal + Postgres próprio, Elasticsearch) e **não publica
porta nenhuma** — quem expõe é o Caddy compartilhado, que entra na rede do stack e roteia por nome de
contêiner. O bloco de vhost está em `deploy/caddy-vhost.snippet`.

## Fontes

`apollo-VT323-Regular.woff2` e `apollo-JetBrainsMono-Variable.woff2` são, respectivamente, **VT323** e
**JetBrains Mono**, ambas sob **SIL Open Font License 1.1**. A arte da marca ApolloMedia (ícone e lockup) é
da Apollo Solution.
