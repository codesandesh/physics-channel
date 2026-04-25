#!/usr/bin/env bash
# deploy-workflows.sh — import all JSON workflows from the workflows folder and activate them
set -euo pipefail

# Load environment variables
if [ -f .env ]; then
  source .env
else
  echo "Error: .env file not found."
  exit 1
fi

echo "▶ Importing all workflows from /data/workflows/..."
# Loop through all .json files in the mapped workflows directory
docker exec n8n sh -c 'for f in /data/workflows/*.json; do n8n import:workflow --input "$f"; done'

echo "▶ Activating all workflows in the database..."
# This SQL command sets all workflows to active. 
# If you only want to activate specific ones, you can adjust the WHERE clause.
docker exec qpc_postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "UPDATE workflow_entity SET active = true;"

echo "▶ Restarting n8n to pick up changes..."
docker restart qpc_n8n

echo ""
echo "▶ Verifying workflow status..."
docker exec qpc_postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT id, name, active FROM workflow_entity ORDER BY id;"

echo ""
echo "✓ All workflows from the workflows folder have been imported and activated."
