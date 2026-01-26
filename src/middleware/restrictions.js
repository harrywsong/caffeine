const database = require('../database/database');

class RestrictionMiddleware {
    static async checkCommandRestriction(interaction) {
        const guildId = interaction.guild.id;
        const channelId = interaction.channel.id;
        const commandName = interaction.commandName;

        try {
            // Check if command is allowed in this channel
            const allowed = await database.isCommandAllowed(guildId, channelId, commandName);
            
            if (!allowed) {
                const settings = await database.getGuildSettings(guildId);
                let allowedChannel = null;

                // Find appropriate channel for this command
                switch (commandName) {
                    case 'music':
                        allowedChannel = settings.music_channel_id;
                        break;
                    case 'casino':
                        // Check if this is a specific casino game
                        const subcommand = interaction.options.getSubcommand();
                        const gameChannel = await database.getCasinoChannelByGame(guildId, subcommand);
                        if (gameChannel) {
                            allowedChannel = gameChannel;
                        }
                        break;
                }

                const errorMessage = allowedChannel 
                    ? `❌ This command can only be used in <#${allowedChannel}>!`
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
        const guildId = interaction.guild.id;
        const channelId = interaction.channel.id;

        try {
            const allowedChannel = await database.getCasinoChannelByGame(guildId, gameType);
            
            if (allowedChannel && allowedChannel !== channelId) {
                await interaction.reply({
                    content: `❌ ${gameType} can only be played in <#${allowedChannel}>!`,
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
        } catch (error) {
            console.error('Error logging command usage:', error);
        }
    }
}

module.exports = RestrictionMiddleware;