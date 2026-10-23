#!/bin/sh
# ApolloMedia / E1 — prova de isolamento entre organizações.
#
# A pergunta que precisa ser respondida ANTES de vender multi-tenant:
# com o token da Empresa A, é possível ler dados da Empresa B?
#
# O Postiz troca de organização por um HEADER (`showorg`) — quem diz qual
# organização a requisição enxerga é o CLIENTE, não a URL. Por isso o teste
# não é "A vê a tela dela": é "A pede a organização de B e o servidor recusa".
#
# ⚠️ DUAS ARMADILHAS desta bancada, ambas já pagas:
#   1. O curl roda num container efêmero: `-o /tmp/arquivo` grava DENTRO dele e
#      some. O corpo tem de vir por stdout — a v1 deste script "passou" sem
#      nunca ter lido resposta nenhuma.
#   2. Lista vazia NÃO É PROVA. Com as duas contas recém-criadas, todo endpoint
#      responde `[]` e o teste passa por vacuidade. Por isso aqui se PLANTA um
#      dado marcado na Empresa B antes de tentar lê-lo pela Empresa A.
#
# Uso: sh testa-isolamento.sh   (roda no servidor)
set -e
NET=apollo-media_default
BASE=http://apollo-media-postiz:5000/api
CURL="docker run --rm --network $NET curlimages/curl:latest -s"
MARCA="SEGREDO-DA-EMPRESA-B-NAO-PODE-VAZAR"

login() { # $1=email $2=senha -> cookie auth
  $CURL -i -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\",\"provider\":\"LOCAL\"}" \
    | grep -i "^set-cookie: auth=" | sed "s/^[Ss]et-[Cc]ookie: //" | cut -d';' -f1
}

echo "== login das duas contas de laboratorio =="
. /root/plan-secrets/apollo-media.env
CA=$(login "$LAB_A_EMAIL" "$LAB_A_PASSWORD")
CB=$(login "$LAB_B_EMAIL" "$LAB_B_PASSWORD")
[ -n "$CA" ] || { echo "A: FALHOU"; exit 1; }
[ -n "$CB" ] || { echo "B: FALHOU"; exit 1; }
echo "ok, dois cookies"

echo
echo "== organizacao de cada conta =="
ORG_A=$($CURL "$BASE/user/self" -H "Cookie: $CA" | sed 's/.*"orgId":"\([^"]*\)".*/\1/')
ORG_B=$($CURL "$BASE/user/self" -H "Cookie: $CB" | sed 's/.*"orgId":"\([^"]*\)".*/\1/')
echo "org A: $ORG_A"
echo "org B: $ORG_B"
[ "$ORG_A" = "$ORG_B" ] && { echo "!! FALHA GRAVE: mesma organizacao"; exit 1; }
echo "-> organizacoes distintas"

echo
echo "== plantando dado MARCADO na Empresa B =="
$CURL -o /dev/null -X POST "$BASE/posts/tags" -H "Content-Type: application/json" \
  -H "Cookie: $CB" -H "showorg: $ORG_B" -d "{\"name\":\"$MARCA\",\"color\":\"#ff0000\"}"
CONFIRMA=$($CURL "$BASE/posts/tags" -H "Cookie: $CB" -H "showorg: $ORG_B")
case "$CONFIRMA" in
  *"$MARCA"*) echo "ok - B enxerga a propria tag marcada" ;;
  *) echo "!! nao consegui plantar o dado em B - teste INVALIDO"; echo "$CONFIRMA" | head -c 300; exit 1 ;;
esac

echo
echo "== ATRAVESSAMENTO: token de A tentando ler a Empresa B =="
FALHOU=0
for rota in "posts/tags" "sets" "integrations/list" "integrations/customers" "media"; do
  RESP=$($CURL -w "|HTTP:%{http_code}" "$BASE/$rota" -H "Cookie: $CA" -H "showorg: $ORG_B" || true)
  COD=$(echo "$RESP" | sed 's/.*|HTTP:\([0-9]*\)$/\1/')
  CORPO=$(echo "$RESP" | sed 's/|HTTP:[0-9]*$//')
  VER="ok"
  case "$CORPO" in *"$MARCA"*) VER="<<<<< VAZAMENTO"; FALHOU=1 ;; esac
  case "$CORPO" in *"$ORG_B"*) VER="<<<<< VAZAMENTO (id da org de B na resposta)"; FALHOU=1 ;; esac
  echo "  $rota -> HTTP $COD  $VER"
  echo "      $(echo "$CORPO" | head -c 160)"
done

echo
echo "== CONTROLE POSITIVO: A na propria organizacao (tem de responder 200) =="
echo "  posts/tags -> $($CURL -o /dev/null -w '%{http_code}' "$BASE/posts/tags" -H "Cookie: $CA" -H "showorg: $ORG_A")"
echo "== CONTROLE NEGATIVO: token invalido (tem de ser 401) =="
echo "  user/self  -> $($CURL -o /dev/null -w '%{http_code}' "$BASE/user/self" -H "Cookie: auth=invalido")"

echo
[ "$FALHOU" = "0" ] && echo "VEREDITO: isolamento SUSTENTOU o atravessamento por header showorg" \
                    || echo "VEREDITO: ISOLAMENTO FUROU - NAO vender multi-tenant"
