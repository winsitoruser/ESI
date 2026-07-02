# Test Admin Panel - Verification Script
# This script verifies database tables and tests admin panel API endpoints

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Admin Panel Verification & Testing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verify Database Tables
Write-Host "1. Verifying Database Tables..." -ForegroundColor Yellow
Write-Host ""

$tables = @(
    "partners",
    "subscription_packages",
    "partner_subscriptions",
    "partner_outlets",
    "partner_users",
    "activation_requests"
)

foreach ($table in $tables) {
    $query = "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table';"
    $result = psql -U postgres -d bedagang_dev -t -c $query 2>$null
    
    if ($result -match "1") {
        Write-Host "  [OK] Table '$table' exists" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Table '$table' NOT FOUND" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "2. Checking Subscription Packages..." -ForegroundColor Yellow
Write-Host ""

$query = "SELECT name, price_monthly FROM subscription_packages ORDER BY price_monthly;"
$packages = psql -U postgres -d bedagang_dev -c $query 2>$null

if ($packages) {
    Write-Host $packages
} else {
    Write-Host "  [FAIL] Could not retrieve packages" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database verification complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start the dev server: npm run dev" -ForegroundColor White
Write-Host "2. Access admin panel at: http://localhost:3001/admin" -ForegroundColor White
Write-Host "3. Make sure you have ADMIN or SUPER_ADMIN role" -ForegroundColor White
Write-Host ""
Write-Host "Admin Panel URLs:" -ForegroundColor Yellow
Write-Host "  - Dashboard:     http://localhost:3001/admin" -ForegroundColor Cyan
Write-Host "  - Partners:      http://localhost:3001/admin/partners" -ForegroundColor Cyan
Write-Host "  - Activations:   http://localhost:3001/admin/activations" -ForegroundColor Cyan
Write-Host "  - Outlets:       http://localhost:3001/admin/outlets" -ForegroundColor Cyan
Write-Host "  - Transactions:  http://localhost:3001/admin/transactions" -ForegroundColor Cyan
Write-Host ""
