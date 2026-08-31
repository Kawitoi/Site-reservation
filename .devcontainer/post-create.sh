#!/usr/bin/env bash
# Runs once, when the Codespace/devcontainer is first created.
set -euo pipefail
cd /workspace

npm install

bash .devcontainer/wait-for-db.sh

npx prisma generate
npx prisma migrate deploy
npm run db:seed

echo ""
echo "TableFlow is ready. Run 'npm run dev' and open the forwarded port 3000."
echo "Demo login: demo@tableflow.local / demo12345"
