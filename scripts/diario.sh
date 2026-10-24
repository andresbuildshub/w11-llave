#!/bin/zsh
# Pull diario SEGIAGUA → historial → reconstruir datos → commit + deploy. Cron 07:30 en la Mac de Andrés.
# Si la Mac está dormida, ese día se pierde (el criterio permite faltar ≤4 de 28 días).
export PATH="$HOME/.nvm/versions/node/v22.18.0/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
REPO="$HOME/crystal-ball/w11-llave"
cd "$REPO" || exit 1
NODE_PATH="$REPO/scripts/puller/node_modules" node scripts/pull_segiagua.cjs "$REPO" || exit 1
python3 scripts/build_data.py "$REPO" >/dev/null || exit 1
if [ -n "$(git status --porcelain data public/data)" ]; then
  git add data public/data && git commit -qm "pull diario SEGIAGUA $(date +%F)" && git push -q
  vercel deploy --prod --yes >/dev/null 2>&1
fi
