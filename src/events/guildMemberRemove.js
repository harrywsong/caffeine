const { EmbedBuilder } = require('discord.js');
const config = require('../utils/config');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
        try {
            const departuresChannelId = config.getChannelId('departures');
            if (!departuresChannelId) return;

            const departuresChannel = member.guild.channels.cache.get(departuresChannelId);
            if (!departuresChannel) return;

            // Create departure embed
            const embed = new EmbedBuilder()
                .setColor(0xFF6B6B)
                .setTitle('👋 Farewell!')
                .setDescription(`**${member.user.tag}** has left the cafe`)
                .addFields(
                    { name: '👤 User', value: member.user.tag, inline: true },
                    { name: '📅 Joined', value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : 'Unknown', inline: true },
                    { name: '🕐 Left', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setFooter({ text: `User ID: ${member.user.id}` })
                .setTimestamp();

            await departuresChannel.send({ embeds: [embed] });

            // Log to bot logs
            const botLogsChannelId = config.getSettingChannelId('logChannel');
            if (botLogsChannelId) {
                const botLogsChannel = member.guild.channels.cache.get(botLogsChannelId);
                if (botLogsChannel) {
                    const logMessage = `👋 **${member.user.tag}** left the server`;
                    botLogsChannel.send(logMessage).catch(console.error);
                }
            }

            console.log(`👋 ${member.user.tag} left the server`);

        } catch (error) {
            console.error('Error handling member leave:', error);
        }
    },
};