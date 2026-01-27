const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const database = require('./database/database');
const config = require('./utils/config');
const { startDashboard, setBotClient } = require('./dashboard/server');
const { startColorRoleCleanupTimer } = require('./utils/colorRoleCleanup');
const { startAutoRoleCaching } = require('./utils/autoRoleCache');
require('dotenv').config();

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Create collections for commands and events
client.commands = new Collection();
client.events = new Collection();

// Function to load commands from a directory recursively
function loadCommandsFromDirectory(dirPath, relativePath = '') {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
            // Recursively load commands from subdirectories
            loadCommandsFromDirectory(itemPath, path.join(relativePath, item));
        } else if (item.endsWith('.js')) {
            // Load command file
            const command = require(itemPath);
            
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                const displayPath = relativePath ? path.join(relativePath, item) : item;
                console.log(`✅ Loaded command: ${command.data.name} (${displayPath})`);
            } else {
                const displayPath = relativePath ? path.join(relativePath, item) : item;
                console.log(`⚠️ Command at ${displayPath} is missing required "data" or "execute" property.`);
            }
        }
    }
}

// Load commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    loadCommandsFromDirectory(commandsPath);
}

// Load events
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
        console.log(`✅ Loaded event: ${event.name}`);
    }
}

// Error handling
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN).then(() => {
    // Set bot client for dashboard
    setBotClient(client);
    
    // Start dashboard server
    if (process.env.ENABLE_DASHBOARD !== 'false') {
        startDashboard();
    }
    
    // Start automatic color role cleanup timer
    startColorRoleCleanupTimer(client);
    
    // Start auto role message caching
    startAutoRoleCaching(client);
});