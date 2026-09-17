#!/usr/bin/env bash
# Assemble le site statique de Blocs Ékole pour Netlify : ekole-site/blocs/ = build (ROOT=/blocs/).
# Usage : scripts/ekole-site.sh [--build]   (--build relance le build de production avant d'assembler)
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "${1:-}" = "--build" ]; then
  NODE_ENV=production ROOT=/blocs/ npx -y -p node@22 -- npm run build
fi
[ -f build/editor.html ] || { echo "❌ build/ absent : lancer avec --build" >&2; exit 1; }
rm -rf ekole-site && mkdir -p ekole-site/blocs
cp -R build/. ekole-site/blocs/
find ekole-site -name '*.map' -delete
# les pages de test du build amont ne sont pas publiées
rm -f ekole-site/blocs/embedtest.html ekole-site/blocs/embedtestbad.html
echo "✅ ekole-site/ prêt ($(du -sh ekole-site | cut -f1))"
