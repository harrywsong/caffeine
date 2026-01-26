const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Display information about the server'),
    async execute(interaction) {
        const { guild } = interaction;
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`${guild.name} Server Information`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: '📊 Total Members', value: `${guild.memberCount}`, inline: true },
                { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
                { name: '🔗 Server ID', value: guild.id, inline: true },
                { name: '🌟 Boost Level', value: `${guild.premiumTier}`, inline: true },
                { name: '💎 Boosts', value: `${guild.premiumSubscriptionCount || 0}`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Server Info', iconURL: interaction.client.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed] });
    },
};