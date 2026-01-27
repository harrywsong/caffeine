const database = require('../database/database');
const config = require('../utils/config');

class RestrictionMiddleware {
    static async checkCommandRestriction(interaction) {
        const guildId = interaction.guild.id;
        const channelId = interaction.channel.id;
        const commandName = interaction.commandName;

        try {
            // Check config-based restrictions first
            if (!config.isCommandAllowed(commandName, channelId)) {
                // Find the correct channel for this command
                let correctChannelId = null;
                
                switch (commandName) {
                    case 'casino':
                        const subcommand = interaction.options.getSubcommand(false);
                        correctChannelId = config.getCasinoChannelId(subcommand || 'all');
                        break;
                    case 'casino-advanced':
                        const advancedSubcommand = interaction.options.getSubcommand(false);
                        correctChannelId = config.getCasinoChannelId(advancedSubcommand || 'all');
                        break;
                    case 'casino-games':
                        const gamesSubcommand = interaction.options.getSubcommand(false);
                        correctChannelId = config.getCasinoChannelId(gamesSubcommand || 'all');
                        break;
                }

                const errorMessage = correctChannelId 
                    ? `❌ This command can only be used in <#${correctChannelId}>!`
                    : `❌ This command is not allowed in this channel!`;

                await interaction.reply({
                    content: errorMessage,
                    ephemeral: true
                });

                return false;
            }

            return true;
        } catch (error) {
            console.error('Error checking command restriction:', error);
            return true; // Allow command if there's an error
        }
    }

    static async checkCasinoGameRestriction(interaction, gameType) {
        // RPS is free and can be used anywhere - no restrictions
        if (gameType === 'rps') {
            return true;
        }
        
        const channelId = interaction.channel.id;
        const correctChannelId = config.getCasinoChannelId(gameType);

        try {
            // If no specific channel is configured, allow in any casino channel
            if (!correctChannelId) {
                const casinoChannels = Object.values(config.config.casinoChannels).map(
                    channelName => config.getChannelId(channelName)
                ).filter(Boolean);
                
                if (!casinoChannels.includes(channelId)) {
                    await interaction.reply({
                        content: `❌ Casino commands can only be used in casino channels!`,
                        ephemeral: true
                    });
                    return false;
                }
                return true;
            }

            // Check if user is in the correct specific channel
            if (correctChannelId !== channelId) {
                const gameNames = {
                    coinflip: 'Coinflip',
                    slots: 'Slots',
                    dice: 'Dice',
                    blackjack: 'Blackjack',
                    roulette: 'Roulette',
                    leaderboard: 'Leaderboard',
                    balance: 'Balance/Daily',
                    daily: 'Balance/Daily',
                    crash: 'Crash',
                    minesweeper: 'Minesweeper',
                    hilo: 'Hi-Lo',
                    wof: 'Wheel of Fortune'
                };
                
                const gameName = gameNames[gameType] || gameType;
                
                await interaction.reply({
                    content: `❌ ${gameName} commands can only be used in <#${correctChannelId}>!`,
                    ephemeral: true
                });
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error checking casino game restriction:', error);
            return true;
        }
    }

    static async logCommandUsage(interaction) {
        try {
            const guildId = interaction.guild.id;
            const userId = interaction.user.id;
            const channelId = interaction.channel.id;
            const commandName = interaction.commandName;
            const subcommand = interaction.options.getSubcommand(false);
            
            const actionDetails = subcommand ? `${commandName}/${subcommand}` : commandName;

            await database.logActivity(
                guildId,
                userId,
                channelId,
                'command_usage',
                actionDetails
            );

            // Also log to bot logs channel if configured
            const botLogsChannelId = config.getSettingChannelId('logChannel');
            if (botLogsChannelId) {
                const guild = interaction.guild;
                const botLogsChannel = guild.channels.cache.get(botLogsChannelId);
                if (botLogsChannel) {
                    const logMessage = `🤖 **${interaction.user.tag}** used \`/${actionDetails}\` in <#${channelId}>`;
                    botLogsChannel.send(logMessage).catch(console.error);
                }
            }
        } catch (error) {
            console.error('Error logging command usage:', error);
        }
    }
}

module.exports = RestrictionMiddleware;