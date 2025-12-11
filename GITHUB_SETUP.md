# GitHub Setup Guide

## Initial Setup

### 1. Initialize Git Repository

```bash
cd cetus-optimizer
git init
git add .
git commit -m "Initial commit: Phase 1 MVP"
```

### 2. Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `cetus-optimizer` (or your preferred name)
3. Description: "Automated liquidity management system for Cetus DEX on Sui blockchain"
4. Visibility: Private (recommended for production) or Public
5. **Don't** initialize with README (we already have one)
6. Click "Create repository"

### 3. Connect and Push

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/cetus-optimizer.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## GitHub Actions Setup

### Automatic CI/CD

The repository includes GitHub Actions workflows that automatically:

1. **Verify Build** (`ci.yml`)
   - Runs on every push/PR
   - Compiles TypeScript
   - Verifies build succeeds
   - Runs verification script

2. **Auto Update** (`auto-update.yml`)
   - Detects changes to source code
   - Checks for dependency updates
   - Provides change summaries

3. **Deploy to Railway** (`deploy-railway.yml`) - Optional
   - Auto-deploys on push to main/master
   - Requires Railway token setup

### Enable GitHub Actions

1. Go to your repository on GitHub
2. Click "Actions" tab
3. Click "I understand my workflows, go ahead and enable them"
4. Workflows will run automatically on next push

## GitHub Secrets Setup

For Railway auto-deployment (optional):

1. Go to Repository → Settings → Secrets and variables → Actions
2. Add the following secrets:

```
RAILWAY_TOKEN=your_railway_token
RAILWAY_SERVICE_ID=your_service_id
```

To get Railway token:
- Go to Railway dashboard
- Click your profile → Settings → Tokens
- Create new token
- Copy token value

## Automatic Updates

### How It Works

When you push changes to GitHub:

1. **CI Pipeline** runs automatically:
   - ✅ Verifies code compiles
   - ✅ Runs build
   - ✅ Checks for errors

2. **Change Detection**:
   - Detects changes to `src/`, `package.json`, etc.
   - Provides summary in Actions tab

3. **Railway Deployment** (if configured):
   - Auto-deploys on push to main branch
   - Uses Railway token from secrets

### Manual Deployment Trigger

You can also trigger deployments manually:

1. Go to Actions tab
2. Select "Deploy to Railway"
3. Click "Run workflow"
4. Select branch and click "Run workflow"

## Branch Protection (Recommended)

Set up branch protection for `main` branch:

1. Go to Settings → Branches
2. Add rule for `main` branch
3. Enable:
   - ✅ Require pull request reviews
   - ✅ Require status checks to pass
   - ✅ Require up-to-date branches
   - ✅ Include administrators

## Workflow Files

### `.github/workflows/ci.yml`
- Runs on every push/PR
- Verifies build succeeds
- Runs tests

### `.github/workflows/auto-update.yml`
- Detects code changes
- Checks for dependency updates
- Provides change summaries

### `.github/workflows/deploy-railway.yml`
- Auto-deploys to Railway
- Requires Railway secrets

## Monitoring

### Check Workflow Status

1. Go to Actions tab
2. See status of all workflow runs
3. Click on a run to see details
4. Green checkmark = success
5. Red X = failure (check logs)

### View Logs

1. Click on a workflow run
2. Click on a job
3. Expand steps to see logs
4. Download logs if needed

## Troubleshooting

### Workflows Not Running

- Check Actions tab is enabled
- Verify `.github/workflows/` files exist
- Check branch name matches workflow triggers

### Build Failures

- Check logs in Actions tab
- Verify Node.js version (needs 20+)
- Check for TypeScript errors
- Ensure dependencies install correctly

### Railway Deployment Fails

- Verify `RAILWAY_TOKEN` secret is set
- Check `RAILWAY_SERVICE_ID` is correct
- Ensure Railway service exists
- Check Railway logs for errors

## Best Practices

1. **Commit Often**
   - Small, focused commits
   - Clear commit messages
   - Push regularly

2. **Use Branches**
   - `main` - production
   - `develop` - development
   - Feature branches for new features

3. **Pull Requests**
   - Create PRs for changes
   - Review before merging
   - Use PR template

4. **Monitor Actions**
   - Check Actions tab regularly
   - Fix failing builds quickly
   - Review change summaries

## Quick Commands

```bash
# Check status
git status

# Add changes
git add .

# Commit
git commit -m "Description of changes"

# Push to GitHub
git push origin main

# Create new branch
git checkout -b feature/new-feature

# Push branch
git push origin feature/new-feature
```

## Next Steps

1. ✅ Initialize git repository
2. ✅ Create GitHub repository
3. ✅ Push code to GitHub
4. ✅ Enable GitHub Actions
5. ✅ Set up secrets (if using Railway)
6. ✅ Monitor first workflow run

---

**Your repository is now set up for automatic updates!** 🚀

Every push will trigger CI/CD pipelines automatically.

