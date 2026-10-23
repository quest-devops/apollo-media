#!/usr/bin/env bash
# =============================================================================
# ApolloMedia — remove TODO o dado de demonstração criado pelo seed-demo.sh.
#
# Existe porque a alternativa é pior: no ApolloDesk o dado de demonstração
# ficou na base depois da apresentação e virou pendência de limpeza. Todo seed
# nasce com o seu contrário.
#
# Só apaga o que tem id começando em `demo-` — dado real não é tocado.
#
# Uso:  bash limpa-demo.sh
# =============================================================================
set -euo pipefail

ENV_FILE=/root/plan-secrets/apollo-media.env
DB=apollo-media-db
APP=apollo-media-postiz

envget(){ grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2-; }
PGUSER="$(envget POSTGRES_USER)"
psql(){ docker exec -i "$DB" psql -U "$PGUSER" -d postiz -v ON_ERROR_STOP=1 "$@"; }

# ⚠️ A ORDEM IMPORTA: o schema do Postiz não tem ON DELETE CASCADE nessas FKs.
# Apagar Integration antes de Post falha com violação de chave estrangeira — a
# mesma pedra do prepara-lab.sh.
psql <<'SQL'
DELETE FROM "Post"        WHERE id LIKE 'demo-%';
DELETE FROM "Integration" WHERE id LIKE 'demo-%';
DELETE FROM "Media"       WHERE id LIKE 'demo-%';
SQL

docker exec "$APP" sh -c 'rm -rf /uploads/demo' || true

SOBROU=$(psql -tAc "SELECT
  (SELECT count(*) FROM \"Post\" WHERE id LIKE 'demo-%') +
  (SELECT count(*) FROM \"Integration\" WHERE id LIKE 'demo-%') +
  (SELECT count(*) FROM \"Media\" WHERE id LIKE 'demo-%');")
echo "== sobrou de demonstracao: $SOBROU =="
[ "$SOBROU" = "0" ] || { echo "!! ERRO: ainda ha dado de demonstracao na base"; exit 1; }
echo "== base limpa =="
