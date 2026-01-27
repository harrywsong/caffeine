const fs = require('fs');
const path = require('path');

class ConfigManager {
    constructor() {
        this.configPath = path.join(__dirname, '..', '..', 'server-config.json');
        this.config = this.loadConfig();
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const configData = fs.readFileSync(this.configPath, 'utf8');
                return JSON.parse(configData);
            }
        } catch (error) {
            console.error('Error loading config:', error);
        }
        return this.getDefaultConfig();
    }

    saveConfig() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving config:', error);
            return false;
        }
    }

    getDefaultConfig() {
        return {
            guildId: process.env.GUILD_ID,
            channels: {},
            categories: {},
            settings: {
                voiceNameTemplate: "{user}'s Room",
                welcomeMessage: "Welcome to the cafe, {user}! ☕"
            },
            casinoChannels: {},
            channelRestrictions: {}
        };
    }

    // Get channel ID by name
    getChannelId(channelName) {
        return this.config.channels[channelName] || null;
    }

    // Get category ID by name
    getCategoryId(categoryName) {
        return this.config.categories[categoryName] || null;
    }

    // Get setting value
    getSetting(settingName) {
        return this.config.settings[settingName] || null;
    }

    // Get channel ID for a specific setting
    getSettingChannelId(settingName) {
        const channelName = this.config.settings[settingName];
        return channelName ? this.getChannelId(channelName) : null;
    }

    // Get category ID for a specific setting
    getSettingCategoryId(settingName) {
        const categoryName = this.config.settings[settingName];
        return categoryName ? this.getCategoryId(categoryName) : null;
    }

    // Check if command is allowed in channel
    isCommandAllowed(commandName, channelId) {
        const restrictions = this.config.channelRestrictions[commandName];
        if (!restrictions) return true; // No restrictions = allowed everywhere
        
        // Find channel name by ID
        const channelName = Object.keys(this.config.channels).find(
            name => this.config.channels[name] === channelId
        );
        
        return restrictions.includes(channelName);
    }

    // Get casino channel for specific game
    getCasinoChannelId(gameType = 'all') {
        const channelName = this.config.casinoChannels[gameType] || this.config.casinoChannels['all'];
        return channelName ? this.getChannelId(channelName) : null;
    }

    // Update configuration
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        return this.saveConfig();
    }

    // Helper method to get all configured channels
    getAllChannels() {
        return this.config.channels;
    }

    // Helper method to get all configured categories
    getAllCategories() {
        return this.config.categories;
    }

    // Validate configuration
    validateConfig(client) {
        const guild = client.guilds.cache.get(this.config.guildId);
        if (!guild) {
            console.error('❌ Guild not found in config validation');
            return false;
        }

        const issues = [];

        // Check channels
        Object.entries(this.config.channels).forEach(([name, id]) => {
            const channel = guild.channels.cache.get(id);
            if (!channel) {
                issues.push(`Channel "${name}" (${id}) not found`);
            }
        });

        // Check categories
        Object.entries(this.config.categories).forEach(([name, id]) => {
            const category = guild.channels.cache.get(id);
            if (!category || category.type !== 4) {
                issues.push(`Category "${name}" (${id}) not found`);
            }
        });

        if (issues.length > 0) {
            console.warn('⚠️ Configuration issues found:');
            issues.forEach(issue => console.warn(`  - ${issue}`));
            return false;
        }

        console.log('✅ Configuration validated successfully');
        return true;
    }
}

module.exports = new ConfigManager();