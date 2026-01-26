const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        const dbDir = path.join(__dirname, '..', '..', 'data');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        this.dbPath = path.join(dbDir, 'bot.db');
        this.db = new sqlite3.Database(this.dbPath);
        this.init();
    }

    init() {
        this.db.serialize(() => {
            // Guild settings table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS guild_settings (
                    guild_id TEXT PRIMARY KEY,
                    prefix TEXT DEFAULT '!',
                    log_channel_id TEXT,
                    announcement_channel_id TEXT,
                    welcome_channel_id TEXT,
                    welcome_message TEXT,
                    auto_role_id TEXT,
                    music_channel_id TEXT,
                    voice_category_id TEXT,
                    voice_trigger_channel_id TEXT,
                    voice_name_template TEXT DEFAULT '{user}''s Channel',
                    casino_category_id TEXT,
                    role_selection_channel_id TEXT,
                    role_selection_message_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Channel restrictions table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS channel_restrictions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT NOT NULL,
                    channel_id TEXT NOT NULL,
                    command_name TEXT NOT NULL,
                    allowed BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(guild_id, channel_id, command_name)
                )
            `);

            // Casino channels table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS casino_channels (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT NOT NULL,
                    channel_id TEXT NOT NULL,
                    game_type TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(guild_id, channel_id, game_type)
                )
            `);

            // Reaction roles table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS reaction_roles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT NOT NULL,
                    message_id TEXT NOT NULL,
                    role_id TEXT NOT NULL,
                    emoji TEXT NOT NULL,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(guild_id, message_id, role_id)
                )
            `);

            // User economy table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS user_economy (
                    user_id TEXT NOT NULL,
                    guild_id TEXT NOT NULL,
                    coins INTEGER DEFAULT 1000,
                    last_daily DATETIME,
                    total_earned INTEGER DEFAULT 1000,
                    total_spent INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY(user_id, guild_id)
                )
            `);

            // Activity logs table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS activity_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT NOT NULL,
                    user_id TEXT,
                    channel_id TEXT,
                    action_type TEXT NOT NULL,
                    action_details TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Temporary voice channels table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS temp_voice_channels (
                    channel_id TEXT PRIMARY KEY,
                    guild_id TEXT NOT NULL,
                    owner_id TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Admin users table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS admin_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    username TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    permissions TEXT DEFAULT 'admin',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(guild_id, user_id)
                )
            `);

            // Music queue table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS music_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    url TEXT NOT NULL,
                    duration TEXT,
                    thumbnail TEXT,
                    requested_by TEXT NOT NULL,
                    position INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
        });
    }

    // Guild Settings Methods
    async getGuildSettings(guildId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM guild_settings WHERE guild_id = ?',
                [guildId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row || {});
                }
            );
        });
    }

    async updateGuildSettings(guildId, settings) {
        const keys = Object.keys(settings);
        const values = Object.values(settings);
        const placeholders = keys.map(key => `${key} = ?`).join(', ');

        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR REPLACE INTO guild_settings (guild_id, ${keys.join(', ')}, updated_at) 
                 VALUES (?, ${values.map(() => '?').join(', ')}, CURRENT_TIMESTAMP)`,
                [guildId, ...values],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    // Channel Restrictions Methods
    async setChannelRestriction(guildId, channelId, commandName, allowed = true) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR REPLACE INTO channel_restrictions 
                 (guild_id, channel_id, command_name, allowed) VALUES (?, ?, ?, ?)`,
                [guildId, channelId, commandName, allowed],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async getChannelRestrictions(guildId, channelId = null) {
        const query = channelId 
            ? 'SELECT * FROM channel_restrictions WHERE guild_id = ? AND channel_id = ?'
            : 'SELECT * FROM channel_restrictions WHERE guild_id = ?';
        const params = channelId ? [guildId, channelId] : [guildId];

        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    async isCommandAllowed(guildId, channelId, commandName) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT allowed FROM channel_restrictions WHERE guild_id = ? AND channel_id = ? AND command_name = ?',
                [guildId, channelId, commandName],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.allowed : true); // Default to allowed if no restriction
                }
            );
        });
    }

    // Casino Channels Methods
    async setCasinoChannel(guildId, channelId, gameType) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR REPLACE INTO casino_channels (guild_id, channel_id, game_type) VALUES (?, ?, ?)',
                [guildId, channelId, gameType],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async getCasinoChannels(guildId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM casino_channels WHERE guild_id = ?',
                [guildId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    async getCasinoChannelByGame(guildId, gameType) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT channel_id FROM casino_channels WHERE guild_id = ? AND game_type = ?',
                [guildId, gameType],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.channel_id : null);
                }
            );
        });
    }

    // Activity Logging Methods
    async logActivity(guildId, userId, channelId, actionType, actionDetails) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO activity_logs (guild_id, user_id, channel_id, action_type, action_details) VALUES (?, ?, ?, ?, ?)',
                [guildId, userId, channelId, actionType, actionDetails],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getActivityLogs(guildId, limit = 100, offset = 0) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM activity_logs WHERE guild_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
                [guildId, limit, offset],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    // User Economy Methods
    async getUserEconomy(userId, guildId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM user_economy WHERE user_id = ? AND guild_id = ?',
                [userId, guildId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row || { coins: 1000, last_daily: null });
                }
            );
        });
    }

    async updateUserEconomy(userId, guildId, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR REPLACE INTO user_economy 
                 (user_id, guild_id, ${keys.join(', ')}, updated_at) 
                 VALUES (?, ?, ${values.map(() => '?').join(', ')}, CURRENT_TIMESTAMP)`,
                [userId, guildId, ...values],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    // Reaction Roles Methods
    async addReactionRole(guildId, messageId, roleId, emoji, description) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR REPLACE INTO reaction_roles (guild_id, message_id, role_id, emoji, description) VALUES (?, ?, ?, ?, ?)',
                [guildId, messageId, roleId, emoji, description],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getReactionRoles(guildId, messageId = null) {
        const query = messageId 
            ? 'SELECT * FROM reaction_roles WHERE guild_id = ? AND message_id = ?'
            : 'SELECT * FROM reaction_roles WHERE guild_id = ?';
        const params = messageId ? [guildId, messageId] : [guildId];

        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    // Temporary Voice Channels Methods
    async addTempVoiceChannel(channelId, guildId, ownerId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR REPLACE INTO temp_voice_channels (channel_id, guild_id, owner_id) VALUES (?, ?, ?)',
                [channelId, guildId, ownerId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async removeTempVoiceChannel(channelId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM temp_voice_channels WHERE channel_id = ?',
                [channelId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async getTempVoiceChannels(guildId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM temp_voice_channels WHERE guild_id = ?',
                [guildId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = new Database();