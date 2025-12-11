#!/bin/bash

# Script to push to GitHub
# Usage: ./push-to-github.sh YOUR_GITHUB_USERNAME

set -e

if [ -z "$1" ]; then
    echo "❌ Error: GitHub username required"
    echo ""
    echo "Usage: ./push-to-github.sh YOUR_GITHUB_USERNAME"
    echo ""
    echo "Or manually:"
    echo "1. Create repository at https://github.com/new"
    echo "2. git remote add origin https://github.com/chorley11/cetus-optimizer.git"
    echo "3. git push -u origin main"
    exit 1
fi

GITHUB_USERNAME=$1
REPO_URL="https://github.com/${GITHUB_USERNAME}/cetus-optimizer.git"

echo "🚀 Setting up GitHub remote..."
echo "Repository URL: ${REPO_URL}"
echo ""

# Check if remote already exists
if git remote | grep -q "origin"; then
    echo "⚠️  Remote 'origin' already exists"
    CURRENT_URL=$(git remote get-url origin)
    echo "Current URL: ${CURRENT_URL}"
    read -p "Do you want to update it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote set-url origin ${REPO_URL}
        echo "✅ Remote URL updated"
    else
        echo "Using existing remote"
    fi
else
    git remote add origin ${REPO_URL}
    echo "✅ Remote added"
fi

echo ""
echo "📤 Pushing to GitHub..."
echo ""

# Push to GitHub
if git push -u origin main; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "🔗 Repository: https://github.com/${GITHUB_USERNAME}/cetus-optimizer"
    echo ""
    echo "Next steps:"
    echo "1. Go to https://github.com/${GITHUB_USERNAME}/cetus-optimizer"
    echo "2. Click 'Actions' tab to see CI/CD workflows"
    echo "3. Wait for workflows to complete (green checkmark)"
else
    echo ""
    echo "❌ Push failed!"
    echo ""
    echo "Possible reasons:"
    echo "1. Repository doesn't exist on GitHub"
    echo "   → Create it at https://github.com/new"
    echo "   → Name: cetus-optimizer"
    echo "   → Don't initialize with README"
    echo ""
    echo "2. Authentication required"
    echo "   → Use: git push -u origin main"
    echo "   → GitHub will prompt for credentials"
    echo ""
    echo "3. Wrong username"
    echo "   → Check your GitHub username"
    echo "   → Update remote: git remote set-url origin https://github.com/CORRECT_USERNAME/cetus-optimizer.git"
    exit 1
fi

