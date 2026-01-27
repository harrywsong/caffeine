const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear messages from the current channel (Server Owner only)')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        // Check if user is the server owner
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({
                content: '❌ This command can only be used by the server owner.',
                ephemeral: true
            });
        }

        const amount = interaction.options.getInteger('amount');

        try {
            await interaction.deferReply({ ephemeral: true });

            // Fetch messages to delete
            const messages = await interaction.channel.messages.fetch({ limit: amount });
            
            // Filter out messages older than 14 days (Discord limitation)
            const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
            const deletableMessages = messages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
            
            if (deletableMessages.size === 0) {
                return interaction.editReply({
                    content: '❌ No messages found to delete (messages older than 14 days cannot be bulk deleted).'
                });
            }

            // Bulk delete messages
            if (deletableMessages.size === 1) {
                // Single message deletion
                await deletableMessages.first().delete();
            } else {
                // Bulk deletion
                await interaction.channel.bulkDelete(deletableMessages, true);
            }

            const deletedCount = deletableMessages.size;
            const skippedCount = messages.size - deletableMessages.size;

            let responseMessage = `✅ Successfully deleted ${deletedCount} message${deletedCount !== 1 ? 's' : ''}.`;
            
            if (skippedCount > 0) {
                responseMessage += `\n⚠️ Skipped ${skippedCount} message${skippedCount !== 1 ? 's' : ''} (older than 14 days).`;
            }

            await interaction.editReply({
                content: responseMessage
            });

        } catch (error) {
            console.error('Error clearing messages:', error);
            
            let errorMessage = '❌ Failed to clear messages.';
            
            if (error.code === 50013) {
                errorMessage += ' Missing permissions to delete messages.';
            } else if (error.code === 50034) {
                errorMessage += ' Cannot delete messages older than 14 days.';
            }

            await interaction.editReply({
                content: errorMessage
            });
        }
    },
};