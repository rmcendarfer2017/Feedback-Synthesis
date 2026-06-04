# Stops Feedback Synthesis dev servers (API + Vite) from a previous run.
$ports = 3001, 5173, 5174, 5175
foreach ($port in $ports) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object {
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}
