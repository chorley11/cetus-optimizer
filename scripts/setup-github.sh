#!/bin/bash

# GitHub Setup Script
# This script helps set up the repository for GitHub

set -e

echo "🚀 Setting up GitHub repository..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already initialized"
fi

# Check if remote exists
if git remote | grep -q "origin"; then
    echo "✅ Remote 'origin' already exists"
    echo "Current remote URL:"
    git remote get-url origin
else
    echo "📝 Please add your GitHub remote:"
    echo "   git remote add origin https://github.com/YOUR_USERNAME/cetus-optimizer.git"
fi

# Add all files
echo "📝 Adding files to git..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "✅ No changes to commit"
else
    echo "💾 Committing changes..."
    git commit -m "Initial commit: Phase 1 MVP deployment ready"
    echo "✅ Changes committed"
fi

# Show status
echo ""
echo "📊 Current status:"
git status

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Create repository on GitHub: https://github.com/new"
echo "2. Add remote: git remote add origin https://github.com/YOUR_USERNAME/cetus-optimizer.git"
echo "3. Push to GitHub: git push -u origin main"
echo ""
echo "See GITHUB_SETUP.md for detailed instructions"

