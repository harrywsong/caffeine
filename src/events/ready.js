const config = require('../utils/config');
const voiceTimeTracker = require('../utils/voiceTimeTracker');
const leaderboardUpdater = require('../utils/leaderboardUpdater');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`🚀 Bot is online! Logged in as ${client.user.tag}`);
        console.log(`📊 Serving ${client.guilds.cache.size} servers`);
        
        // Validate configuration
        config.validateConfig(client);
        
        // Restore voice sessions after restart
        try {
            await voiceTimeTracker.restoreSessions(client);
        } catch (error) {
            console.error('Error restoring voice sessions:', error);
        }
        
        // Set up periodic cleanup of inactive sessions
        setInterval(() => {
            voiceTimeTracker.cleanupInactiveSessions();
        }, 60 * 60 * 1000); // Run every hour
        
        // Start leaderboard auto-updater
        leaderboardUpdater.start(client);
        
        // Set bot status
        client.user.setActivity('🎰 Casino & Games', { type: 'PLAYING' });
    },
};