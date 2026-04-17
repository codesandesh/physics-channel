#!/usr/bin/env bash
# deploy-workflows.sh — import all 3 workflows and re-activate them
set -euo pipefail

source .env

echo "▶ Importing workflows..."
docker exec n8n n8n import:workflow --input //data/workflows/stage1-content-generation.json
docker exec n8n n8n import:workflow --input //data/workflows/stage2-manim-pipeline.json
docker exec n8n n8n import:workflow --input //data/workflows/stage3-assembly-pipeline.json

echo "▶ Activating all workflows in DB..."
docker exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "UPDATE workflow_entity SET active = true WHERE id IN ('physics-stage1-pipeline','yYw37H9rmiA2fDzG','physics-stage3-pipeline');"

echo "▶ Restarting n8n to pick up changes..."
docker restart n8n
docker start n8n

echo ""
echo "▶ Verifying..."
docker exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT id, name, active FROM workflow_entity ORDER BY id;"

echo ""
echo "✓ All workflows imported and active. Ready to trigger."
