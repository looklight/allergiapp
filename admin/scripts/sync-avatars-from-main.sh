#!/usr/bin/env bash
# Sincronizza i PNG avatar da main:assets/avatars/ in admin/public/avatars/.
# Lanciare quando vengono aggiunti nuovi avatar al catalogo mobile.
#
# Uso: ./admin/scripts/sync-avatars-from-main.sh

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

if ! git rev-parse --verify main >/dev/null 2>&1; then
  echo "Errore: branch 'main' non trovato in locale. Esegui 'git fetch origin main:main'." >&2
  exit 1
fi

mkdir -p admin/public/avatars

count=0
for path in $(git ls-tree -r main --name-only -- assets/avatars/ | grep -E '\.png$'); do
  name=$(basename "$path")
  git show "main:$path" > "admin/public/avatars/$name"
  count=$((count + 1))
done

echo "Sincronizzati $count avatar in admin/public/avatars/."
