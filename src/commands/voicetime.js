const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const voiceTimeTracker = require('../utils/voiceTimeTracker');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voicetime')
        .setDescription('Check voice channel time statistics')
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View your voice time statistics')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to check stats for (defaults to yourself)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('View voice time leaderboard')
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('Number of users to show (default: 10)')
                        .setMinValue(5)
                        .setMaxValue(25)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('active')
                .setDescription('View currently active voice sessions')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        switch (subcommand) {
            case 'stats':
                await handleStats(interaction, guildId);
                break;
            case 'leaderboard':
                await handleLeaderboard(interaction, guildId);
                break;
            case 'active':
                await handleActive(interaction, guildId);
                break;
        }
    },
};

async function handleStats(interaction, guildId) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const stats = voiceTimeTracker.getUserStats(targetUser.id, guildId);

    const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle(`🔊 Voice Time Statistics`)
        .setDescription(`Statistics for ${targetUser.tag}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

    if (stats.totalTime === 0) {
        embed.addFields({ name: '📊 No Data', value: 'This user has no recorded voice time yet.', inline: false });
    } else {
        embed.addFields(
            { name: '⏱️ Total Time', value: voiceTimeTracker.formatDuration(stats.totalTime), inline: true },
            { name: '📈 Sessions', value: stats.sessions.toString(), inline: true },
            { name: '📊 Average Session', value: voiceTimeTracker.formatDuration(stats.averageSession), inline: true }
        );

        if (stats.currentSession) {
            embed.addFields({
                name: '🔴 Current Session',
                value: `**Channel:** <#${stats.currentSession.channelId}>\n**Duration:** ${voiceTimeTracker.formatDuration(stats.currentSession.duration)}\n**Started:** <t:${Math.floor(stats.currentSession.startTime / 1000)}:R>`,
                inline: false
            });
        }

        // Show top 3 channels
        const topChannels = Object.entries(stats.channels)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);

        if (topChannels.length > 0) {
            const channelList = topChannels.map(([channelId, time]) => 
                `<#${channelId}>: ${voiceTimeTracker.formatDuration(time)}`
            ).join('\n');
            
            embed.addFields({ name: '🏆 Top Channels', value: channelList, inline: false });
        }

        if (stats.lastActive) {
            embed.addFields({ name: '🕐 Last Active', value: `<t:${Math.floor(stats.lastActive / 1000)}:R>`, inline: true });
        }
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleLeaderboard(interaction, guildId) {
    const limit = interaction.options.getInteger('limit') || 10;
    const leaderboard = voiceTimeTracker.getLeaderboard(guildId, limit);

    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🏆 Voice Time Leaderboard')
        .setDescription(`Top ${limit} users by voice channel time`)
        .setTimestamp();

    if (leaderboard.length === 0) {
        embed.addFields({ name: '📭 No Data', value: 'No voice time data available yet.', inline: false });
    } else {
        let description = '';
        for (let i = 0; i < leaderboard.length; i++) {
            const user = leaderboard[i];
            const member = await interaction.guild.members.fetch(user.userId).catch(() => null);
            const username = member ? member.user.username : 'Unknown User';
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            
            description += `${medal} **${username}** - ${voiceTimeTracker.formatDuration(user.totalTime)}\n`;
            description += `    Sessions: ${user.sessions} | Avg: ${voiceTimeTracker.formatDuration(user.averageSession)}\n\n`;
        }

        embed.setDescription(description);
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleActive(interaction, guildId) {
    const activeSessions = voiceTimeTracker.getActiveSessions(guildId);

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🔴 Active Voice Sessions')
        .setDescription(`Currently ${activeSessions.length} active voice session${activeSessions.length !== 1 ? 's' : ''}`)
        .setTimestamp();

    if (activeSessions.length === 0) {
        embed.addFields({ name: '😴 No Active Sessions', value: 'No one is currently in voice channels.', inline: false });
    } else {
        let description = '';
        for (const session of activeSessions) {
            const member = await interaction.guild.members.fetch(session.userId).catch(() => null);
            const username = member ? member.user.username : 'Unknown User';
            
            description += `**${username}**\n`;
            description += `Channel: <#${session.channelId}>\n`;
            description += `Duration: ${voiceTimeTracker.formatDuration(session.currentDuration)}\n`;
            description += `Started: <t:${Math.floor(session.startTime / 1000)}:R>\n\n`;
        }

        embed.setDescription(description);
    }

    await interaction.reply({ embeds: [embed] });
}