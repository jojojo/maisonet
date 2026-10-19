Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path $PSScriptRoot -Parent
$deployConfig = @{}
Get-Content (Join-Path $projectRoot '.env') | ForEach-Object {
    if ($_ -match '^([A-Z_]+)=(.*)$') {
        $deployConfig[$matches[1]] = $matches[2].Trim().Trim('"').Trim("'")
    }
}
$portainerBase = $deployConfig['PORTAINER_URL'].TrimEnd('/')
$portainerHeaders = @{ 'X-API-Key' = $deployConfig['PORTAINER_TOKEN'] }

function Invoke-Portainer {
    param([string]$Path, [string]$Method = 'Get', $Body = $null, [int]$TimeoutSec = 60)
    $request = @{
        Uri = "$portainerBase/api/$Path"
        Method = $Method
        Headers = $portainerHeaders
        TimeoutSec = $TimeoutSec
    }
    if ($null -ne $Body) {
        $request.ContentType = 'application/json'
        $request.Body = ConvertTo-Json -InputObject $Body -Depth 20 -Compress
    }
    Invoke-RestMethod @request
}
