#!/usr/bin/env bash
# =============================================================================
# backup-media.sh — backup da instância do ApolloMedia (Postiz).
#
# Faz: dump do Postgres + uploads (volume uploads_data) + cópia do .env.
# O .env vai junto porque guarda JWT_SECRET, senha do banco e — quando a E2
# entregar — os SECRETS DOS APPS DE API DAS REDES. Sem ele o restore remonta
# um app que ninguém consegue logar e que perdeu as credenciais das redes.
#
# Uso:  backup-media.sh
#
# RESTORE (resumo):
#   gunzip -c db.sql.gz | docker exec -i apollo-media-db psql -U postiz -d postiz
#   docker run --rm -v apollo-media_uploads_data:/d -v $PWD:/b alpine tar xzf /b/uploads.tar.gz -C /d
#   cp env.bak /root/plan-secrets/apollo-media.env && docker compose -p apollo-media up -d
#
# ⚠️ O QUE NÃO É COPIADO, E POR QUÊ (é decisão, não esquecimento):
#   • REDIS — cache e fila efêmera. Restaurar fila velha reprocessaria
#     publicação já feita: pior que não ter.
#   • TEMPORAL (banco próprio + Elasticsearch) — é o motor de execução dos
#     agendamentos, e o estado durável de QUAIS posts existem e para quando
#     está no Postgres do Postiz. Restaurar workflows antigos do Temporal
#     contra um Postgres restaurado tentaria republicar o passado.
#     ⚠️ CONTRAPARTIDA A VALIDAR NA E2/E6: se o Temporal for restaurado vazio,
#     é preciso confirmar que o Postiz REAGENDA os posts futuros no boot. Se
#     não reagendar, o restore devolve um app que parece certo e não publica —
#     e aí este script precisa passar a copiar o Temporal também.
#
# NÃO para o stack: pg_dump é consistente por transação (snapshot MVCC) e os
# uploads são imutáveis. Mesmo raciocínio do backup-desk.sh e do backup-plane.sh.
# =============================================================================
set -euo pipefail

PROJ="${PROJ:-apollo-media}"
ENV_FILE="${ENV_FILE:-/root/plan-secrets/apollo-media.env}"
KEEP="${KEEP:-7}"
BACKUP_DIR="${BACKUP_DIR:-/root/backups-media}"
RCLONE_REMOTE="${RCLONE_REMOTE:-apollo-backup:apollo-backups/media}"
MIN_LIVRE_MB="${MIN_LIVRE_MB:-2048}"

[ -f "$ENV_FILE" ] || { echo "ERRO: $ENV_FILE nao existe"; exit 1; }

# ⚠️ NÃO usar "set -a; . .env": um .env de Compose não é script shell — um
# valor com `<` ou espaço vira redirecionamento e mata o backup inteiro.
envget(){ grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2-; }

DBC="${PROJ}-db"
PGUSER="$(envget POSTGRES_USER)"; PGUSER="${PGUSER:-postiz}"
PGDB="postiz"
PGPASS="$(envget POSTGRES_PASSWORD)"

STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/media-$STAMP"
log(){ echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "== backup $PROJ $STAMP =="

# 0/4 — guarda de espaço, ANTES de escrever qualquer coisa (lição de ago/2026,
# quando os backups do Nextcloud encheram a raiz e derrubaram serviço).
LIVRE_MB=$(df -Pm "$(dirname "$BACKUP_DIR")" | awk 'NR==2{print $4}')
if [ "$LIVRE_MB" -lt "$MIN_LIVRE_MB" ]; then
  log "!! ERRO: so ${LIVRE_MB}MB livres (minimo ${MIN_LIVRE_MB}MB). Abortando ANTES de escrever."
  exit 1
fi

mkdir -p "$OUT"

log "1/4 dump do Postgres ($DBC)..."
docker exec -e PGPASSWORD="$PGPASS" "$DBC" \
  pg_dump --no-owner --no-privileges -U "$PGUSER" -d "$PGDB" | gzip > "$OUT/db.sql.gz"
[ -s "$OUT/db.sql.gz" ] || { log "!! ERRO: dump vazio"; exit 1; }

# ⚠️ Conferir o EFEITO, não o exit code: um pipe com pg_dump sai 0 e grava .gz
# truncado. Sem este teste o erro só aparece no dia do restore.
log "2/4 verificando integridade do dump..."
gzip -t "$OUT/db.sql.gz" || { log "!! ERRO: db.sql.gz corrompido"; exit 1; }
TABELAS=$(gunzip -c "$OUT/db.sql.gz" | grep -c '^CREATE TABLE' || true)
if [ "$TABELAS" -lt 20 ]; then
  log "!! ERRO: dump com apenas $TABELAS tabelas (esperado ~40+). Backup suspeito."
  exit 1
fi
log "  ok: $TABELAS tabelas no dump"

log "3/4 uploads (volume ${PROJ}_uploads_data)..."
docker run --rm -v "${PROJ}_uploads_data":/d:ro -v "$OUT":/b alpine \
  tar czf /b/uploads.tar.gz -C /d . >/dev/null 2>&1 || log "  (aviso: volume de uploads vazio ou ausente)"

log "4/4 .env (segredos p/ remontar o stack)..."
cp "$ENV_FILE" "$OUT/env.bak"
chmod 600 "$OUT/env.bak"

ls -1dt "$BACKUP_DIR"/media-* 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -rf

log "== OK: $OUT ($(du -sh "$OUT" | cut -f1)) — mantendo os ultimos $KEEP =="

# OFF-SITE: falha aqui é ERRO (exit != 0), nunca aviso silencioso — foi o aviso
# silencioso que deixou a produção 2 dias sem cópia externa em agosto/2026.
if [ -z "$RCLONE_REMOTE" ]; then
  log "!! ATENCAO: off-site NAO configurado — este backup existe SO neste servidor."
  exit 0
fi
if ! command -v rclone >/dev/null 2>&1; then
  log "!! ERRO: RCLONE_REMOTE definido mas rclone NAO esta instalado."
  exit 1
fi
log "off-site: rclone copy -> $RCLONE_REMOTE/media-$STAMP"
if rclone copy "$OUT" "$RCLONE_REMOTE/media-$STAMP"; then
  log "off-site OK"
  rclone delete --min-age 31d "$RCLONE_REMOTE" --rmdirs >/dev/null 2>&1 || true
else
  log "!! ERRO: off-site FALHOU (destino $RCLONE_REMOTE). Backup existe SO no servidor."
  exit 1
fi
