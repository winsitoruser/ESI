# Test Script for Modified Endpoints
# Testing all endpoints that had mockup fallback removed

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Modified Endpoints" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3001"
$results = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [string]$Body = $null
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    Write-Host "URL: $Url" -ForegroundColor Gray
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -UseBasicParsing -TimeoutSec 10
        } else {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -Body $Body -UseBasicParsing -TimeoutSec 10
        }
        
        $statusCode = $response.StatusCode
        $content = $response.Content | ConvertFrom-Json
        
        if ($statusCode -eq 200) {
            Write-Host "✅ SUCCESS - Status: $statusCode" -ForegroundColor Green
            
            # Check if response contains mock data indicators
            $contentStr = $response.Content
            if ($contentStr -match "mock|Mock|isMock|isFromMock") {
                Write-Host "⚠️  WARNING: Response may contain mock data!" -ForegroundColor Yellow
                $result = "WARNING - Contains mock indicators"
            } else {
                Write-Host "✅ No mock data detected" -ForegroundColor Green
                $result = "PASS"
            }
        } else {
            Write-Host "⚠️  Status: $statusCode" -ForegroundColor Yellow
            $result = "Status: $statusCode"
        }
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "❌ FAILED - Status: $statusCode" -ForegroundColor Red
        
        try {
            $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "Error: $($errorBody.error)" -ForegroundColor Red
            if ($errorBody.details) {
                Write-Host "Details: $($errorBody.details)" -ForegroundColor Gray
            }
            $result = "FAIL - $($errorBody.error)"
        } catch {
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
            $result = "FAIL - $($_.Exception.Message)"
        }
    }
    
    Write-Host ""
    
    return @{
        Name = $Name
        Url = $Url
        Result = $result
        Status = $statusCode
    }
}

# Test 1: Inventory Activities
$results += Test-Endpoint -Name "1. Inventory Activities" -Url "$baseUrl/api/inventory/activities?limit=5"

# Test 2: POS Dashboard Stats
$results += Test-Endpoint -Name "2. POS Dashboard Stats" -Url "$baseUrl/api/pos/dashboard-stats?period=7d"

# Test 3: Locations
$results += Test-Endpoint -Name "3. Locations API" -Url "$baseUrl/api/locations"

# Test 4: Sales Performance
$results += Test-Endpoint -Name "4. Sales Performance Analytics" -Url "$baseUrl/api/pos/analytics/sales-performance"

# Test 5: Shift Status (may require auth)
$results += Test-Endpoint -Name "5. POS Shift Status" -Url "$baseUrl/api/pos/shifts/status"

# Test 6: Invoice Detail (will likely return 404 or 401)
$results += Test-Endpoint -Name "6. Invoice Detail" -Url "$baseUrl/api/pos/invoices/test-invoice-123"

# Test 7: Inventory Stats
$results += Test-Endpoint -Name "7. Inventory Stats" -Url "$baseUrl/api/inventory/stats"

# Test 8: Products API
$results += Test-Endpoint -Name "8. Products API" -Url "$baseUrl/api/products?limit=5"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$passCount = ($results | Where-Object { $_.Result -eq "PASS" }).Count
$failCount = ($results | Where-Object { $_.Result -like "FAIL*" }).Count
$warnCount = ($results | Where-Object { $_.Result -like "WARNING*" }).Count

foreach ($result in $results) {
    $status = if ($result.Result -eq "PASS") { "[PASS]" } 
              elseif ($result.Result -like "FAIL*") { "[FAIL]" }
              elseif ($result.Result -like "WARNING*") { "[WARN]" }
              else { "[INFO]" }
    
    Write-Host "$status $($result.Name): $($result.Result)"
}

Write-Host ""
Write-Host "Total Tests: $($results.Count)" -ForegroundColor Cyan
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host "Warnings: $warnCount" -ForegroundColor Yellow
Write-Host ""
