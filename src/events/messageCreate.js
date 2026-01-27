const { EmbedBuilder } = require('discord.js');
const config = require('../utils/config');
const FilePreservationService = require('../utils/filePreservation');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        try {
            // Skip if message is from a bot or system message
            if (message.author.bot || message.system) return;

            // Only log messages with attachments to avoid spam
            if (message.attachments.size === 0) return;

            const chattingHistoryChannelId = config.getChannelId('chattingHistory');
            if (!chattingHistoryChannelId) return;

            const chattingHistoryChannel = message.guild.channels.cache.get(chattingHistoryChannelId);
            if (!chattingHistoryChannel) return;

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('📎 File Uploaded')
                .setDescription(`**Author:** ${message.author.tag}\n**Channel:** <#${message.channel.id}>\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                .setFooter({ text: `Message ID: ${message.id} | User ID: ${message.author.id}` })
                .setTimestamp();

            // Add message content if present
            if (message.content) {
                embed.addFields({ name: '📝 Message', value: message.content.length > 1024 ? message.content.substring(0, 1021) + '...' : message.content, inline: false });
            }

            // Add link to original message
            embed.addFields({ name: '🔗 Jump to Message', value: `[Click here](${message.url})`, inline: true });

            // Preserve attachments
            const preservationResult = await FilePreservationService.preserveAttachments(
                message.attachments, 
                message.author.tag
            );

            // Add attachment information
            embed.addFields({ 
                name: `📁 Attachments (${preservationResult.totalPreserved}/${message.attachments.size} preserved)`, 
                value: FilePreservationService.formatAttachmentInfo(preservationResult.info), 
                inline: false 
            });

            // Send the embed with preserved attachments
            await chattingHistoryChannel.send({ 
                embeds: [embed], 
                files: preservationResult.attachments 
            });

        } catch (error) {
            console.error('Error logging file upload:', error);
        }
    },
};