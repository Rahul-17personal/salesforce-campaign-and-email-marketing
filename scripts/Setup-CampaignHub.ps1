[CmdletBinding()]
param([switch]$Resume)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Write-Step([string]$Message) { Write-Host ""; Write-Host "==> $Message" -ForegroundColor Cyan }
function Write-Ok([string]$Message) { Write-Host "[OK] $Message" -ForegroundColor Green }
function Fail([string]$Message) { throw $Message }

function Set-EnvValue([string]$Content, [string]$Name, [string]$Value) {
    $pattern = "(?m)^\s*" + [regex]::Escape($Name) + "=.*$"
    $line = $Name + "=" + $Value
    if ([regex]::IsMatch($Content, $pattern)) {
        return [regex]::Replace($Content, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $line })
    }
    if ($Content.Length -gt 0 -and -not $Content.EndsWith([Environment]::NewLine)) { $Content += [Environment]::NewLine }
    return $Content + $line + [Environment]::NewLine
}

function Test-PortListening([int]$Port) {
    try { return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop | Select-Object -First 1) }
    catch { return $false }
}

function Register-ResumeAfterRestart([string]$ScriptPath) {
    $runOncePath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\RunOnce"
    if (-not (Test-Path $runOncePath)) { New-Item -Path $runOncePath -Force | Out-Null }
    $command = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $ScriptPath + '" -Resume'
    New-ItemProperty -Path $runOncePath -Name "CampaignHubSetupResume" -Value $command -PropertyType String -Force | Out-Null
}

function Test-DockerReady([string]$DockerExe) {
    try { & $DockerExe info 2>$null | Out-Null; return ($LASTEXITCODE -eq 0) }
    catch { return $false }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envFile = Join-Path $repoRoot ".env"
$stateMarker = Join-Path $repoRoot ".campaignhub-session-secret-rotated"
$wslExe = Join-Path $env:WINDIR "System32\wsl.exe"

try {
    Write-Host ""
    Write-Host "CampaignHub - Windows automatic setup" -ForegroundColor White
    Write-Host "Repository: $repoRoot" -ForegroundColor DarkGray

    if (-not (Test-Path (Join-Path $repoRoot "docker-compose.yml")) -or -not (Test-Path (Join-Path $repoRoot "package.json"))) {
        Fail "Run Setup-CampaignHub.bat from the CampaignHub repository."
    }

    Write-Step "Checking Windows Subsystem for Linux"
    $wslVersionText = ""
    $wslExit = 1
    if (Test-Path $wslExe) {
        $wslVersionText = (& $wslExe --version 2>&1 | Out-String)
        $wslExit = $LASTEXITCODE
    }

    if ($wslExit -ne 0 -or $wslVersionText -notmatch "WSL version") {
        Write-Host "WSL 2 is missing. Windows will request administrator approval." -ForegroundColor Yellow
        Register-ResumeAfterRestart -ScriptPath $PSCommandPath
        $installCommand = '& "' + $wslExe + '" --install --no-distribution; exit $LASTEXITCODE'
        $encodedInstall = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($installCommand))
        $elevatedProcess = Start-Process -FilePath "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" -Verb RunAs -Wait -PassThru -ArgumentList @("-NoProfile", "-EncodedCommand", $encodedInstall)

        if ($elevatedProcess.ExitCode -ne 0) {
            Fail "WSL installation did not complete. Check the elevated PowerShell output and Windows optional-feature status."
        }

        Write-Host ""
        Write-Host "WSL prerequisites have been requested. A Windows restart is required." -ForegroundColor Yellow
        Write-Host "CampaignHub setup is registered to resume at your next sign-in."
        $restartChoice = Read-Host "Restart now? Save your work first. Enter Y to restart, or N to restart later"
        if ($restartChoice -match "^(Y|YES)$") {
            & shutdown.exe /r /t 15 /c "Restarting Windows to finish CampaignHub WSL setup."
            if ($LASTEXITCODE -ne 0) { Write-Host "Restart could not be started automatically. Restart Windows manually; setup will resume at sign-in." -ForegroundColor Yellow }
        } else {
            Write-Host "Restart Windows when convenient. Setup will resume automatically at your next sign-in." -ForegroundColor Yellow
        }
        exit 0
    }

    Write-Ok "WSL is installed."
    & $wslExe --update
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Standard WSL update failed; trying the web download source." -ForegroundColor Yellow
        & $wslExe --update --web-download
        if ($LASTEXITCODE -ne 0) { Fail "Could not update WSL. Run wsl --update from an Administrator PowerShell window." }
    }
    & $wslExe --set-default-version 2
    if ($LASTEXITCODE -ne 0) { Fail "Could not set WSL 2 as the default version." }
    Write-Ok "WSL 2 is updated and selected."

    Write-Step "Preparing local environment"
    if (-not (Test-Path $envFile)) { Copy-Item (Join-Path $repoRoot ".env.example") $envFile }
    $envContent = [IO.File]::ReadAllText($envFile)

    # Rotate the screenshot-exposed local session secret once, including across a WSL reboot/resume.
    if (-not (Test-Path $stateMarker)) {
        $freshSessionSecret = (& node -p "require('crypto').randomBytes(48).toString('base64url')").Trim()
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($freshSessionSecret)) {
            Fail "Could not generate a secure session secret. Verify Node.js is installed."
        }
        $envContent = Set-EnvValue $envContent "SESSION_SECRET" $freshSessionSecret
        [IO.File]::WriteAllText($stateMarker, "rotated-once", [System.Text.UTF8Encoding]::new($false))
        Write-Ok "Generated a fresh local session secret and saved it in .env. The value was not printed."
    }

    $envContent = Set-EnvValue $envContent "NODE_ENV" "development"
    $envContent = Set-EnvValue $envContent "API_PORT" "4000"
    $envContent = Set-EnvValue $envContent "WEB_ORIGIN" "http://localhost:5173"
    $envContent = Set-EnvValue $envContent "SESSION_COOKIE_NAME" "campaignhub_session"
    $envContent = Set-EnvValue $envContent "DATABASE_URL" "postgresql://campaignhub:campaignhub_dev_password@localhost:5432/campaignhub"
    if ($envContent -notmatch "(?m)^DEMO_ADMIN_PASSWORD=") { $envContent = Set-EnvValue $envContent "DEMO_ADMIN_PASSWORD" "CampaignHub!2026" }
    if ($envContent -notmatch "(?m)^DEMO_MARKETER_PASSWORD=") { $envContent = Set-EnvValue $envContent "DEMO_MARKETER_PASSWORD" "Marketing!2026" }
    if ($envContent -notmatch "(?m)^DEMO_VIEWER_PASSWORD=") { $envContent = Set-EnvValue $envContent "DEMO_VIEWER_PASSWORD" "Viewer!2026" }
    $envContent = [regex]::Replace($envContent, "(?m)^\s*(SF_[A-Z0-9_]+|TOKEN_ENCRYPTION_KEY_HEX|REDIS_URL)=.*(?:\r?\n)?", "")
    [IO.File]::WriteAllText($envFile, $envContent, [System.Text.UTF8Encoding]::new($false))
    Write-Ok "Local environment is ready. Secret values were not printed."

    Write-Step "Checking Docker Desktop"
    $dockerDesktopCandidates = @(
        (Join-Path $env:LOCALAPPDATA "Programs\DockerDesktop\Docker Desktop.exe"),
        (Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe")
    )
    $dockerDesktop = $dockerDesktopCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

    if (-not $dockerDesktop) {
        $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
        if (-not $winget) { Fail "WinGet is unavailable. Install or update App Installer from Microsoft Store, then rerun setup." }
        Write-Host "Installing Docker Desktop for the current Windows user..." -ForegroundColor Yellow
        & $winget.Source install --id Docker.DockerDesktop --exact --source winget --accept-source-agreements --accept-package-agreements --override "install --user --backend=wsl-2 --quiet"
        if ($LASTEXITCODE -ne 0) { Fail "Docker Desktop installation failed. Review WinGet output and rerun setup." }
        $dockerDesktop = $dockerDesktopCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    }

    if (-not $dockerDesktop) {
        $dockerDesktop = Get-ChildItem (Join-Path $env:LOCALAPPDATA "Programs") -Filter "Docker Desktop.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
    }
    if (-not $dockerDesktop) { Fail "Docker Desktop was installed but its executable could not be located. Open Docker Desktop once and rerun setup." }
    Write-Ok "Docker Desktop is installed."

    $dockerExeCandidates = @(
        (Join-Path (Split-Path $dockerDesktop -Parent) "resources\bin\docker.exe"),
        (Join-Path $env:ProgramFiles "Docker\Docker\resources\bin\docker.exe")
    )
    $dockerExe = $dockerExeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $dockerExe) {
        $dockerCommand = Get-Command docker.exe -ErrorAction SilentlyContinue
        if ($dockerCommand) { $dockerExe = $dockerCommand.Source }
    }
    if (-not $dockerExe) { Fail "Docker CLI was not found. Close and reopen PowerShell, then rerun setup." }

    Write-Step "Starting Docker Desktop"
    if (-not (Test-DockerReady -DockerExe $dockerExe)) {
        Start-Process -FilePath $dockerDesktop | Out-Null
        Write-Host "Docker Desktop may display its subscription agreement on first launch." -ForegroundColor Yellow
        Write-Host "Please review and accept it in Docker Desktop. Setup continues when the engine is ready."
        $dockerReady = $false
        for ($i = 0; $i -lt 180; $i++) {
            if (Test-DockerReady -DockerExe $dockerExe) { $dockerReady = $true; break }
            Start-Sleep -Seconds 2
        }
        if (-not $dockerReady) {
            Read-Host "After Docker Desktop says Engine running, press Enter to check again"
            for ($i = 0; $i -lt 90; $i++) {
                if (Test-DockerReady -DockerExe $dockerExe) { $dockerReady = $true; break }
                Start-Sleep -Seconds 2
            }
        }
        if (-not $dockerReady) { Fail "Docker Engine is not ready. Complete Docker Desktop's first-run setup and rerun this script." }
    }
    Write-Ok "Docker Engine is running."

    Write-Step "Installing CampaignHub dependencies"
    Push-Location $repoRoot
    try {
        & npm.cmd install
        if ($LASTEXITCODE -ne 0) { Fail "npm install failed." }

        Write-Step "Starting PostgreSQL"
        & $dockerExe compose up -d postgres
        if ($LASTEXITCODE -ne 0) { Fail "Docker Compose could not start PostgreSQL." }

        $databaseReady = $false
        for ($i = 0; $i -lt 60; $i++) {
            & $dockerExe compose exec -T postgres pg_isready -U campaignhub -d campaignhub 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) { $databaseReady = $true; break }
            Start-Sleep -Seconds 2
        }
        if (-not $databaseReady) { Fail "PostgreSQL did not become healthy. Check docker compose logs postgres." }
        Write-Ok "PostgreSQL is healthy."

        Write-Step "Creating database tables"
        & npm.cmd run db:migrate
        if ($LASTEXITCODE -ne 0) { Fail "Database migration failed." }

        Write-Step "Loading sample users, contacts, campaigns and templates"
        & npm.cmd run db:seed
        if ($LASTEXITCODE -ne 0) { Fail "Demo data seeding failed." }
    } finally {
        Pop-Location
    }

    if ((Test-PortListening 4000) -or (Test-PortListening 5173)) {
        Write-Host "A process is already listening on port 4000 or 5173. Stop the existing CampaignHub dev terminal, then rerun setup to launch this version." -ForegroundColor Yellow
        Start-Process "http://localhost:5173"
        exit 0
    }

    Write-Step "Launching CampaignHub"
    $safeRoot = $repoRoot.Replace("'", "''")
    $devCommand = "Set-Location -LiteralPath '$safeRoot'; npm.cmd run dev"
    $encodedDev = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($devCommand))
    Start-Process -FilePath "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList @("-NoProfile", "-NoExit", "-EncodedCommand", $encodedDev) | Out-Null

    $webReady = $false
    for ($i = 0; $i -lt 45; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) { $webReady = $true; break }
        } catch { Start-Sleep -Seconds 1 }
    }
    Start-Process "http://localhost:5173"

    Write-Host ""
    Write-Host "CampaignHub setup completed." -ForegroundColor Green
    Write-Host "Application: http://localhost:5173"
    Write-Host "API health:  http://localhost:4000/health"
    Write-Host "Demo sign-in: admin@campaignhub.local / CampaignHub!2026"
    Write-Host "Salesforce is disconnected. No emails are sent in this phase."
    if (-not $webReady) { Write-Host "If the browser does not load immediately, check the new development terminal." -ForegroundColor Yellow }
}
catch {
    Write-Host ""
    Write-Host "CampaignHub setup stopped: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Fix the reported prerequisite and run Setup-CampaignHub.bat again."
    exit 1
}
