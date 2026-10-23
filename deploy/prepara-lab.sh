#!/bin/sh
# ApolloMedia / E1 — cria (ou recria) as DUAS contas de laboratório usadas pela
# prova de isolamento, com senhas aleatórias guardadas no cofre de segredos.
#
# Por que existe: o repo apollo-media é PÚBLICO por obrigação do §13 do AGPL.
# Senha de laboratório em texto claro dentro do script iria junto para o mundo.
# Aqui a senha nasce no servidor, mora em /root/plan-secrets/apollo-media.env
# (600) e o teste a lê de lá.
#
# ⚠️ Exige DISABLE_REGISTRATION=false no compose enquanto roda. Fechar depois.
set -e
SEC=/root/plan-secrets/apollo-media.env
NET=apollo-media_default
BASE=http://apollo-media-postiz:5000/api
CURL="docker run --rm --network $NET curlimages/curl:latest -s"

if ! grep -q "^LAB_A_PASSWORD=" "$SEC"; then
  { echo ""; echo "# --- contas de laboratorio da prova de isolamento (E1) ---";
    echo "LAB_A_EMAIL=lab-a@apollosolution.com.br";
    echo "LAB_A_PASSWORD=$(openssl rand -base64 18)aA1!";
    echo "LAB_B_EMAIL=lab-b@apollosolution.com.br";
    echo "LAB_B_PASSWORD=$(openssl rand -base64 18)bB2!"; } >> "$SEC"
  echo "senhas de laboratorio geradas no cofre"
fi

. "$SEC"

# Apaga as contas antigas para recriar limpas.
# ⚠️ A ORDEM IMPORTA: o schema do Postiz não tem ON DELETE CASCADE nessas FKs.
# Apagar Organization/User direto falha com violação de chave estrangeira
# (Tags_orgId_fkey, UserOrganization_userId_fkey) — e falha em voz alta, o que
# aqui é sorte: com `|| true` engolindo o erro, o registro seguinte devolve
# "Email already exists" e o teste roda com as contas VELHAS sem ninguém notar.
cat > /tmp/apollo-media-limpa-lab.sql <<SQL
DELETE FROM "Tags" WHERE "orgId" IN (SELECT "organizationId" FROM "UserOrganization" WHERE "userId" IN (SELECT id FROM "User" WHERE email IN ('$LAB_A_EMAIL','$LAB_B_EMAIL')));
DELETE FROM "UserOrganization" WHERE "userId" IN (SELECT id FROM "User" WHERE email IN ('$LAB_A_EMAIL','$LAB_B_EMAIL'));
DELETE FROM "Organization" WHERE id NOT IN (SELECT "organizationId" FROM "UserOrganization");
DELETE FROM "User" WHERE email IN ('$LAB_A_EMAIL','$LAB_B_EMAIL');
SQL
docker exec -i apollo-media-db psql -U "$POSTGRES_USER" -d postiz -v ON_ERROR_STOP=1 < /tmp/apollo-media-limpa-lab.sql
rm -f /tmp/apollo-media-limpa-lab.sql

registra() { # $1=email $2=senha $3=empresa
  $CURL -X POST "$BASE/auth/register" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\",\"company\":\"$3\",\"provider\":\"LOCAL\"}"
  echo " <- $3"
}
registra "$LAB_A_EMAIL" "$LAB_A_PASSWORD" "Empresa A (lab)"
registra "$LAB_B_EMAIL" "$LAB_B_PASSWORD" "Empresa B (lab)"
