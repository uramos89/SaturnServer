#!/bin/bash
# ── Saturno ContextP Git Initializer ────────────────────────────────────────
# Crea la estructura de ContextP y la sincroniza con un repo Git remoto
# ──────────────────────────────────────────────────────────────────────────────

set -e

CONTEXTP_DIR="${1:-./ContextP}"
CONTEXTP_REPO="${2:-git@github.com:uramos89/ContextP.git}"
GIT_USER="${GIT_USER:-Saturno Neural Core}"
GIT_EMAIL="${GIT_EMAIL:-neural@saturno.local}"

echo "=== Saturno ContextP Initializer ==="
echo "Target: $CONTEXTP_DIR"
echo "Remote: $CONTEXTP_REPO"
echo ""

# Initialize ContextP as a Git repo if not already
if [ ! -d "$CONTEXTP_DIR/.git" ]; then
    mkdir -p "$CONTEXTP_DIR"
    cd "$CONTEXTP_DIR"
    git init
    git config user.name "$GIT_USER"
    git config user.email "$GIT_EMAIL"
    
    # Add remote
    git remote add origin "$CONTEXTP_REPO" 2>/dev/null || true
    
    # Create initial structure
    mkdir -p TECH/{linux,windows,ssh,monitoring}
    mkdir -p CONTRACTS
    mkdir -p PARAMS
    mkdir -p AUDIT
    mkdir -p _INDEX
    
    # Create index master
    cat > _INDEX/INDEX_MASTER.md << 'EOF'
# ContextP Index Master
- TECH: General infrastructure documentation
- CONTRACTS: Security & root contracts
- PARAMS: User preferences
- AUDIT: Execution history
EOF
    
    # Create .gitkeep in all dirs
    find . -type d -exec touch {}/.gitkeep \;
    
    git add -A
    git commit -m "init: ContextP structure | $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    echo "✓ ContextP initialized at $CONTEXTP_DIR"
else
    echo "✓ ContextP already initialized"
fi

# Try to push/pull from remote
cd "$CONTEXTP_DIR"
if git remote get-url origin &>/dev/null; then
    echo "→ Syncing with remote..."
    git pull origin main --rebase 2>/dev/null || git pull origin master --rebase 2>/dev/null || echo "  (no remote branch yet)"
fi

echo ""
echo "=== ContextP ready ==="
echo "Auto-commit hook: use 'git add -A && git commit -m \"update\" && git push' inside ContextP/"
