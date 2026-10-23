#!/bin/sh
# ApolloMedia — gera o .env real com segredos criados NO SERVIDOR e o aponta
# por symlink. Idempotente: se o arquivo já existe, não regenera (regenerar o
# JWT_SECRET invalidaria todas as sessões).
set -e
SEC=/root/plan-secrets/apollo-media.env
DEP=/root/apollo-media/deploy

if [ ! -f "$SEC" ]; then
  PG=$(openssl rand -hex 24)
  TP=$(openssl rand -hex 24)
  JW=$(openssl rand -hex 32)
  sed -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$PG|" -e "s|^TEMPORAL_POSTGRES_PASSWORD=.*|TEMPORAL_POSTGRES_PASSWORD=$TP|" -e "s|^JWT_SECRET=.*|JWT_SECRET=$JW|" "$DEP/.env.example" > "$SEC"
  chmod 600 "$SEC"
  echo "criado $SEC"
else
  echo "$SEC ja existia - preservado"
fi

ln -sf "$SEC" "$DEP/.env"
# confere sem imprimir valor nenhum
for k in POSTGRES_PASSWORD TEMPORAL_POSTGRES_PASSWORD JWT_SECRET; do
  n=$(grep "^$k=" "$SEC" | cut -d= -f2 | tr -d '\n' | wc -c)
  echo "$k: $n caracteres"
done
