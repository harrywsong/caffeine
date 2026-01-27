const { EmbedBuilder } = require('discord.js');
const config = require('../utils/config');
const FilePreservationService = require('../utils/filePreservation');

module.exports = {
    name: 'messageDelete',
    async execute(message) {
        try {
            // Skip if message is from a bot or system message
            if (message.author?.bot || message.system) return;
            
            // Skip if message is partial (not cached)
            if (message.partial) return;

            const chattingHistoryChannelId = config.getChannelId('chattingHistory');
            if (!chattingHistoryChannelId) return;

            const chattingHistoryChannel = message.guild.channels.cache.get(chattingHistoryChannelId);
            if (!chattingHistoryChannel) return;

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🗑️ Message Deleted')
                .setDescription(`**Author:** ${message.author?.tag || 'Unknown'}\n**Channel:** <#${message.channel.id}>\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                .setFooter({ text: `Message ID: ${message.id} | User ID: ${message.author?.id || 'Unknown'}` })
                .setTimestamp();

            // Add message content
            if (message.content) {
                const content = message.content.length > 1024 ? message.content.substring(0, 1021) + '...' : message.content;
                embed.addFields({ name: '📝 Content', value: content, inline: false });
            } else {
                embed.addFields({ name: '📝 Content', value: '*No text content*', inline: false });
            }

            // Preserve attachments if they exist
            if (message.attachments.size > 0) {
                const preservationResult = await FilePreservationService.preserveAttachments(
                    message.attachments, 
                    message.author?.tag || 'Unknown',
                    'DELETED'
                );

                embed.addFields({ 
                    name: `📎 Attachments (${preservationResult.totalPreserved}/${message.attachments.size} preserved)`, 
                    value: FilePreservationService.formatAttachmentInfo(preservationResult.info), 
                    inline: false 
                });

                // Preserve embeds information
                if (message.embeds.length > 0) {
                    const embedInfo = await FilePreservationService.preserveEmbeds(message.embeds);
                    embed.addFields({ 
                        name: `📋 Embeds (${message.embeds.length})`, 
                        value: FilePreservationService.formatEmbedInfo(embedInfo), 
                        inline: false 
                    });
                }

                // Send the embed with preserved attachments
                await chattingHistoryChannel.send({ 
                    embeds: [embed], 
                    files: preservationResult.attachments 
                });
            } else {
                // No attachments, but check for embeds
                if (message.embeds.length > 0) {
                    const embedInfo = await FilePreservationService.preserveEmbeds(message.embeds);
                    embed.addFields({ 
                        name: `📋 Embeds (${message.embeds.length})`, 
                        value: FilePreservationService.formatEmbedInfo(embedInfo), 
                        inline: false 
                    });
                }

                // Send just the embed
                await chattingHistoryChannel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error logging deleted message:', error);
        }
    },
};