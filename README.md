# Discord License Keys Bot

A Discord bot that integrates with KeyAuth to fetch and display all your license keys using the `.licensekeys` command.

## Features

- **KeyAuth Integration**: Fetch all license keys directly from your KeyAuth account
- Store multiple license keys locally (backup storage)
- Add new license keys to local storage
- Remove license keys from local storage
- List all your license keys from KeyAuth
- Clear all license keys from local storage

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Get a Discord Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section
4. Click "Add Bot"
5. Under "Token", click "Reset Token" or "Copy" to get your bot token
6. Enable "Message Content Intent" under "Privileged Gateway Intents"

### 3. Invite Bot to Your Server

1. In the Discord Developer Portal, go to "OAuth2" > "URL Generator"
2. Select scopes: `bot` and `applications.commands`
3. Select bot permissions: `Send Messages`, `Read Message History`, `Manage Messages`
4. Copy the generated URL and open it in your browser
5. Select your server and authorize the bot

### 4. Export Your KeyAuth Licenses

1. Log in to your [KeyAuth account](https://keyauth.win)
2. Go to the **Licenses** section
3. Click **Export** or download your licenses as JSON
4. Save the file as `keyauth_licenses.json` in your bot folder (same folder as `index.js`)
5. Done! The bot will automatically read from this file

### 5. Configure the Bot

**Option 1: Using config.json (Recommended for local development)**
- Copy `config.json.example` to `config.json`
- Replace `YOUR_DISCORD_BOT_TOKEN_HERE` with your actual Discord bot token

**Option 2: Using Environment Variable (Recommended for production)**
- Set the `DISCORD_TOKEN` environment variable with your bot token
- On Windows PowerShell: `$env:DISCORD_TOKEN="your_token_here"`
- On Linux/Mac: `export DISCORD_TOKEN="your_token_here"`

### 6. Run the Bot

```bash
npm start
```

## Commands

- `.licensekeys list` - **Display all your license keys from exported JSON file** (25 keys per message, up to 4 messages)
- `.licensekeys status <key>` - **Check status of a specific license key** (Used/Not Used, Monthly/Lifetime)
- `.licensekeys sync` - **Sync unused keys from KeyAuth export to local storage** (automatically filters out used keys)
- `.licensekeys add <key>` - Add a new license key to local storage (auto-detects monthly/lifetime)
- `.licensekeys remove <key>` - Remove a specific license key from local storage
- `.give licensekey <monthly/lifetime>` - **Get a random license key** of specified type (removes from local storage)
- `.purge` - **Delete up to 100 messages** in the current channel (requires Manage Messages permission)
- `.licensekeys help` - Show help message

**Note:** All bot responses are sent as embed messages. The bot automatically syncs keys on startup. The `list` and `status` commands read from the exported `keyauth_licenses.json` file. The `sync` command stores unused keys locally, categorized by monthly/lifetime.

## Examples

```
.licensekeys sync                                    # Sync unused keys from KeyAuth export
.licensekeys list                                    # Display all keys (25 per message, up to 4 messages)
.licensekeys status YTnSjw-jE9Uxa-9YsjJD...         # Check status of a specific key
.give licensekey monthly                             # Get a random monthly license key
.give licensekey lifetime                            # Get a random lifetime license key
.purge                                                # Delete up to 100 messages in the channel
.licensekeys add ABC-123-DEF-456                    # Add to local storage
.licensekeys remove ABC-123-DEF-456                 # Remove from local storage
```

## Data Storage

- **KeyAuth Keys**: Read from the exported `keyauth_licenses.json` file when using `.licensekeys list`
- **Local Storage**: Unused keys are stored in `licenseKeys.json` categorized by type:
  - `monthly`: Array of monthly license keys
  - `lifetime`: Array of lifetime license keys
- **Auto-Sync**: The bot automatically syncs unused keys from KeyAuth export on startup
- **Used Keys**: Used keys are automatically filtered out and never stored locally

## Updating License Keys

To update your license keys in the bot:
1. Export your licenses again from the KeyAuth dashboard
2. Replace the `keyauth_licenses.json` file in your bot folder
3. The bot will automatically use the new data

## Running Bot 24/7 (Railway Hosting)

To run your bot without keeping your computer on, deploy it to Railway. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed step-by-step instructions.

**Railway** - Free tier with $5 credit/month - [railway.app](https://railway.app)

## Security Note

- Never commit `config.json`, `licenseKeys.json`, or `keyauth_licenses.json` to version control
- Keep your Discord bot token secure and private
- Use environment variables for tokens when deploying to cloud services

