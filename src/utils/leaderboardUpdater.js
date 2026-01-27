const { EmbedBuilder } = require('discord.js');
const config = require('./config');
const database = require('../database/database');
const voiceTimeTracker = require('./voiceTimeTracker');

class LeaderboardUpdater {
    constructor() {
        this.voiceUpdateInterval = 60 * 1000; // Voice leaderboard updates every minute
        this.isRunning = false;
        this.voiceIntervalId = null;
    }

    start(client) {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.client = client;
        
        // Initial update
        this.updateAllLeaderboards();
        
        // Set up periodic updates for voice leaderboard only (every minute)
        this.voiceIntervalId = setInterval(() => {
            this.updateVoiceLeaderboardOnly();
        }, this.voiceUpdateInterval);
        
        console.log('📊 Leaderboard system started:');
        console.log('   🎤 Voice leaderboard: Updates every minute');
        console.log('   🏆 Casino leaderboard: Real-time updates');
    }

    stop() {
        if (this.voiceIntervalId) {
            clearInterval(this.voiceIntervalId);
            this.voiceIntervalId = null;
        }
        this.isRunning = false;
        console.log('📊 Leaderboard auto-updater stopped');
    }

    async updateAllLeaderboards() {
        try {
            const guild = this.client.guilds.cache.first();
            if (!guild) return;

            await this.updateVoiceLeaderboard(guild);
            await this.updateCasinoLeaderboard(guild);
        } catch (error) {
            console.error('Error updating leaderboards:', error);
        }
    }

    async updateVoiceLeaderboardOnly() {
        try {
            const guild = this.client.guilds.cache.first();
            if (!guild) return;

            await this.updateVoiceLeaderboard(guild);
        } catch (error) {
            console.error('Error updating voice leaderboard:', error);
        }
    }

    async updateVoiceLeaderboard(guild) {
        try {
            const serverConfig = require('../../server-config.json');
            const voiceLeaderboardChannelId = config.getChannelId('voiceLeaderboard');
            const messageId = serverConfig.systemMessages?.voiceLeaderboard;

            if (!voiceLeaderboardChannelId || !messageId) return;

            const channel = guild.channels.cache.get(voiceLeaderboardChannelId);
            if (!channel) return;

            const message = await channel.messages.fetch(messageId).catch(() => null);
            if (!message) return;

            const leaderboard = voiceTimeTracker.getLeaderboard(guild.id, 10);
            
            const embed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle('🎤 Voice Leaderboard')
                .setDescription('Top voice chat members by total time spent')
                .setTimestamp()
                .setFooter({ text: 'Disconnect from VC to update DB. Displays updates every minute.' });

            if (leaderboard.length === 0) {
                embed.addFields({ name: '😴 No Data Yet', value: 'Start chatting in voice channels to appear here!', inline: false });
            } else {
                let description = '';
                for (let i = 0; i < Math.min(leaderboard.length, 10); i++) {
                    const user = leaderboard[i];
                    const member = await guild.members.fetch(user.userId).catch(() => null);
                    const username = member ? member.user.username : 'Unknown User';
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                    
                    description += `${medal} **${username}**\n`;
                    description += `⏱️ ${voiceTimeTracker.formatDuration(user.totalTime)} • 📊 ${user.sessions} sessions\n\n`;
                }
                embed.setDescription(description);
            }

            await message.edit({ embeds: [embed] });
            console.log('📊 Voice leaderboard updated');

        } catch (error) {
            console.error('Error updating voice leaderboard:', error);
        }
    }

    async updateCasinoLeaderboard(guild) {
        try {
            const serverConfig = require('../../server-config.json');
            const casinoLeaderboardChannelId = config.getChannelId('leaderboard');
            const messageId = serverConfig.systemMessages?.casinoLeaderboard;

            if (!casinoLeaderboardChannelId || !messageId) return;

            const channel = guild.channels.cache.get(casinoLeaderboardChannelId);
            if (!channel) return;

            const message = await channel.messages.fetch(messageId).catch(() => null);
            if (!message) return;

            const leaderboard = await database.getCoinLeaderboard(guild.id, 10);
            
            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🏆 Casino High Rollers')
                .setDescription('Richest players in the casino')
                .setTimestamp()
                .setFooter({ text: 'Updates in real-time • Use /casino leaderboard for more details' });

            if (leaderboard.length === 0) {
                embed.addFields({ name: '🎰 No Players Yet', value: 'Start playing casino games to appear here!', inline: false });
            } else {
                let description = '';
                for (let i = 0; i < Math.min(leaderboard.length, 10); i++) {
                    const userData = leaderboard[i];
                    const member = await guild.members.fetch(userData.user_id).catch(() => null);
                    const username = member ? member.user.username : 'Unknown User';
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                    
                    description += `${medal} **${username}**\n`;
                    description += `💰 ${userData.coins.toLocaleString()} coins\n\n`;
                }
                embed.setDescription(description);
            }

            await message.edit({ embeds: [embed] });
            console.log('📊 Casino leaderboard updated');

        } catch (error) {
            console.error('Error updating casino leaderboard:', error);
        }
    }

    // Manual update methods for immediate updates after significant events
    async updateVoiceLeaderboardNow(client) {
        const guild = client.guilds.cache.first();
        if (guild) {
            await this.updateVoiceLeaderboard(guild);
        }
    }

    async updateCasinoLeaderboardNow(client) {
        const guild = client.guilds.cache.first();
        if (guild) {
            await this.updateCasinoLeaderboard(guild);
        }
    }
}

module.exports = new LeaderboardUpdater();