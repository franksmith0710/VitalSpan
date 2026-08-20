# 验真 PMTiles 外部瓦片服务（HTTP Range + CORS）
param(
  [int]$Port = 8080,
  [string]$PmtilesFile = "planet-z15-20260817.pmtiles",
  [string]$CorsOrigin = "http://localhost:5173"
)

$ErrorActionPreference = "Stop"
$url = "http://127.0.0.1:$Port/$PmtilesFile"

Write-Host "检查 Range: $url"
$range = curl.exe -s -D - -o NUL -H "Range: bytes=0-16383" $url 2>&1
if ($range -notmatch "206") {
  Write-Host $range
  throw "Range 请求未返回 206 Partial Content"
}

Write-Host "检查 CORS preflight"
$options = curl.exe -s -D - -o NUL -X OPTIONS $url -H "Origin: $CorsOrigin" -H "Access-Control-Request-Method: GET" 2>&1
if ($options -notmatch "Access-Control-Allow-Origin") {
  Write-Host $options
  throw "CORS 响应头缺失"
}

Write-Host "OK: PMTiles 外部服务 Range + CORS 正常"
