# Git Pull Setup Guide with SSH Keys (Compatible with Manual Updates)

This guide explains how to set up secure git pulling for restricted production environments where npm install is blocked:

- **Development**: Your development machine where you make changes
- **Release Build**: `C:/dev/p_chart_web_release` - where you create production builds with all dependencies
- **Production**: `C:/p_chart_web` - the restricted production server (git access only)

## Production Environment Constraints

**Production servers have restricted network access:**

- Cannot run `npm install` due to package blocking
- Only git access is available
- Cannot build or compile code

**Solution: Complete Standalone Deployment**

- Development builds the complete application on Windows (same platform as production)
- Release repository includes the full `node_modules` directory
- Production pulls ready-to-run applications

## Deployment Flow

```
Development Environment
    ↓ (build + create standalone)
Release Repository (includes node_modules)
    ↓ (git pull)
Production Server (ready to run)
```

## Compatibility with Manual System Updates

The git pull system is designed to work safely alongside the manual system update feature:

- **Conflict Prevention**: Git pull automatically detects when manual updates are in progress and skips pulling
- **Safety Timeout**: After a manual update, git pull waits 24 hours before resuming automatic pulls
- **Manual Override**: You can force git pull by deleting the `temp/system-updates/MANUAL_UPDATE_APPLIED` marker file
- **Update Source Tracking**: The system tracks whether updates came from git or manual uploads

### Git Push Integration

Manual updates now automatically push changes to the git repository when possible:

**When Git Push Works:**

- Manual updates are committed and pushed to the current branch
- Future git pulls will include the manual changes (no conflicts)
- All production instances can receive the same fixes via git pull
- Full audit trail maintained in git history

**When Git Push Fails:**

- Manual updates are applied locally only
- 24-hour safety timeout still applies to prevent conflicts
- Manual updates may be overwritten by future git pulls

**Git Configuration Status:**

- The admin interface shows git configuration status before upload
- Displays current branch, remote URL, and push access
- Warns if git push won't work before applying updates

**Benefits:**

- Eliminates conflict issues between deployment methods
- Provides persistence for emergency production fixes
- Maintains git history for all changes

## Standalone Deployment Process

**Development Machine Steps:**

1. **Build the application**: `npm run build`
2. **Create standalone deployment**: `.\deployment\dev-create-standalone-deployment.ps1`
3. **Push to release repository**: The script handles git operations

**What's Included in Release:**

- Built Next.js application
- Complete `node_modules` directory (all dependencies)
- Production configuration files
- Database schema and migrations
- Standalone server file

**Benefits:**

- **No Network Dependencies**: Production doesn't need npm registry access
- **Platform Compatibility**: Built on same Windows platform as production
- **Complete Package**: Everything needed to run is included
- **Faster Deployment**: No build or install time on production
- **Reproducible**: Exact same dependencies every time

## Repository Size Considerations

- **Release Repository**: ~320MB (includes node_modules)
- **Development Repository**: ~10MB (excludes node_modules)
- **Git LFS**: Consider using Git Large File Storage for large binaries if needed

## 1. Development Environment Setup

### 1.1 Generate SSH Key

From your development machine, generate a new SSH key:

```bash
# Navigate to the release build directory
cd C:/dev/p_chart_web_release

# Create .ssh directory if it doesn't exist
mkdir .ssh

# Generate SSH key with a deployment-specific identifier
ssh-keygen -t ed25519 -C "p_chart_web_production" -f .ssh/id_ed25519
```

When prompted:

- Enter the file path as `.ssh/id_ed25519`
- You can set a passphrase or leave it empty (empty is more suitable for automated pulls)

### 1.2 Configure Git to Ignore SSH Keys

Add these lines to `.gitignore` in `C:/dev/p_chart_web_release`:

```
.ssh/*
!.ssh/.gitkeep
```

### 1.3 Configure Git to Use Custom SSH Key

Add this to `C:/dev/p_chart_web_release/.git/config`:

```
[core]
    sshCommand = ssh -i .ssh/id_ed25519
```

### 1.4 Add SSH Key to Git Repository

1. Copy the contents of the public key:
   ```bash
   cat .ssh/id_ed25519.pub
   ```
2. Add this key to your git repository:
   - For GitHub:
     - Go to Settings > Deploy keys
     - Click "Add deploy key"
     - Paste the public key
     - Give it a name like "P-Chart Web Production Deploy Key"
     - Enable "Allow write access" if needed

## 2. Production Server Setup

### 2.1 Copy SSH Keys

Copy the SSH keys from your release build to the production server:

```bash
# Create directory in production server
mkdir C:/p_chart_web/.ssh

# Copy SSH keys (manually copy these files)
From: C:/dev/p_chart_web_release/.ssh/id_ed25519
To:   C:/p_chart_web/.ssh/id_ed25519

From: C:/dev/p_chart_web_release/.ssh/id_ed25519.pub
To:   C:/p_chart_web/.ssh/id_ed25519.pub
```

### 2.2 Configure Production Git

Add this to `C:/p_chart_web/.git/config` on the production server:

```
[core]
    sshCommand = ssh -i .ssh/id_ed25519
```

### 2.3 Test the Connection

On the production server:

```bash
# Test SSH connection (for GitHub)
ssh -i C:/p_chart_web/.ssh/id_ed25519 -T git@github.com
```

## 3. Security Notes

1. Keep the SSH keys secure:

   - Don't commit them to git (verify they're in .gitignore)
   - Restrict file permissions
   - Don't share them outside your deployment process

2. The private key (`id_ed25519`) should:

   - Never be shared or exposed
   - Only exist in your release build and production environments
   - Have restricted file permissions

3. If you need to rotate keys:
   - Generate new keys
   - Update both environments
   - Remove old keys from git repository

## 4. Using the Pull Script

After setup is complete, you can use the pull script on the production server:

```bash
# Manual update on production server
C:/p_chart_web/pull.bat
```

### 4.1 Setting Up Automated Updates (Task Scheduler)

To set up automatic updates using Windows Task Scheduler:

1. Open Task Scheduler:

   - Press Win + R
   - Type `taskschd.msc` and press Enter

2. Create New Task:

   - In the right panel, click "Create Task"
   - General tab:
     - Name: "P-Chart Web Auto Update"
     - Description: "Automatically pulls updates from git repository"
     - Select "Run whether user is logged on or not"
     - Select "Run with highest privileges"
     - Configure for: Windows 10 (or your OS version)

3. Triggers tab:

   - Click "New"
   - Begin the task: "On a schedule"
   - Settings: Daily
   - Start time: Choose a low-traffic time (e.g., 2:00 AM)
   - Recur every: 1 days
   - Optional: Add additional triggers for:
     - "At startup" (Delay task for: 30 seconds)
     - "On workstation unlock"

4. Actions tab:

   - Click "New"
   - Action: Start a program
   - Program/script: `C:\Windows\System32\cmd.exe`
   - Add arguments: `/c "C:\p_chart_web\pull.bat"`
   - Start in: `C:\p_chart_web`

5. Conditions tab:

   - Uncheck "Start the task only if the computer is on AC power"
   - Optional: Check "Wake the computer to run this task"

6. Settings tab:

   - Allow task to be run on demand
   - If the task fails, restart every: 5 minutes
   - Attempt to restart up to: 3 times
   - Stop the task if it runs longer than: 30 minutes
   - If the running task does not end when requested, force it to stop

7. Testing:
   - Right-click the task and select "Run" to test
   - Check the Last Run Result in task properties
   - Review application logs for successful pull/restart

## Workflow Summary

1. Development:

   - Make changes in your development environment
   - Test changes locally

2. Release Build (`C:/dev/p_chart_web_release`):

   - Create production build using create-deployment-full.ps1
   - Push changes to git repository

3. Production Server (`C:/p_chart_web`):
   - Uses pull.bat to fetch updates from the repository
   - Automatically restarts when changes are detected

## Troubleshooting

1. If git pull fails with permission denied:

   - Verify SSH key is correctly copied to `C:/p_chart_web/.ssh/`
   - Check git repository deploy key settings
   - Test SSH connection explicitly

2. If git pull works but can't find repository:

   - Verify remote URL is using SSH format
   - Check repository path in git config

3. For SSH key permission errors:
   - Verify key file permissions
   - Check key file paths in git config

### Compatibility Issues

1. If git pull is being skipped after manual updates:

   - Check if `temp/system-updates/MANUAL_UPDATE_APPLIED` exists
   - To force git pull, delete this file: `del "C:\p_chart_web\temp\system-updates\MANUAL_UPDATE_APPLIED"`
   - The 24-hour safety timeout prevents conflicts between update methods

2. If updates seem to conflict:

   - Use either git pull OR manual updates for each deployment
   - Check `temp/system-updates/UPDATE_SOURCE` to see which method was used last
   - Manual updates take precedence over git pull during the safety window

3. For mixed deployment states:
   - Manual updates create local changes that git might want to overwrite
   - The enhanced pull script preserves manual changes when possible
   - Consider using one update method consistently for cleaner state management
