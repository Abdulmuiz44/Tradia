# PowerShell script to run database migration
param(
    [string]$MigrationFile = "database/migrations/003_fix_column_names.sql",
    [switch]$EnableFK,
    [switch]$FixRLS,
    [switch]$DisableRLS
)

if ($EnableFK) {
    $MigrationFile = "database/migrations/005_fix_foreign_key.sql"
    Write-Host "Enabling foreign key constraint..."
} elseif ($FixRLS) {
    $MigrationFile = "database/migrations/006_fix_rls.sql"
    Write-Host "Fixing RLS policies..."
} elseif ($DisableRLS) {
    $MigrationFile = "database/migrations/008_final_rls_fix.sql"
    Write-Host "Completely disabling RLS..."
}

Write-Host "Running migration: $MigrationFile"

# Check if migration file exists
if (!(Test-Path $MigrationFile)) {
    Write-Error "Migration file not found: $MigrationFile"
    exit 1
}

# Read the SQL content
$sql = Get-Content $MigrationFile -Raw

Write-Host "Migration SQL:"
Write-Host $sql
Write-Host ""

Write-Host "To run this migration:"
Write-Host "1. Go to your Supabase dashboard"
Write-Host "2. Navigate to the SQL Editor"
Write-Host "3. Copy and paste the SQL above"
Write-Host "4. Execute the query"
Write-Host ""
Write-Host "Alternatively, if you have Supabase CLI installed, you can run:"
Write-Host "supabase db push"
Write-Host ""
Write-Host ""
Write-Host "Usage:"
Write-Host "  .\run-migration.ps1                    # Run main migration (drops and recreates trades table)"
Write-Host "  .\run-migration.ps1 -EnableFK          # Enable foreign key constraint (run after main migration)"
Write-Host "  .\run-migration.ps1 -FixRLS            # Fix RLS policies (run if getting RLS errors)"
Write-Host "  .\run-migration.ps1 -DisableRLS        # Completely disable RLS (use if still getting errors)"
Write-Host ""
Write-Host "Migration ready to execute!"
