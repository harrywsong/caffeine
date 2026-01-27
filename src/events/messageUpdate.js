const { EmbedBuilder } = require('discord.js');
const config = require('../utils/config');

module.exports = {
    name: 'messageUpdate',
    async execute(oldMessage, newMessage) {
        try {
            // Skip if message is from a bot or system message
            if (newMessage.author?.bot || newMessage.system) return;
            
            // Skip if message is partial (not cached)
            if (oldMessage.partial || newMessage.partial) return;

            // Skip if content didn't actually change (embed updates, etc.)
            if (oldMessage.content === newMessage.content) return;

            const chattingHistoryChannelId = config.getChannelId('chattingHistory');
            if (!chattingHistoryChannelId) return;

            const chattingHistoryChannel = newMessage.guild.channels.cache.get(chattingHistoryChannelId);
            if (!chattingHistoryChannel) return;

            const embed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('✏️ Message Edited')
                .setDescription(`**Author:** ${newMessage.author.tag}\n**Channel:** <#${newMessage.channel.id}>\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                .addFields(
                    { name: '📝 Before', value: oldMessage.content || '*No text content*', inline: false },
                    { name: '📝 After', value: newMessage.content || '*No text content*', inline: false }
                )
                .setFooter({ text: `Message ID: ${newMessage.id} | User ID: ${newMessage.author.id}` })
                .setTimestamp();

            // Add link to original message
            embed.addFields({ name: '🔗 Jump to Message', value: `[Click here](${newMessage.url})`, inline: true });

            await chattingHistoryChannel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error logging edited message:', error);
        }
    },
};