#!/usr/bin/env bash
# Bump de versão semver do BeastMode — fonte única em js/app.js (APP_VERSION).
# Reescreve a constante + todos os ?v= de cache-bust no index.html + CHANGELOG.
# Uso: ./bump.sh [major|minor|patch] "mensagem do que mudou" [--tag]
#   patch = fix · minor = feature · major = redesign/quebra
set -euo pipefail
cd "$(dirname "$0")"

part="${1:-}"; msg="${2:-}"; tagflag="${3:-}"
case "$part" in
  major|minor|patch) ;;
  *) echo "uso: ./bump.sh [major|minor|patch] \"mensagem\" [--tag]"; exit 1 ;;
esac

cur=$(grep -oE "APP_VERSION = '[0-9]+\.[0-9]+\.[0-9]+'" js/app.js | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || true)
[ -z "$cur" ] && { echo "erro: APP_VERSION não encontrada em js/app.js"; exit 1; }
IFS=. read -r MA MI PA <<< "$cur"
case "$part" in
  major) MA=$((MA+1)); MI=0; PA=0 ;;
  minor) MI=$((MI+1)); PA=0 ;;
  patch) PA=$((PA+1)) ;;
esac
new="$MA.$MI.$PA"

# 1) constante (fonte única)
sed -i '' "s/APP_VERSION = '$cur'/APP_VERSION = '$new'/" js/app.js
# 2) cache-bust de todos os scripts (mesma string da versão)
sed -i '' "s/?v=$cur/?v=$new/g" index.html
# 3) changelog: insere a nova entrada logo acima da primeira "## v" (preserva o cabeçalho)
today=$(date +%Y-%m-%d)
tmp=$(mktemp)
if [ -f CHANGELOG.md ]; then
  header=$(awk '/^## v/{exit} {print}' CHANGELOG.md)
  body=$(awk 'f||/^## v/{f=1; print}' CHANGELOG.md)
else
  header="# Changelog"; body=""
fi
{
  printf '%s\n' "$header"
  echo
  echo "## v$new — $today"
  [ -n "$msg" ] && echo "- $msg"
  echo
  [ -n "$body" ] && printf '%s\n' "$body"
} > "$tmp"
mv "$tmp" CHANGELOG.md

echo "✓ $cur → $new"
echo "  js/app.js, index.html (?v=), CHANGELOG.md atualizados"

if [ "$tagflag" = "--tag" ]; then
  git add -u                                        # modificados/deletados já rastreados
  git add -A -- js css index.html CHANGELOG.md bump.sh supabase 2>/dev/null || true  # inclui arquivos NOVOS do app (js/novo.js não fica de fora do release)
  git commit -q -m "chore: release v$new${msg:+ — $msg}"
  git tag "v$new"
  echo "  commit + tag v$new criados (git push --tags pra enviar)"
else
  echo "  (rode com --tag pra commitar+tagear automático)"
fi
