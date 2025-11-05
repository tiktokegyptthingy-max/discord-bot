const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Path to store license keys (for local storage backup)
const LICENSE_FILE = path.join(__dirname, 'licenseKeys.json');

// Path to exported KeyAuth licenses file
const KEYAUTH_EXPORT_FILE = path.join(__dirname, 'keyauth_licenses.json');

// Load license keys from file (now stores by type: monthly/lifetime)
function loadLicenseKeys() {
  try {
    if (fs.existsSync(LICENSE_FILE)) {
      const data = fs.readFileSync(LICENSE_FILE, 'utf8');
      const parsed = JSON.parse(data);
      // Handle migration from old format (user-based) to new format (type-based)
      if (parsed.monthly || parsed.lifetime) {
        return parsed;
      }
      // Old format - return empty structure
      return { monthly: [], lifetime: [] };
    }
  } catch (error) {
    console.error('Error loading license keys:', error);
  }
  return { monthly: [], lifetime: [] };
}

// Save license keys to file (stores by type: monthly/lifetime)
function saveLicenseKeys(keys) {
  try {
    fs.writeFileSync(LICENSE_FILE, JSON.stringify(keys, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving license keys:', error);
    return false;
  }
}

// Sync keys from KeyAuth export to local storage (only unused keys)
function syncKeysFromKeyAuth() {
  const json = loadKeyAuthData();
  if (!json) {
    return { success: false, error: 'No KeyAuth export file found' };
  }

  try {
    let keysArray = [];
    
    if (json.keys && Array.isArray(json.keys)) {
      keysArray = json.keys;
    } else if (Array.isArray(json)) {
      keysArray = json;
    } else if (json.licenses && Array.isArray(json.licenses)) {
      keysArray = json.licenses;
    }

    // Filter out used keys and categorize by type
    const monthly = [];
    const lifetime = [];

    for (const keyObj of keysArray) {
      // Only store unused keys
      if (keyObj.status === 'Not Used' || !keyObj.status) {
        const key = keyObj.key || keyObj.license || keyObj.value;
        if (!key) continue;

        const expiry = keyObj.expiry ? parseInt(keyObj.expiry) : null;
        const type = expiry ? getLicenseType(expiry) : 'Monthly'; // Default to Monthly if unknown
        
        if (type === 'Lifetime') {
          lifetime.push(key);
        } else {
          monthly.push(key);
        }
      }
    }

    // Remove duplicates
    const uniqueMonthly = [...new Set(monthly)];
    const uniqueLifetime = [...new Set(lifetime)];

    const localKeys = {
      monthly: uniqueMonthly,
      lifetime: uniqueLifetime
    };

    if (saveLicenseKeys(localKeys)) {
      return { 
        success: true, 
        monthly: uniqueMonthly.length, 
        lifetime: uniqueLifetime.length 
      };
    } else {
      return { success: false, error: 'Failed to save keys to local storage' };
    }
  } catch (error) {
    console.error('Error syncing keys:', error);
    return { success: false, error: error.message };
  }
}

// Load full KeyAuth JSON data
function loadKeyAuthData() {
  try {
    if (fs.existsSync(KEYAUTH_EXPORT_FILE)) {
      const data = fs.readFileSync(KEYAUTH_EXPORT_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading exported KeyAuth licenses:', error);
  }
  return null;
}

// Load licenses from exported KeyAuth JSON file
function loadKeyAuthExportedLicenses() {
  const json = loadKeyAuthData();
  if (!json) return null;
  
  try {
    // Handle different export formats
    if (Array.isArray(json)) {
      return json.map(item => item.key || item.license || item.value || JSON.stringify(item));
    } else if (json.keys && Array.isArray(json.keys)) {
      return json.keys.map(item => item.key || item.license || item.value || JSON.stringify(item));
    } else if (json.licenses && Array.isArray(json.licenses)) {
      return json.licenses.map(item => item.key || item.license || item.value || JSON.stringify(item));
    } else if (typeof json === 'object') {
      // Try to extract keys from object
      return Object.values(json).filter(item => typeof item === 'string' || (item && (item.key || item.license)));
    }
  } catch (error) {
    console.error('Error processing license keys:', error);
  }
  return null;
}

// Find a specific license key in the exported data
function findLicenseKey(licenseKey) {
  const json = loadKeyAuthData();
  if (!json) return null;
  
  try {
    let keysArray = [];
    
    if (json.keys && Array.isArray(json.keys)) {
      keysArray = json.keys;
    } else if (Array.isArray(json)) {
      keysArray = json;
    } else if (json.licenses && Array.isArray(json.licenses)) {
      keysArray = json.licenses;
    }
    
    // Find the license key (case-insensitive, remove dashes for comparison)
    const normalizedKey = licenseKey.replace(/-/g, '').toLowerCase();
    const found = keysArray.find(item => {
      const itemKey = (item.key || item.license || '').replace(/-/g, '').toLowerCase();
      return itemKey === normalizedKey || itemKey === licenseKey.toLowerCase();
    });
    
    return found || null;
  } catch (error) {
    console.error('Error finding license key:', error);
  }
  return null;
}

// Determine if license is monthly or lifetime based on expiry
function getLicenseType(expirySeconds) {
  if (!expirySeconds) return 'Unknown';
  
  const expiry = parseInt(expirySeconds);
  // Monthly is typically around 30 days = 2,592,000 seconds (actually 2,629,743 is ~30.4 days)
  // Lifetime is typically 10 years = 315,569,260 seconds
  // Anything over 1 year (31,536,000 seconds) is likely lifetime
  const oneYear = 31536000; // 1 year in seconds
  
  if (expiry >= oneYear) {
    return 'Lifetime';
  } else {
    return 'Monthly';
  }
}

// Mark a license key as used in the KeyAuth export file
function markKeyAsUsed(licenseKey) {
  const json = loadKeyAuthData();
  if (!json) {
    return { success: false, error: 'No KeyAuth export file found' };
  }

  try {
    let keysArray = [];
    let keysPath = null;
    let isRootArray = false;
    
    if (json.keys && Array.isArray(json.keys)) {
      keysArray = json.keys;
      keysPath = 'keys';
    } else if (Array.isArray(json)) {
      keysArray = [...json]; // Copy array
      isRootArray = true;
    } else if (json.licenses && Array.isArray(json.licenses)) {
      keysArray = json.licenses;
      keysPath = 'licenses';
    }

    // Find the license key (case-insensitive, remove dashes for comparison)
    const normalizedKey = licenseKey.replace(/-/g, '').toLowerCase();
    const foundIndex = keysArray.findIndex(item => {
      const itemKey = (item.key || item.license || '').replace(/-/g, '').toLowerCase();
      return itemKey === normalizedKey || itemKey === licenseKey.toLowerCase();
    });

    if (foundIndex === -1) {
      return { success: false, error: 'License key not found in export file' };
    }

    // Mark as used
    const currentTime = Math.floor(Date.now() / 1000); // Unix timestamp
    keysArray[foundIndex].status = 'Used';
    keysArray[foundIndex].usedon = currentTime;

    // Update the JSON structure
    let updatedJson;
    if (isRootArray) {
      updatedJson = keysArray;
    } else if (keysPath) {
      updatedJson = { ...json };
      updatedJson[keysPath] = keysArray;
      // Preserve other properties like tokens if they exist
      if (json.tokens) {
        updatedJson.tokens = json.tokens;
      }
    } else {
      updatedJson = json;
    }

    // Save back to file
    fs.writeFileSync(KEYAUTH_EXPORT_FILE, JSON.stringify(updatedJson, null, 2));
    
    return { success: true };
  } catch (error) {
    console.error('Error marking key as used:', error);
    return { success: false, error: error.message };
  }
}

// Helper functions to create embeds
function createEmbed(title, description, color = 0x5865F2) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
}

function createErrorEmbed(description) {
  return createEmbed('Error', description, 0xED4245);
}

function createSuccessEmbed(description) {
  return createEmbed('Success', description, 0x57F287);
}

function createInfoEmbed(description) {
  return createEmbed('Information', description, 0x5865F2);
}

// Fetch all license keys from exported JSON file
function fetchKeyAuthLicenseKeys() {
  const exportedKeys = loadKeyAuthExportedLicenses();
  if (exportedKeys && exportedKeys.length > 0) {
    return { success: true, keys: exportedKeys };
  }
  
  return { 
    success: false, 
    error: 'No license keys found. Please export licenses from KeyAuth dashboard and save as keyauth_licenses.json in the bot folder.'
  };
}

// Handle purge command
async function handlePurgeCommand(message) {
  // Check if user has permission to manage messages
  if (!message.member?.permissions.has('ManageMessages')) {
    const embed = createErrorEmbed('You do not have permission to use this command. You need the "Manage Messages" permission.');
    return message.reply({ embeds: [embed] });
  }

  // Check if bot has permission to manage messages
  if (!message.guild.members.me.permissions.has('ManageMessages')) {
    const embed = createErrorEmbed('I do not have permission to delete messages. Please give me the "Manage Messages" permission.');
    return message.reply({ embeds: [embed] });
  }

  try {
    // Fetch messages (up to 100)
    const messages = await message.channel.messages.fetch({ limit: 100 });
    
    // Filter out messages older than 14 days (Discord API limit)
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const deletableMessages = messages.filter(msg => msg.createdTimestamp > twoWeeksAgo);

    if (deletableMessages.size === 0) {
      const embed = createInfoEmbed('No messages found to delete. Messages older than 14 days cannot be deleted.');
      return message.reply({ embeds: [embed] });
    }

    // Delete messages in bulk
    await message.channel.bulkDelete(deletableMessages, true);

    const embed = createSuccessEmbed(`Successfully deleted ${deletableMessages.size} message(s).`);
    
    // Send confirmation message and delete it after 5 seconds
    const confirmation = await message.channel.send({ embeds: [embed] });
    setTimeout(() => {
      confirmation.delete().catch(() => {});
    }, 5000);

  } catch (error) {
    console.error('Error purging messages:', error);
    const embed = createErrorEmbed(`Failed to delete messages: ${error.message}`);
    return message.reply({ embeds: [embed] });
  }
}

// Handle give command
async function handleGiveCommand(message) {
  const args = message.content.slice('.give'.length).trim().split(/ +/);
  
  if (args[0]?.toLowerCase() !== 'licensekey') {
    const embed = createErrorEmbed('Invalid command. Usage: `.give licensekey <monthly/lifetime>`');
    return message.reply({ embeds: [embed] });
  }

  const type = args[1]?.toLowerCase();
  
  if (type !== 'monthly' && type !== 'lifetime') {
    const embed = createErrorEmbed('Please specify the license type: `monthly` or `lifetime`.\n\n**Usage:** `.give licensekey <monthly/lifetime>`');
    return message.reply({ embeds: [embed] });
  }

  let licenseKeys = loadLicenseKeys();
  const availableKeys = licenseKeys[type] || [];

  if (availableKeys.length === 0) {
    const embed = createErrorEmbed(`No ${type} license keys available in local storage.\n\n**Tip:** Run \`.licensekeys sync\` to sync keys from KeyAuth export.`);
    return message.reply({ embeds: [embed] });
  }

  // Randomly select a key
  const randomIndex = Math.floor(Math.random() * availableKeys.length);
  const selectedKey = availableKeys[randomIndex];

  // Remove the key from local storage
  licenseKeys[type].splice(randomIndex, 1);
  
  if (!saveLicenseKeys(licenseKeys)) {
    const embed = createErrorEmbed('Error removing key from storage. Please try again.');
    return message.reply({ embeds: [embed] });
  }

  // Mark the key as used in the KeyAuth export file
  const markResult = markKeyAsUsed(selectedKey);
  if (!markResult.success) {
    console.error(`Warning: Could not mark key as used in export file: ${markResult.error}`);
    // Continue anyway - the key is removed from local storage
  }

  // Send the key to the user
  const giveEmbed = new EmbedBuilder()
    .setTitle('License Key Generated')
    .setDescription(`**Type:** ${type.charAt(0).toUpperCase() + type.slice(1)}\n\n**Key:** \`${selectedKey}\``)
    .setColor(0x57F287)
    .setTimestamp();

  return message.reply({ embeds: [giveEmbed] });
}

// Handle license keys command
async function handleLicenseKeysCommand(message) {
  const args = message.content.slice('.licensekeys'.length).trim().split(/ +/);
  const subcommand = args[0]?.toLowerCase();

  let licenseKeys = loadLicenseKeys();

  // Display license keys from KeyAuth (list command only)
  if (subcommand === 'list') {
    // Get full data for proper formatting
    const json = loadKeyAuthData();
    if (!json) {
      const embed = createErrorEmbed('No KeyAuth export file found.\n\n**How to fix:**\n1. Go to **Licenses** section in KeyAuth dashboard\n2. Click **Export** or download licenses as JSON\n3. Save the file as \`keyauth_licenses.json\` in the bot folder\n4. Run \`.licensekeys list\` again');
      return message.reply({ embeds: [embed] });
    }

    let keysArray = [];
    
    if (json && json.keys && Array.isArray(json.keys)) {
      keysArray = json.keys;
    } else if (Array.isArray(json)) {
      keysArray = json;
    } else if (json && json.licenses && Array.isArray(json.licenses)) {
      keysArray = json.licenses;
    }

    // Filter out used keys
    const unusedKeys = keysArray.filter(keyObj => {
      const status = keyObj.status || '';
      return status !== 'Used';
    });

    if (!unusedKeys || unusedKeys.length === 0) {
      const embed = createInfoEmbed('No unused license keys found in your KeyAuth account.');
      return message.reply({ embeds: [embed] });
    }

    // Format keys - extract just the key string
    const formattedKeys = unusedKeys.map((keyObj, index) => {
      const key = keyObj.key || keyObj.license || keyObj.value || JSON.stringify(keyObj);
      return `${index + 1}. ${key}`;
    });

    // Split into chunks of 25 keys per message (max 4 messages)
    const chunkSize = 25;
    const chunks = [];
    for (let i = 0; i < formattedKeys.length; i += chunkSize) {
      chunks.push(formattedKeys.slice(i, i + chunkSize));
    }

    // Limit to 4 messages
    const messagesToSend = chunks.slice(0, 4);
    const totalKeys = unusedKeys.length;

    // Send first message with total count
    const firstEmbed = new EmbedBuilder()
      .setTitle('Your KeyAuth License Keys')
      .setDescription(`**Total:** ${totalKeys} keys\n\`\`\`\n${messagesToSend[0].join('\n')}\n\`\`\``)
      .setColor(0x5865F2)
      .setTimestamp();
    await message.reply({ embeds: [firstEmbed] });

    // Send remaining chunks
    for (let i = 1; i < messagesToSend.length; i++) {
      const chunkEmbed = new EmbedBuilder()
        .setDescription(`\`\`\`\n${messagesToSend[i].join('\n')}\n\`\`\``)
        .setColor(0x5865F2)
        .setTimestamp();
      await message.channel.send({ embeds: [chunkEmbed] });
    }

    return;
  }

  // Check license key status
  if (subcommand === 'status') {
    const licenseKey = args.slice(1).join(' ');
    if (!licenseKey) {
      const embed = createErrorEmbed('Please provide a license key to check.\n\n**Usage:** `.licensekeys status <key>`');
      return message.reply({ embeds: [embed] });
    }

    const keyData = findLicenseKey(licenseKey);
    if (!keyData) {
      const embed = createErrorEmbed(`License key not found: \`${licenseKey}\`\n\nMake sure the key is in your exported \`keyauth_licenses.json\` file.`);
      return message.reply({ embeds: [embed] });
    }

    // Get status information
    const status = keyData.status || 'Unknown';
    const expiry = keyData.expiry ? parseInt(keyData.expiry) : null;
    const licenseType = expiry ? getLicenseType(expiry) : 'Unknown';

    // Build status embed
    const statusColor = status === 'Used' ? 0x57F287 : status === 'Not Used' ? 0xFEE75C : 0x95A5A6;
    
    const statusEmbed = new EmbedBuilder()
      .setTitle('License Key Status')
      .addFields(
        { name: 'Key', value: `\`${keyData.key || licenseKey}\``, inline: false },
        { name: 'Status', value: status, inline: true },
        { name: 'Type', value: licenseType, inline: true }
      )
      .setColor(statusColor)
      .setTimestamp();

    return message.reply({ embeds: [statusEmbed] });
  }

  // Sync keys from KeyAuth export
  if (subcommand === 'sync') {
    const syncResult = syncKeysFromKeyAuth();
    
    if (!syncResult.success) {
      const embed = createErrorEmbed(`Failed to sync keys: ${syncResult.error}`);
      return message.reply({ embeds: [embed] });
    }

    const embed = createSuccessEmbed(
      `Successfully synced keys from KeyAuth export!\n\n` +
      `**Monthly keys:** ${syncResult.monthly}\n` +
      `**Lifetime keys:** ${syncResult.lifetime}\n\n` +
      `Used keys were automatically filtered out.`
    );
    return message.reply({ embeds: [embed] });
  }

  // Add license key
  if (subcommand === 'add') {
    const licenseKey = args.slice(1).join(' ');
    if (!licenseKey) {
      const embed = createErrorEmbed('Please provide a license key to add.\n\n**Usage:** `.licensekeys add <key>`');
      return message.reply({ embeds: [embed] });
    }

    // Determine type from KeyAuth data if available
    const keyData = findLicenseKey(licenseKey);
    const expiry = keyData?.expiry ? parseInt(keyData.expiry) : null;
    const type = expiry ? getLicenseType(expiry).toLowerCase() : 'monthly';

    if (licenseKeys[type].includes(licenseKey)) {
      const embed = createErrorEmbed('This license key is already stored.');
      return message.reply({ embeds: [embed] });
    }

    licenseKeys[type].push(licenseKey);
    if (saveLicenseKeys(licenseKeys)) {
      const embed = createSuccessEmbed(`License key added successfully as ${type}!`);
      return message.reply({ embeds: [embed] });
    } else {
      const embed = createErrorEmbed('Error saving license key. Please try again.');
      return message.reply({ embeds: [embed] });
    }
  }

  // Remove license key
  if (subcommand === 'remove' || subcommand === 'delete') {
    const licenseKey = args.slice(1).join(' ');
    if (!licenseKey) {
      const embed = createErrorEmbed('Please provide a license key to remove.\n\n**Usage:** `.licensekeys remove <key>`');
      return message.reply({ embeds: [embed] });
    }

    let found = false;
    for (const type of ['monthly', 'lifetime']) {
      const index = licenseKeys[type].indexOf(licenseKey);
      if (index !== -1) {
        licenseKeys[type].splice(index, 1);
        found = true;
        break;
      }
    }

    if (!found) {
      const embed = createErrorEmbed('License key not found in local storage.');
      return message.reply({ embeds: [embed] });
    }

    if (saveLicenseKeys(licenseKeys)) {
      const embed = createSuccessEmbed('License key removed successfully!');
      return message.reply({ embeds: [embed] });
    } else {
      const embed = createErrorEmbed('Error removing license key. Please try again.');
      return message.reply({ embeds: [embed] });
    }
  }

  // Help command
  if (subcommand === 'help') {
    const helpEmbed = new EmbedBuilder()
      .setTitle('License Keys Bot Commands')
      .setDescription('KeyAuth Integration Commands')
      .addFields(
        { name: '`.licensekeys list`', value: 'Display all your license keys from KeyAuth (25 keys per message, up to 4 messages)', inline: false },
        { name: '`.licensekeys status <key>`', value: 'Check status of a specific license key (Used/Not Used, Monthly/Lifetime)', inline: false },
        { name: '`.licensekeys sync`', value: 'Sync unused keys from KeyAuth export to local storage (filters out used keys)', inline: false },
        { name: '`.licensekeys add <key>`', value: 'Add a new license key to local storage (auto-detects type)', inline: false },
        { name: '`.licensekeys remove <key>`', value: 'Remove a specific license key from local storage', inline: false },
        { name: '`.give licensekey <monthly/lifetime>`', value: 'Get a random license key of specified type (removes from local storage)', inline: false },
        { name: '`.licensekeys help`', value: 'Show this help message', inline: false }
      )
      .addFields(
        { name: 'Note', value: 'The `list` and `status` commands read from the exported `keyauth_licenses.json` file. Use `sync` to store unused keys locally.', inline: false }
      )
      .setColor(0x5865F2)
      .setTimestamp();
    return message.reply({ embeds: [helpEmbed] });
  }

  // Unknown subcommand or no subcommand
  if (!subcommand) {
    const embed = createInfoEmbed('Please specify a command. Use `.licensekeys help` to see available commands.');
    return message.reply({ embeds: [embed] });
  }

  const embed = createErrorEmbed('Unknown command. Use `.licensekeys help` to see available commands.');
  return message.reply({ embeds: [embed] });
}

// When the client is ready, run this code
client.once('ready', () => {
  console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
  
  // Auto-sync keys on startup
  const syncResult = syncKeysFromKeyAuth();
  if (syncResult.success) {
    console.log(`✅ Synced ${syncResult.monthly} monthly and ${syncResult.lifetime} lifetime keys from KeyAuth export.`);
  } else {
    console.log(`⚠️  Could not sync keys on startup: ${syncResult.error}`);
  }
});

// Listen for messages
client.on('messageCreate', async (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Check if message starts with .licensekeys
  if (message.content.startsWith('.licensekeys')) {
    await handleLicenseKeysCommand(message);
  }
  
  // Check if message starts with .give
  if (message.content.startsWith('.give')) {
    await handleGiveCommand(message);
  }
  
  // Check if message starts with .purge
  if (message.content.startsWith('.purge')) {
    await handlePurgeCommand(message);
  }
});

// Login to Discord with your client's token
let token = process.env.DISCORD_TOKEN;

if (!token) {
  try {
    if (fs.existsSync(path.join(__dirname, 'config.json'))) {
      token = require('./config.json').token;
    }
  } catch (error) {
    console.error('Error loading config.json:', error.message);
  }
}

if (!token) {
  console.error('❌ Error: Discord token not found!');
  console.error('Please set DISCORD_TOKEN environment variable or create config.json with your token.');
  console.error('\nTo create config.json:');
  console.error('1. Copy config.json.example to config.json');
  console.error('2. Replace YOUR_DISCORD_BOT_TOKEN_HERE with your actual bot token');
  process.exit(1);
}

client.login(token);

