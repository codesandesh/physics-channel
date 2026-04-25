# sync-workflow.ps1
# The "Developer Way" to sync n8n workflows with dynamic credentials

$envFile = ".env"
$workflowFile = "workflows/stage2-manim-pipeline.json"

if (-not (Test-Path $envFile)) {
    Write-Error "Error: .env file not found."
    return
}

# 1. Load GOOGLE_DRIVE_CREDENTIAL_ID from .env
$credId = Get-Content $envFile | Where-Object { $_ -match "^GOOGLE_DRIVE_CREDENTIAL_ID=" } | ForEach-Object { $_.Split("=")[1].Trim() }

if (-not $credId) {
    Write-Error "Error: GOOGLE_DRIVE_CREDENTIAL_ID not found in .env"
    return
}

Write-Host "Syncing workflow with Credential ID: $credId"

# 2. Read the workflow JSON
$json = Get-Content $workflowFile -Raw | ConvertFrom-Json

# 3. Update all googleDriveOAuth2Api credentials in the JSON
# We look for any node that has credentials -> googleDriveOAuth2Api
foreach ($node in $json.nodes) {
    if ($node.credentials.googleDriveOAuth2Api) {
        Write-Host "Updating node: $($node.name)"
        $node.credentials.googleDriveOAuth2Api.id = $credId
    }
}

# 4. Save the updated JSON back to the file
$json | ConvertTo-Json -Depth 100 | Set-Content $workflowFile

# 5. Import into n8n container
Write-Host "Importing into n8n..."
docker exec n8n n8n import:workflow --input=/data/workflows/stage2-manim-pipeline.json

Write-Host "Successfully synced and imported! 🚀"
