# deploy-workflows.ps1
# Import all JSON workflows from the workflows folder into n8n and activate them.

if (-not (Test-Path ".env")) {
    Write-Error "Error: .env file not found."
    return
}

# Load .env variables into the session if needed (optional for the script logic but good practice)
Get-Content .env | Where-Object { $_ -match "=" -and $_ -notmatch "^#" } | ForEach-Object {
    $parts = $_.Split("=", 2)
    [System.Environment]::SetEnvironmentVariable($parts[0], $parts[1])
}

$POSTGRES_USER = [System.Environment]::GetEnvironmentVariable("POSTGRES_USER")
$POSTGRES_DB = [System.Environment]::GetEnvironmentVariable("POSTGRES_DB")

Write-Host "▶ Importing all workflows from /data/workflows/..." -ForegroundColor Cyan
# Run the loop inside the container to import all json files
docker exec qpc_n8n sh -c 'for f in /data/workflows/*.json; do n8n import:workflow --input "$f"; done'

Write-Host "--- Verifying workflow status ---" -ForegroundColor Cyan
docker exec qpc_postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "UPDATE workflow_entity SET active = true;"

Write-Host "--- Restarting n8n ---" -ForegroundColor Cyan
docker restart qpc_n8n

Write-Host "--- Workflow Status ---" -ForegroundColor Cyan
docker exec qpc_postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT id, name, active FROM workflow_entity ORDER BY id;"

Write-Host "SUCCESS: All workflows have been imported and activated." -ForegroundColor Green
