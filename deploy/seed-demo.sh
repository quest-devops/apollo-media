#!/usr/bin/env bash
# =============================================================================
# ApolloMedia — dados de DEMONSTRAÇÃO para ver o produto com conteúdo.
#
# Cria canais, publicações na semana corrente e itens na biblioteca de mídia,
# na organização de laboratório. Serve para apresentar o produto e para
# enxergar a interface como o cliente vai ver — vazio, todo app parece quebrado.
#
# ⚠️ ISTO É DADO FALSO. Rode `limpa-demo.sh` antes de mostrar a um cliente de
# verdade ou de conectar contas reais. O ApolloDesk passou por isso: dado de
# demonstração esquecido na base virou pendência de limpeza.
#
# ⚠️ POR QUE OS CANAIS SÃO "DE MENTIRA" E ISSO É SEGURO
# Os canais recebem token 'demo-sem-valor', que NÃO autentica em rede nenhuma.
# As publicações criadas são PUBLISHED (no passado) e DRAFT (no futuro) —
# nenhum estado que o Temporal tente publicar. Se fossem QUEUE no futuro, o
# worker tentaria postar, falharia e encheria a tela de erro.
#
# Uso:  bash seed-demo.sh
# =============================================================================
set -euo pipefail

ENV_FILE=/root/plan-secrets/apollo-media.env
DB=apollo-media-db
APP=apollo-media-postiz

envget(){ grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2-; }
PGUSER="$(envget POSTGRES_USER)"
LAB_EMAIL="$(envget LAB_A_EMAIL)"

psql(){ docker exec -i "$DB" psql -U "$PGUSER" -d postiz -v ON_ERROR_STOP=1 "$@"; }

ORG=$(psql -tAc "SELECT o.id FROM \"Organization\" o
  JOIN \"UserOrganization\" uo ON uo.\"organizationId\" = o.id
  JOIN \"User\" u ON u.id = uo.\"userId\"
  WHERE u.email = '$LAB_EMAIL' LIMIT 1;")
[ -n "$ORG" ] || { echo "!! ERRO: nao achei a organizacao de $LAB_EMAIL"; exit 1; }
echo "organizacao de demonstracao: $ORG"

# --- 1. Canais -------------------------------------------------------------
# ⚠️ `picture` é a FOTO DE PERFIL DA CONTA, não o ícone da rede. O app já
# desenha o selo da plataforma por cima, no canto — usar o ícone da rede aqui
# faz aparecer "logo em cima de logo", que foi o que aconteceu na 1a versão
# deste seed. Numa conta real este campo traz a foto do cliente.
# ⚠️ `postingTimes` é o que faz a visão DIA existir. Ela não desenha uma grade
# de horas como a Semana: ela lista os HORÁRIOS DE PUBLICAÇÃO dos canais. Sem
# canal, a tela do Dia fica literalmente preta — não é bug, é a visão não ter
# nada para listar.
echo "--- canais"
psql <<SQL
INSERT INTO "Integration"
  (id, "internalId", "organizationId", name, picture, "providerIdentifier", type, token, "postingTimes", "createdAt", "updatedAt")
VALUES
  ('demo-ig', 'demo-ig', '$ORG', 'Apollo Solution', '/apollo-icone.svg', 'instagram', 'social', 'demo-sem-valor',
   '[{"time":540},{"time":780},{"time":1140}]', now(), now()),
  ('demo-fb', 'demo-fb', '$ORG', 'Apollo Solution', '/apollo-icone.svg', 'facebook', 'social', 'demo-sem-valor',
   '[{"time":600},{"time":1020}]', now(), now()),
  ('demo-li', 'demo-li', '$ORG', 'Apollo Solution', '/apollo-icone.svg', 'linkedin', 'social', 'demo-sem-valor',
   '[{"time":480},{"time":900}]', now(), now()),
  ('demo-x', 'demo-x', '$ORG', 'Apollo Solution', '/apollo-icone.svg', 'x', 'social', 'demo-sem-valor',
   '[{"time":660},{"time":1260}]', now(), now())
ON CONFLICT (id) DO UPDATE SET picture = EXCLUDED.picture;
SQL

# --- 2. Publicações da semana ---------------------------------------------
# Conteúdo em pt-BR, no tom da casa. Datas relativas a hoje para a semana
# sempre parecer viva, independentemente de quando o seed rodar.
echo "--- publicacoes"
psql <<SQL
INSERT INTO "Post" (id, state, "publishDate", "organizationId", "integrationId", content, "group", title, "createdAt", "updatedAt")
VALUES
  ('demo-p1', 'PUBLISHED', date_trunc('day', now()) - interval '2 day' + interval '9 hour',  '$ORG', 'demo-ig',
   '<p>Migrar para open-source não é economizar licença: é parar de alugar o seu próprio dado. 🚀 #ApolloSolution</p>', 'demo-g1', 'Migração open-source', now(), now()),
  ('demo-p2', 'PUBLISHED', date_trunc('day', now()) - interval '2 day' + interval '17 hour', '$ORG', 'demo-li',
   '<p>Como implantamos e-mail próprio, SSO e cofre de senhas para uma empresa de 40 pessoas em duas semanas — sem uma licença paga no meio.</p>', 'demo-g2', 'Case: 40 pessoas', now(), now()),
  ('demo-p3', 'PUBLISHED', date_trunc('day', now()) - interval '1 day' + interval '10 hour', '$ORG', 'demo-fb',
   '<p>Backup que ninguém testa não é backup — é esperança. Toda cópia da Apollo é verificada antes de contar como feita. ✅</p>', 'demo-g3', 'Backup verificado', now(), now()),
  ('demo-p4', 'PUBLISHED', date_trunc('day', now()) - interval '1 day' + interval '13 hour', '$ORG', 'demo-x',
   '<p>Dica: se o seu SSO custa por usuário, você está pagando para poder trocar de senha.</p>', 'demo-g4', 'SSO por usuário', now(), now()),
  ('demo-p5', 'PUBLISHED', date_trunc('day', now()) + interval '9 hour',                     '$ORG', 'demo-ig',
   '<p>Bastidor: hoje subiu mais um app da suíte Apollo. Rastreio, e-mail, nuvem, atendimento e agora redes sociais — tudo na mesma identidade.</p>', 'demo-g5', 'Novo app da suíte', now(), now()),
  ('demo-p6', 'DRAFT',     date_trunc('day', now()) + interval '1 day' + interval '11 hour',  '$ORG', 'demo-li',
   '<p>[rascunho] Série "o que roda na sua empresa": episódio 1 — quem realmente é dono do seu e-mail?</p>', 'demo-g6', 'Série: quem é dono', now(), now()),
  ('demo-p7', 'DRAFT',     date_trunc('day', now()) + interval '2 day' + interval '15 hour',  '$ORG', 'demo-fb',
   '<p>[rascunho] Comparativo honesto: o que se ganha e o que se perde ao sair de uma suíte proprietária.</p>', 'demo-g7', 'Comparativo honesto', now(), now()),
  ('demo-p8', 'DRAFT',     date_trunc('day', now()) + interval '3 day' + interval '10 hour',  '$ORG', 'demo-x',
   '<p>[rascunho] Thread: 6 armadilhas de implantação que só aparecem depois do go-live.</p>', 'demo-g8', 'Thread: armadilhas', now(), now())
ON CONFLICT (id) DO NOTHING;
SQL

# --- 3. Biblioteca de mídia ------------------------------------------------
# Os arquivos precisam existir no volume de uploads, senão a biblioteca mostra
# quadros quebrados — pior que biblioteca vazia.
echo "--- midia"
docker exec "$APP" sh -c 'mkdir -p /uploads/demo'
for par in "apollo-login-panel.webp:demo-nebulosa.webp" "apollo-lockup-verde.png:demo-lockup.png"; do
  origem="${par%%:*}"; destino="${par##*:}"
  docker exec "$APP" sh -c "cp /app/apps/frontend/public/$origem /uploads/demo/$destino"
done

psql <<SQL
INSERT INTO "Media" (id, name, "originalName", path, "organizationId", "fileSize", type, "createdAt", "updatedAt")
VALUES
  ('demo-m1', 'demo-nebulosa.webp', 'nebulosa-apollo.webp', '/uploads/demo/demo-nebulosa.webp', '$ORG', 210096, 'image', now(), now()),
  ('demo-m2', 'demo-lockup.png',    'lockup-apollomedia.png',    '/uploads/demo/demo-lockup.png',    '$ORG', 24000,  'image', now(), now())
ON CONFLICT (id) DO NOTHING;
SQL

# --- Conferir o EFEITO, não o exit code ------------------------------------
CANAIS=$(psql -tAc "SELECT count(*) FROM \"Integration\" WHERE id LIKE 'demo-%' AND \"organizationId\"='$ORG';")
POSTS=$(psql -tAc "SELECT count(*) FROM \"Post\" WHERE id LIKE 'demo-%' AND \"organizationId\"='$ORG';")
MIDIA=$(psql -tAc "SELECT count(*) FROM \"Media\" WHERE id LIKE 'demo-%' AND \"organizationId\"='$ORG';")
echo "== canais: $CANAIS | publicacoes: $POSTS | midia: $MIDIA =="
[ "$CANAIS" -ge 4 ] && [ "$POSTS" -ge 8 ] || { echo "!! ERRO: o seed nao gravou o esperado"; exit 1; }
echo "== OK — lembre de rodar limpa-demo.sh antes de uso real =="
