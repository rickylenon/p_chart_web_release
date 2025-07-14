# Git Pull Setup Guide with SSH Keys

This guide explains how to set up secure git pulling between your environments:

- Development: Your development machine where you make changes
- Release Build: `C:/dev/p_chart_web_release` - where you create production builds
- Production: `C:/p_chart_web` - the actual production server where the app runs

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
