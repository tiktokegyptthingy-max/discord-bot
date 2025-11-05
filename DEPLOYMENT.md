# Discord Bot Deployment Guide - Railway

This guide will help you deploy your Discord bot to Railway so it runs 24/7 without keeping your laptop on.

## Railway Setup (Recommended)

Railway offers a free tier with $5 credit/month and is the easiest way to host your bot.

### Prerequisites

1. **GitHub Account** - You'll need a GitHub account
2. **Git Repository** - Your bot code should be in a GitHub repository

### Step 1: Push Your Code to GitHub

If you haven't already:

1. Create a new repository on GitHub
2. Initialize git in your bot folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

**Important**: Make sure `config.json` and `keyauth_licenses.json` are NOT committed (they're in .gitignore)

### Step 2: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign up with GitHub (recommended)

### Step 3: Deploy Your Bot

1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository
4. Railway will auto-detect Node.js and start deploying

### Step 4: Configure Environment Variables

1. Go to your project in Railway
2. Click on your service
3. Go to the **"Variables"** tab
4. Click **"New Variable"**
5. Add:
   - **Name**: `DISCORD_TOKEN`
   - **Value**: Your Discord bot token
6. Railway will automatically restart your bot

### Step 5: Upload keyauth_licenses.json

**Option A: Using Railway Web Dashboard**
1. Go to your service in Railway
2. Click on **"Files"** tab (or use the file explorer)
3. Upload your `keyauth_licenses.json` file

**Option B: Using Railway CLI**
1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```
2. Login:
   ```bash
   railway login
   ```
3. Link your project:
   ```bash
   railway link
   ```
4. Upload the file:
   ```bash
   railway run --service your-service-name
   # Then use a file upload method or copy the file content
   ```

### Step 6: Verify Bot is Running

1. Check the **"Logs"** tab in Railway
2. You should see: `✅ Bot is ready! Logged in as YourBotName#1234`
3. Test your bot in Discord with `.licensekeys list`

### That's It!

Your bot is now running 24/7 on Railway. You can:
- ✅ Turn off your laptop - bot keeps running
- ✅ View logs anytime in Railway dashboard
- ✅ Update code by pushing to GitHub (auto-deploys)
- ✅ Update environment variables without redeploying

## Updating Your Bot

1. Make changes to your code locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```
3. Railway automatically detects the push and redeploys

## Updating keyauth_licenses.json

1. Export your licenses from KeyAuth dashboard
2. In Railway dashboard, go to **Files** tab
3. Upload the new `keyauth_licenses.json` file
4. The bot will automatically use the new data

## Troubleshooting

**Bot not starting?**
- Check the **Logs** tab in Railway for errors
- Verify `DISCORD_TOKEN` environment variable is set correctly
- Make sure `keyauth_licenses.json` file exists

**Can't see logs?**
- Railway logs are in the **"Logs"** tab of your service
- Click "View Logs" to see real-time output

**Bot disconnected?**
- Railway automatically restarts failed services
- Check logs for errors
- Verify your Discord token is still valid

## Railway CLI Commands (Optional)

If you prefer using the command line:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# View logs
railway logs

# Set environment variable
railway variables set DISCORD_TOKEN=your_token_here

# Open Railway dashboard
railway open
```

## Need Help?

- Railway Documentation: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
