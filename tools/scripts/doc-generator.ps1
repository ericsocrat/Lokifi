# Documentation Generator Script
# Phase 1.5.7: Automated Documentation Generation
# Generated: October 14, 2025

<#
.SYNOPSIS
    Automated documentation generation for tests, APIs, and components

.DESCRIPTION
    This script provides functions to auto-generate documentation from code:
    - New-TestDocumentation: Generate test catalog from test files
    - New-APIDocumentation: Generate API reference from backend code
    - New-ComponentDocumentation: Generate component catalog from React components
    - Invoke-TypeDocGeneration: Run TypeDoc for API reference

.EXAMPLE
    New-TestDocumentation -Type all
    New-APIDocumentation -Format markdown
    New-ComponentDocumentation -IncludeProps -IncludeExamples
    Invoke-TypeDocGeneration

.NOTES
    Part of Lokifi Test Intelligence System - Phase 1.5.7
#>

function New-TestDocumentation {
    <#
    .SYNOPSIS
        Generate test documentation from test files
    
    .PARAMETER TestPath
        Path to test directory (default: apps/frontend/tests)
    
    .PARAMETER OutputPath
        Path to output documentation (default: docs/testing)
    
    .PARAMETER Type
        Type of tests to document: all, unit, integration, e2e, security
    
    .EXAMPLE
        New-TestDocumentation -Type all
        New-TestDocumentation -Type security
    #>
    param(
        [string]$TestPath = "apps/frontend/tests",
        [string]$OutputPath = "docs/testing",
        [ValidateSet('all', 'unit', 'integration', 'e2e', 'security')]
        [string]$Type = 'all'
    )
    
    Write-Host ""
    Write-Host "📚 Generating Test Documentation..." -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Green
    
    # Ensure output directory exists
    if (-not (Test-Path $OutputPath)) {
        New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
        Write-Host "✅ Created output directory: $OutputPath" -ForegroundColor Green
    }
    
    # Get test files based on type
    $testFiles = @()
    if ($Type -eq 'all') {
        $testFiles = Get-ChildItem -Path $TestPath -Recurse -Filter "*.test.ts*" -File
    } else {
        switch ($Type) {
            'unit' { $testFiles = Get-ChildItem -Path "$TestPath/unit" -Recurse -Filter "*.test.ts*" -File -ErrorAction SilentlyContinue }
            'integration' { $testFiles = Get-ChildItem -Path "$TestPath/integration" -Recurse -Filter "*.test.ts*" -File -ErrorAction SilentlyContinue }
            'e2e' { $testFiles = Get-ChildItem -Path "$TestPath/e2e" -Recurse -Filter "*.test.ts*" -File -ErrorAction SilentlyContinue }
            'security' { $testFiles = Get-ChildItem -Path "$TestPath/security" -Recurse -Filter "*.security.test.ts" -File -ErrorAction SilentlyContinue }
        }
    }
    
    if ($testFiles.Count -eq 0) {
        Write-Host "⚠️  No test files found for type: $Type" -ForegroundColor Yellow
        return
    }
    
    Write-Host "📂 Found $($testFiles.Count) test file(s)" -ForegroundColor Cyan
    
    # Parse test files and extract test structure
    $testCatalog = @{
        generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        type = $Type
        totalFiles = $testFiles.Count
        totalTests = 0
        suites = @()
    }
    
    foreach ($file in $testFiles) {
        Write-Host "   Parsing: $($file.Name)" -ForegroundColor Gray
        
        $content = Get-Content $file.FullName -Raw
        $relativePath = $file.FullName -replace [regex]::Escape((Get-Location).Path), ""
        $relativePath = $relativePath.TrimStart('\', '/')
        
        # Extract describe blocks (test suites)
        $describePattern = 'describe\(["'']([^"'']+)["'']'
        $describeMatches = [regex]::Matches($content, $describePattern)
        
        # Extract it/test blocks (individual tests)
        $itPattern = '(?:it|test)\(["'']([^"'']+)["'']'
        $itMatches = [regex]::Matches($content, $itPattern)
        
        $suite = @{
            file = $file.Name
            path = $relativePath
            describes = @($describeMatches | ForEach-Object { $_.Groups[1].Value })
            tests = @($itMatches | ForEach-Object { $_.Groups[1].Value })
            testCount = $itMatches.Count
        }
        
        $testCatalog.suites += $suite
        $testCatalog.totalTests += $suite.testCount
    }
    
    # Generate markdown documentation
    $markdown = @"
# Test Documentation - $($Type.ToUpper())

**Generated:** $($testCatalog.generatedAt)  
**Type:** $Type  
**Files:** $($testCatalog.totalFiles)  
**Tests:** $($testCatalog.totalTests)

---

## 📊 Summary

This document provides an overview of all tests in the project.

- **Total Test Files:** $($testCatalog.totalFiles)
- **Total Test Cases:** $($testCatalog.totalTests)
- **Average Tests per File:** $([math]::Round($testCatalog.totalTests / $testCatalog.totalFiles, 2))

---

## 📋 Test Catalog

"@
    
    foreach ($suite in $testCatalog.suites) {
        $markdown += @"

### 🧪 $($suite.file)

**Path:** ``$($suite.path)``  
**Test Count:** $($suite.testCount)

"@
        
        if ($suite.describes.Count -gt 0) {
            $markdown += "**Test Suites:**`n"
            foreach ($describe in $suite.describes) {
                $markdown += "- $describe`n"
            }
            $markdown += "`n"
        }
        
        if ($suite.tests.Count -gt 0) {
            $markdown += "**Tests:**`n"
            foreach ($test in $suite.tests) {
                $markdown += "- ✓ $test`n"
            }
            $markdown += "`n"
        }
    }
    
    # Add coverage information if available
    $coveragePath = "apps/frontend/coverage/coverage-summary.json"
    if (Test-Path $coveragePath) {
        $markdown += @"

---

## 📈 Coverage Information

"@
        try {
            $coverage = Get-Content $coveragePath -Raw | ConvertFrom-Json
            $totalCoverage = $coverage.total
            
            $markdown += @"
**Overall Coverage:**

| Metric | Percentage | Covered/Total |
|--------|-----------|---------------|
| Statements | $($totalCoverage.statements.pct)% | $($totalCoverage.statements.covered)/$($totalCoverage.statements.total) |
| Branches | $($totalCoverage.branches.pct)% | $($totalCoverage.branches.covered)/$($totalCoverage.branches.total) |
| Functions | $($totalCoverage.functions.pct)% | $($totalCoverage.functions.covered)/$($totalCoverage.functions.total) |
| Lines | $($totalCoverage.lines.pct)% | $($totalCoverage.lines.covered)/$($totalCoverage.lines.total) |

"@
        } catch {
            $markdown += "Coverage data available but could not be parsed.`n`n"
        }
    }
    
    $markdown += @"

---

## 🚀 Quick Commands

``````bash
# Run all tests
npm run test

# Run specific test type
npm run test tests/$Type

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
``````

---

**Generated by Lokifi Documentation System**  
*Keeping your docs fresh and accurate* 📚✨

"@
    
    # Write to file
    $outputFile = Join-Path $OutputPath "TEST_CATALOG_$($Type.ToUpper()).md"
    $markdown | Set-Content $outputFile -Encoding UTF8
    
    Write-Host ""
    Write-Host "✅ Test documentation generated!" -ForegroundColor Green
    Write-Host "📍 Location: $outputFile" -ForegroundColor Cyan
    Write-Host "📊 Documented $($testCatalog.totalTests) tests from $($testCatalog.totalFiles) files" -ForegroundColor White
    Write-Host ""
    
    return $outputFile
}

function New-APIDocumentation {
    <#
    .SYNOPSIS
        Generate API documentation from backend code
    
    .PARAMETER APIPath
        Path to API directory (default: apps/backend/app)
    
    .PARAMETER OutputPath
        Path to output documentation (default: docs/api)
    
    .PARAMETER Format
        Output format: markdown, openapi, html
    
    .EXAMPLE
        New-APIDocumentation -Format markdown
        New-APIDocumentation -Format openapi
    #>
    param(
        [string]$APIPath = "apps/backend/app",
        [string]$OutputPath = "docs/api",
        [ValidateSet('markdown', 'openapi', 'html')]
        [string]$Format = 'markdown'
    )
    
    Write-Host ""
    Write-Host "🌐 Generating API Documentation..." -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Green
    
    # Check if backend exists
    if (-not (Test-Path $APIPath)) {
        Write-Host "⚠️  Backend API path not found: $APIPath" -ForegroundColor Yellow
        Write-Host "💡 Creating placeholder documentation..." -ForegroundColor Cyan
        
        # Create output directory
        if (-not (Test-Path $OutputPath)) {
            New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
        }
        
        # Create placeholder documentation
        $placeholder = @"
# API Documentation

**Status:** 🚧 Backend API not yet implemented  
**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

---

## 📋 Planned Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token

### User Management
- `GET /api/users/me` - Get current user
- `PUT /api/users/me` - Update current user
- `GET /api/users/{id}` - Get user by ID

### Data Endpoints
- `GET /api/data` - Get all data
- `GET /api/data/{id}` - Get data by ID
- `POST /api/data` - Create new data
- `PUT /api/data/{id}` - Update data
- `DELETE /api/data/{id}` - Delete data

---

## 🔐 Authentication

All endpoints (except `/auth/*`) require authentication via JWT token:

``````
Authorization: Bearer <token>
``````

---

## 📝 Common Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

---

**Generated by Lokifi Documentation System**  
*API documentation will be generated once backend is implemented* 🌐✨

"@
        
        $outputFile = Join-Path $OutputPath "API_REFERENCE.md"
        $placeholder | Set-Content $outputFile -Encoding UTF8
        
        Write-Host "✅ Placeholder API documentation created!" -ForegroundColor Green
        Write-Host "📍 Location: $outputFile" -ForegroundColor Cyan
        Write-Host ""
        
        return $outputFile
    }
    
    # Ensure output directory exists
    if (-not (Test-Path $OutputPath)) {
        New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
    }
    
    # Scan for Python API files
    $apiFiles = Get-ChildItem -Path $APIPath -Recurse -Filter "*.py" -File | Where-Object { $_.Name -notmatch '__pycache__|__init__' }
    
    Write-Host "📂 Found $($apiFiles.Count) API file(s)" -ForegroundColor Cyan
    
    # Parse API files for FastAPI routes
    $endpoints = @()
    
    foreach ($file in $apiFiles) {
        Write-Host "   Parsing: $($file.Name)" -ForegroundColor Gray
        
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        
        # Skip empty files
        if (-not $content) {
            continue
        }
        
        # Extract FastAPI route decorators
        $routePattern = '@(?:router|app)\.(get|post|put|delete|patch)\(["'']([^"'']+)["'']'
        $routeMatches = [regex]::Matches($content, $routePattern)
        
        foreach ($match in $routeMatches) {
            $endpoints += @{
                method = $match.Groups[1].Value.ToUpper()
                path = $match.Groups[2].Value
                file = $file.Name
            }
        }
    }
    
    # Generate markdown documentation
    $markdown = @"
# API Reference

**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Format:** $Format  
**Endpoints:** $($endpoints.Count)

---

## 📋 API Endpoints

"@
    
    if ($endpoints.Count -gt 0) {
        # Group endpoints by HTTP method
        $groupedEndpoints = $endpoints | Group-Object method
        
        foreach ($group in $groupedEndpoints) {
            $markdown += "`n### $($group.Name) Requests`n`n"
            
            foreach ($endpoint in $group.Group) {
                $markdown += "- **$($endpoint.method)** ``$($endpoint.path)```n"
                $markdown += "  - Source: ``$($endpoint.file)```n"
            }
        }
    } else {
        $markdown += "`n*No endpoints found*`n"
    }
    
    $markdown += @"

---

## 🔐 Authentication

Most endpoints require authentication. Include your access token in the request headers:

``````
Authorization: Bearer <your_access_token>
``````

---

## 📝 Response Format

All API responses follow this format:

``````json
{
  "success": true,
  "data": { ... },
  "message": "Success message",
  "timestamp": "2025-10-14T09:30:00Z"
}
``````

---

## 🚦 Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |

---

**Generated by Lokifi Documentation System**  
*Auto-generated from backend source code* 🌐✨

"@
    
    # Write to file
    $outputFile = Join-Path $OutputPath "API_REFERENCE.md"
    $markdown | Set-Content $outputFile -Encoding UTF8
    
    Write-Host ""
    Write-Host "✅ API documentation generated!" -ForegroundColor Green
    Write-Host "📍 Location: $outputFile" -ForegroundColor Cyan
    Write-Host "📊 Documented $($endpoints.Count) endpoint(s)" -ForegroundColor White
    Write-Host ""
    
    return $outputFile
}

function New-ComponentDocumentation {
    <#
    .SYNOPSIS
        Generate component documentation from React components
    
    .PARAMETER ComponentPath
        Path to components directory (default: apps/frontend/src/components)
    
    .PARAMETER OutputPath
        Path to output documentation (default: docs/components)
    
    .PARAMETER IncludeProps
        Include component props documentation
    
    .PARAMETER IncludeExamples
        Include usage examples
    
    .EXAMPLE
        New-ComponentDocumentation -IncludeProps -IncludeExamples
    #>
    param(
        [string]$ComponentPath = "apps/frontend/src/components",
        [string]$OutputPath = "docs/components",
        [switch]$IncludeProps,
        [switch]$IncludeExamples
    )
    
    Write-Host ""
    Write-Host "🎨 Generating Component Documentation..." -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Green
    
    # Ensure output directory exists
    if (-not (Test-Path $OutputPath)) {
        New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
        Write-Host "✅ Created output directory: $OutputPath" -ForegroundColor Green
    }
    
    # Check if component directory exists
    if (-not (Test-Path $ComponentPath)) {
        Write-Host "⚠️  Component path not found: $ComponentPath" -ForegroundColor Yellow
        Write-Host "💡 Creating placeholder documentation..." -ForegroundColor Cyan
        
        $placeholder = @"
# Component Documentation

**Status:** 🚧 Components not yet organized  
**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

---

## 📋 Component Organization

Components should be organized as follows:

``````
src/components/
├── common/          # Shared components
│   ├── Button/
│   ├── Input/
│   └── Modal/
├── layout/          # Layout components
│   ├── Header/
│   ├── Footer/
│   └── Sidebar/
└── features/        # Feature-specific components
    ├── auth/
    ├── dashboard/
    └── settings/
``````

---

## 🎯 Component Structure

Each component should include:

1. **Component file** (`.tsx`)
2. **Type definitions** (`.types.ts` or inline)
3. **Styles** (CSS modules or styled-components)
4. **Tests** (`tests/unit/components/`)
5. **Stories** (Storybook - optional)

---

## 📝 Prop Documentation

Use TypeScript interfaces and JSDoc comments:

``````typescript
interface ButtonProps {
  /** Button label text */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Button variant */
  variant?: 'primary' | 'secondary';
  /** Disabled state */
  disabled?: boolean;
}
``````

---

**Generated by Lokifi Documentation System**  
*Component documentation will be generated once components are organized* 🎨✨

"@
        
        $outputFile = Join-Path $OutputPath "COMPONENT_CATALOG.md"
        $placeholder | Set-Content $outputFile -Encoding UTF8
        
        Write-Host "✅ Placeholder component documentation created!" -ForegroundColor Green
        Write-Host "📍 Location: $outputFile" -ForegroundColor Cyan
        Write-Host ""
        
        return $outputFile
    }
    
    # Scan for React components
    $componentFiles = Get-ChildItem -Path $ComponentPath -Recurse -Filter "*.tsx" -File | Where-Object { $_.Name -notmatch '\.test\.|\.spec\.' }
    
    if ($componentFiles.Count -eq 0) {
        Write-Host "⚠️  No component files found" -ForegroundColor Yellow
        return
    }
    
    Write-Host "📂 Found $($componentFiles.Count) component file(s)" -ForegroundColor Cyan
    
    # Parse components
    $components = @()
    
    foreach ($file in $componentFiles) {
        Write-Host "   Parsing: $($file.Name)" -ForegroundColor Gray
        
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        
        # Skip empty files
        if (-not $content) {
            continue
        }
        
        $relativePath = $file.FullName -replace [regex]::Escape((Get-Location).Path), ""
        $relativePath = $relativePath.TrimStart('\', '/')
        
        # Extract component name
        $componentName = $file.BaseName
        
        # Extract props interface if IncludeProps
        $props = @()
        if ($IncludeProps) {
            $interfacePattern = "interface\s+$($componentName)Props\s*\{([^}]+)\}"
            $interfaceMatch = [regex]::Match($content, $interfacePattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
            
            if ($interfaceMatch.Success) {
                $propsContent = $interfaceMatch.Groups[1].Value
                $propPattern = '(?:\/\*\*\s*([^*]+)\s*\*\/)?\s*(\w+)\??\s*:\s*([^;]+)'
                $propMatches = [regex]::Matches($propsContent, $propPattern)
                
                foreach ($propMatch in $propMatches) {
                    $props += @{
                        description = $propMatch.Groups[1].Value.Trim()
                        name = $propMatch.Groups[2].Value.Trim()
                        type = $propMatch.Groups[3].Value.Trim()
                    }
                }
            }
        }
        
        $components += @{
            name = $componentName
            file = $file.Name
            path = $relativePath
            props = $props
        }
    }
    
    # Generate markdown documentation
    $markdown = @"
# Component Catalog

**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Components:** $($components.Count)

---

## 📋 Component List

"@
    
    foreach ($component in $components) {
        $markdown += @"

### 🎨 $($component.name)

**File:** ``$($component.file)``  
**Path:** ``$($component.path)``

"@
        
        if ($IncludeProps -and $component.props.Count -gt 0) {
            $markdown += "`n**Props:**`n`n"
            $markdown += "| Prop | Type | Description |`n"
            $markdown += "|------|------|-------------|`n"
            
            foreach ($prop in $component.props) {
                $description = if ($prop.description) { $prop.description } else { "-" }
                $markdown += "| ``$($prop.name)`` | ``$($prop.type)`` | $description |`n"
            }
            
            $markdown += "`n"
        }
        
        if ($IncludeExamples) {
            $markdown += @"
**Usage:**

``````tsx
import { $($component.name) } from '@/components/...'

function Example() {
  return <$($component.name) />
}
``````

"@
        }
    }
    
    $markdown += @"

---

## 🚀 Quick Commands

``````bash
# Run component tests
npm run test tests/unit/components

# Start Storybook (if configured)
npm run storybook

# Type check components
npm run type-check
``````

---

**Generated by Lokifi Documentation System**  
*Auto-generated from React components* 🎨✨

"@
    
    # Write to file
    $outputFile = Join-Path $OutputPath "COMPONENT_CATALOG.md"
    $markdown | Set-Content $outputFile -Encoding UTF8
    
    Write-Host ""
    Write-Host "✅ Component documentation generated!" -ForegroundColor Green
    Write-Host "📍 Location: $outputFile" -ForegroundColor Cyan
    Write-Host "📊 Documented $($components.Count) component(s)" -ForegroundColor White
    Write-Host ""
    
    return $outputFile
}

function Invoke-TypeDocGeneration {
    <#
    .SYNOPSIS
        Generate TypeDoc API reference documentation
    
    .PARAMETER SourcePath
        Path to source code (default: apps/frontend/src/lib)
    
    .PARAMETER OutputPath
        Path to output documentation (default: docs/api-reference)
    
    .PARAMETER Watch
        Enable watch mode for live updates
    
    .EXAMPLE
        Invoke-TypeDocGeneration
        Invoke-TypeDocGeneration -Watch
    #>
    param(
        [string]$SourcePath = "apps/frontend/src/lib",
        [string]$OutputPath = "docs/api-reference",
        [switch]$Watch
    )
    
    Write-Host ""
    Write-Host "📖 Generating TypeDoc Documentation..." -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Green
    
    # Check if TypeDoc is installed
    $typedocInstalled = $false
    try {
        $null = npx typedoc --version 2>&1
        $typedocInstalled = $true
    } catch {
        Write-Host "⚠️  TypeDoc not found" -ForegroundColor Yellow
    }
    
    if (-not $typedocInstalled) {
        Write-Host "💡 Installing TypeDoc..." -ForegroundColor Cyan
        npm install --save-dev typedoc
    }
    
    # Check if source path exists
    if (-not (Test-Path $SourcePath)) {
        Write-Host "⚠️  Source path not found: $SourcePath" -ForegroundColor Yellow
        Write-Host "💡 Creating placeholder..." -ForegroundColor Cyan
        
        if (-not (Test-Path $OutputPath)) {
            New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
        }
        
        $placeholder = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Reference - Lokifi</title>
    <style>
        body { font-family: system-ui; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #0066cc; }
        .info { background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>📖 API Reference</h1>
    <div class="info">
        <h2>🚧 Documentation Not Yet Generated</h2>
        <p><strong>Generated:</strong> $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")</p>
        <p>TypeDoc documentation will be generated once the library code is organized.</p>
        <h3>To generate documentation:</h3>
        <pre>npm install --save-dev typedoc
npx typedoc --out $OutputPath $SourcePath</pre>
    </div>
</body>
</html>
"@
        
        $placeholderFile = Join-Path $OutputPath "index.html"
        $placeholder | Set-Content $placeholderFile -Encoding UTF8
        
        Write-Host "✅ Placeholder created!" -ForegroundColor Green
        Write-Host "📍 Location: $placeholderFile" -ForegroundColor Cyan
        Write-Host ""
        
        return $placeholderFile
    }
    
    # Generate TypeDoc config if it doesn't exist
    $configPath = "apps/frontend/typedoc.json"
    if (-not (Test-Path $configPath)) {
        Write-Host "📝 Creating TypeDoc configuration..." -ForegroundColor Cyan
        
        $config = @{
            entryPoints = @("src/lib")
            out = "../../$OutputPath"
            exclude = @("**/*.test.ts", "**/*.test.tsx", "**/node_modules/**")
            excludePrivate = $true
            excludeProtected = $false
            plugin = @()
            theme = "default"
            name = "Lokifi API Reference"
            includeVersion = $true
        } | ConvertTo-Json -Depth 10
        
        $config | Set-Content $configPath -Encoding UTF8
        Write-Host "✅ Created typedoc.json" -ForegroundColor Green
    }
    
    # Run TypeDoc
    Write-Host "🔨 Running TypeDoc..." -ForegroundColor Cyan
    Push-Location "apps/frontend"
    
    try {
        if ($Watch) {
            Write-Host "👀 Starting watch mode (Ctrl+C to stop)..." -ForegroundColor Yellow
            npx typedoc --watch
        } else {
            npx typedoc
            Write-Host ""
            Write-Host "✅ TypeDoc documentation generated!" -ForegroundColor Green
            Write-Host "📍 Location: $OutputPath" -ForegroundColor Cyan
            Write-Host ""
        }
    } catch {
        Write-Host "❌ TypeDoc generation failed: $_" -ForegroundColor Red
    } finally {
        Pop-Location
    }
    
    return (Join-Path $OutputPath "index.html")
}

# Export functions
Export-ModuleMember -Function @(
    'New-TestDocumentation',
    'New-APIDocumentation',
    'New-ComponentDocumentation',
    'Invoke-TypeDocGeneration'
)
