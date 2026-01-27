const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const database = require('../database/database');
require('dotenv').config();

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https://cdn.discordapp.com"],
            connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://r2cdn.perplexity.ai"],
        },
    },
}));
app.use(cors());
app.use(express.json());

// Serve static files first, before other routes
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Store bot client reference
let botClient = null;

function setBotClient(client) {
    botClient = client;
}

// API Routes
app.get('/api/guilds/:guildId/settings', async (req, res) => {
    try {
        const { guildId } = req.params;
        const settings = await database.getGuildSettings(guildId);
        
        // Get guild info from Discord
        const guild = botClient ? botClient.guilds.cache.get(guildId) : null;
        const guildInfo = guild ? {
            name: guild.name,
            icon: guild.iconURL(),
            memberCount: guild.memberCount
        } : null;

        res.json({ settings, guildInfo });
    } catch (error) {
        console.error('Error fetching guild settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/guilds/:guildId/settings', async (req, res) => {
    try {
        const { guildId } = req.params;
        const settings = req.body;
        
        await database.updateGuildSettings(guildId, settings);
        
        // Log the settings update
        await database.logActivity(
            guildId,
            'dashboard',
            null,
            'settings_update',
            JSON.stringify(settings)
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating guild settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/guilds/:guildId/channels', async (req, res) => {
    try {
        const { guildId } = req.params;
        const guild = botClient ? botClient.guilds.cache.get(guildId) : null;
        
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        const channels = guild.channels.cache
            .filter(channel => channel.type === 0 || channel.type === 2 || channel.type === 4) // Text, Voice, Category
            .map(channel => ({
                id: channel.id,
                name: channel.name,
                type: channel.type,
                parentId: channel.parentId
            }));

        res.json(channels);
    } catch (error) {
        console.error('Error fetching guild channels:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/guilds/:guildId/roles', async (req, res) => {
    try {
        const { guildId } = req.params;
        const guild = botClient ? botClient.guilds.cache.get(guildId) : null;
        
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        const roles = guild.roles.cache
            .filter(role => !role.managed && role.name !== '@everyone')
            .map(role => ({
                id: role.id,
                name: role.name,
                color: role.hexColor,
                position: role.position
            }));

        res.json(roles);
    } catch (error) {
        console.error('Error fetching guild roles:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/guilds/:guildId/restrictions', async (req, res) => {
    try {
        const { guildId } = req.params;
        const restrictions = await database.getChannelRestrictions(guildId);
        res.json(restrictions);
    } catch (error) {
        console.error('Error fetching restrictions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/guilds/:guildId/restrictions', async (req, res) => {
    try {
        const { guildId } = req.params;
        const { channelId, commandName, allowed } = req.body;
        
        await database.setChannelRestriction(guildId, channelId, commandName, allowed);
        
        await database.logActivity(
            guildId,
            'dashboard',
            channelId,
            'restriction_update',
            `${commandName}: ${allowed ? 'allowed' : 'blocked'}`
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error setting restriction:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/guilds/:guildId/casino-channels', async (req, res) => {
    try {
        const { guildId } = req.params;
        const casinoChannels = await database.getCasinoChannels(guildId);
        res.json(casinoChannels);
    } catch (error) {
        console.error('Error fetching casino channels:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/guilds/:guildId/casino-channels', async (req, res) => {
    try {
        const { guildId } = req.params;
        const { channelId, gameType } = req.body;
        
        await database.setCasinoChannel(guildId, channelId, gameType);
        
        await database.logActivity(
            guildId,
            'dashboard',
            channelId,
            'casino_channel_assigned',
            gameType
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error setting casino channel:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/guilds/:guildId/logs', async (req, res) => {
    try {
        const { guildId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const logs = await database.getActivityLogs(guildId, parseInt(limit), parseInt(offset));
        res.json(logs);
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/guilds/:guildId/announcement', async (req, res) => {
    try {
        const { guildId } = req.params;
        const { title, message, channelId } = req.body;
        
        const guild = botClient ? botClient.guilds.cache.get(guildId) : null;
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        const channel = guild.channels.cache.get(channelId);
        if (!channel) {
            return res.status(404).json({ error: 'Channel not found' });
        }

        const embed = {
            color: 0x0099FF,
            title: title,
            description: message,
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Server Announcement'
            }
        };

        await channel.send({ embeds: [embed] });
        
        await database.logActivity(
            guildId,
            'dashboard',
            channelId,
            'announcement_sent',
            title
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending announcement:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/guilds/:guildId/stats', async (req, res) => {
    try {
        const { guildId } = req.params;
        
        // Get various statistics
        const logs = await database.getActivityLogs(guildId, 1000);
        const tempChannels = await database.getTempVoiceChannels(guildId);
        
        const stats = {
            totalCommands: logs.filter(log => log.action_type === 'command_usage').length,
            totalActivities: logs.length,
            activeTempChannels: tempChannels.length,
            recentActivity: logs.slice(0, 10)
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve dashboard HTML
app.get('/dashboard/:guildId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
function startDashboard() {
    app.listen(PORT, () => {
        console.log(`🖥️ Dashboard server running on http://localhost:${PORT}`);
    });
}

module.exports = { startDashboard, setBotClient };