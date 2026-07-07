# Tradia Agentic Trading OS Installer
Write-Host "Installing Tradia Agentic Trading OS..."

# Check for Node.js
try {
    node --version | Out-Null
} catch {
    Write-Host "Error: Node.js is required. Install it from https://nodejs.org"
    exit 1
}

# Install from npm
npm install -g @talocode/tradia

Write-Host ""
Write-Host "Tradia v0.1.0 installed successfully!"
Write-Host ""
Write-Host "Quick start:"
Write-Host "  tradia --help"
Write-Host "  tradia propose --symbol XAUUSD --market forex --balance 500 --risk 0.5"
Write-Host ""
Write-Host "⚠️ Not financial advice. Human review required."
