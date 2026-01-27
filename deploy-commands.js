const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];

// Function to load commands from a directory
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
                commands.push(command.data.toJSON());
                const displayPath = relativePath ? path.join(relativePath, item) : item;
                console.log(`✅ Loaded command: ${command.data.name} (${displayPath})`);
            } else {
                const displayPath = relativePath ? path.join(relativePath, item) : item;
                console.log(`⚠️ Command at ${displayPath} is missing required "data" or "execute" property.`);
            }
        }
    }
}

// Load all commands from the commands directory and subdirectories
const commandsPath = path.join(__dirname, 'src', 'commands');
loadCommandsFromDirectory(commandsPath);

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
    try {
        console.log(`🚀 Started refreshing ${commands.length} application (/) commands.`);

        // Choose deployment type based on environment
        const isGlobal = process.argv.includes('--global');
        
        if (isGlobal) {
            // Deploy globally (takes up to 1 hour to update)
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            console.log(`✅ Successfully reloaded ${data.length} global application (/) commands.`);
        } else {
            // Deploy to specific guild (instant update)
            if (!process.env.GUILD_ID) {
                console.error('❌ GUILD_ID is required for guild-specific deployment');
                process.exit(1);
            }
            
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
            console.log(`✅ Successfully reloaded ${data.length} guild application (/) commands.`);
        }
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
})();