#!/bin/sh
# ApolloMedia — troca o host do app de `media.apollosolution.com.br` (laboratório)
# para `app.apollomedia.com.br` (definitivo). Roda NO SERVIDOR, como root.
#
# POR QUE É UM SCRIPT E NÃO TRÊS COMANDOS
# As três URLs vivem no arquivo de SEGREDOS (/root/plan-secrets/apollo-media.env,
# chmod 600), junto de JWT_SECRET e das senhas do Postgres. Editar isso à mão,
# com pressa, é como se perde um JWT_SECRET — e perder o JWT_SECRET derruba
# todas as sessões e não tem como voltar. O script mexe só nas três linhas,
# guarda cópia antes e nunca imprime valor nenhum.
#
# ⚠️ ORDEM OBRIGATÓRIA — este script é o PASSO 3 de 4:
#   1. DNS: A `app` -> 178.156.139.176, NUVEM CINZA (proxy laranja quebra o
#      ACME do Caddy). Esperar resolver.
#   2. Caddy: entrar com o bloco da ETAPA 1 de `caddy-vhost.snippet`,
#      `caddy validate` e `caddy reload`. O certificado sai sozinho.
#   3. ESTE SCRIPT.
#   4. Caddy: trocar o bloco antigo pelo redirect da ETAPA 2 do snippet.
#
# ⚠️ ELE DERRUBA AS SESSÕES ABERTAS. O cookie de login é emitido para o
# domínio antigo; depois da troca, quem estava logado volta para a tela de
# entrada. É esperado — não é falha da migração.
#
# Uso:  sh /root/apollo-media/deploy/migra-host.sh
#       sh /root/apollo-media/deploy/migra-host.sh --conferir   (só diagnostica)
set -e

NOVO_HOST=app.apollomedia.com.br
ANTIGO_HOST=media.apollosolution.com.br
ENVF=/root/plan-secrets/apollo-media.env
DEP=/root/apollo-media/deploy
CTR=apollo-media-postiz

falha() { echo "!! $1"; exit 1; }

# ── Pré-condição: o host novo já tem de estar de pé COM TLS ──────────────────
# Este é o teste que importa. Se o certificado ainda não saiu, trocar as URLs
# agora deixa o app se anunciando num endereço que o navegador recusa — e o
# login para de funcionar nos DOIS hosts.
echo "== conferindo $NOVO_HOST =="
COD=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://$NOVO_HOST/" || echo 000)
[ "$COD" = "000" ] && falha "https://$NOVO_HOST nao respondeu (DNS ainda nao propagou, vhost ausente ou certificado nao emitido). Passos 1 e 2 antes deste."
echo "   respondeu HTTP $COD com TLS valido"

if [ "$1" = "--conferir" ]; then
  echo "== variaveis atuais no container =="
  docker exec "$CTR" sh -c 'env | grep -E "^(MAIN_URL|FRONTEND_URL|NEXT_PUBLIC_BACKEND_URL)="'
  exit 0
fi

[ -f "$ENVF" ] || falha "$ENVF nao existe"

# ── Cópia antes de tocar em arquivo de segredo ───────────────────────────────
BKP="$ENVF.bak-$(date +%Y%m%d-%H%M%S)"
cp -p "$ENVF" "$BKP"
chmod 600 "$BKP"
echo "== copia de seguranca: $BKP =="

# ⚠️ ESTE SCRIPT GRAVA DIRETO NO ARQUIVO DE SEGREDOS, QUE É GERADO DO
# 1PASSWORD. O par .env/.tpl está em /root/plan-secrets/op-mapa.txt, e o item
# é op://apollo-infra/srv-apollo-media. Ou seja: depois de rodar isto, o
# arquivo e o cofre DIVERGEM, e um `apollo-op-env <arq>.tpl <arq> --forcar`
# DESFAZ a migração sem avisar. Aconteceu de verdade: em 23/out o host foi
# migrado aqui e o cofre ficou com o endereço antigo até 26/out.
# REGULARIZAR NO COFRE logo após rodar — não deixar para depois.
echo "!! ATENCAO: o .env agora DIVERGE do 1Password (item srv-apollo-media)."
echo "   Atualizar MAIN_URL, FRONTEND_URL e NEXT_PUBLIC_BACKEND_URL no cofre,"
echo "   senao um 'apollo-op-env --forcar' desfaz esta migracao." 

# ⚠️ `sed -i` aqui é SEGURO (arquivo comum, não bind mount preso por inode como
# o Caddyfile) — mas preserva-se a permissão 600 explicitamente por garantia.
sed -i \
  -e "s|^MAIN_URL=.*|MAIN_URL=https://$NOVO_HOST|" \
  -e "s|^FRONTEND_URL=.*|FRONTEND_URL=https://$NOVO_HOST|" \
  -e "s|^NEXT_PUBLIC_BACKEND_URL=.*|NEXT_PUBLIC_BACKEND_URL=https://$NOVO_HOST/api|" \
  "$ENVF"
chmod 600 "$ENVF"

# Confere o EFEITO no arquivo, sem imprimir o resto dele.
for k in MAIN_URL FRONTEND_URL NEXT_PUBLIC_BACKEND_URL; do
  grep -q "^$k=https://$NOVO_HOST" "$ENVF" || falha "$k nao gravou em $ENVF (cópia intacta em $BKP)"
done
echo "== as tres URLs foram trocadas no .env =="

# ── Recriar o container ──────────────────────────────────────────────────────
# `restart` NÃO serve: env_file é lido na CRIAÇÃO do container, então um
# restart sobe o processo com as variáveis velhas e tudo parece ter dado certo.
# Recriar é seguro aqui: config e uploads estão em volumes nomeados.
echo "== recriando o container =="
cd "$DEP"
docker compose -f docker-compose.yml --env-file .env up -d --force-recreate postiz

# ── Conferir o efeito, não o exit code ──────────────────────────────────────
echo "== aguardando o app subir =="
i=0
while [ $i -lt 40 ]; do
  COD=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$NOVO_HOST/" || echo 000)
  [ "$COD" != "000" ] && [ "$COD" -lt 500 ] && break
  i=$((i+1)); sleep 10
done
# ⚠️ DEFEITO CONHECIDO E REPRODUTÍVEL deste stack: depois de um
# `up -d --force-recreate`, o pm2 marca o backend como "online" e NADA escuta
# na 3000. O contêiner ainda assim fica "healthy", porque o healthcheck prova
# a porta 5000 (o nginx interno). Um `restart` resolve. Visto em 03/set e três
# vezes em 26/out — por isso aqui é tentativa automática, não conselho.
if ! docker exec "$CTR" node -e "require('http').get('http://localhost:3000/',r=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null; then
  echo "== backend mudo apos o recreate (defeito conhecido) - reiniciando =="
  docker compose -f docker-compose.yml --env-file .env restart postiz >/dev/null 2>&1
  j=0
  while [ $j -lt 24 ]; do
    docker exec "$CTR" node -e "require('http').get('http://localhost:3000/',r=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null && break
    j=$((j+1)); sleep 5
  done
fi

[ "$i" -ge 40 ] && falha "o app nao voltou em ~7min. Rollback: cp -p $BKP $ENVF && docker compose up -d --force-recreate postiz"

echo "== variaveis em vigor no container =="
docker exec "$CTR" sh -c 'env | grep -E "^(MAIN_URL|FRONTEND_URL|NEXT_PUBLIC_BACKEND_URL)="'

# ⚠️ O healthcheck deste stack prova a porta 5000 (o Caddy interno), que sobe
# mesmo com o backend morto — foi assim que o app já ficou "healthy" e fora do
# ar em 03/set. Por isso aqui se prova o BACKEND na 3000, direto.
echo "== backend (porta 3000, o que o healthcheck nao ve) =="
docker exec "$CTR" node -e "require('http').get('http://localhost:3000/',r=>{console.log('   backend respondeu HTTP',r.statusCode);process.exit(0)}).on('error',e=>{console.log('   !! BACKEND MUDO:',e.message);process.exit(1)})" \
  || falha 'o backend nao respondeu. Um "docker compose restart postiz" costuma resolver (defeito conhecido do boot).'

echo
echo "OK. Falta o PASSO 4: trocar o bloco de $ANTIGO_HOST pelo redirect"
echo "    (ETAPA 2 de deploy/caddy-vhost.snippet), validar e recarregar o Caddy."
