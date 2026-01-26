const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Display information about a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to get info about')
                .setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(user.id);
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`${user.username} User Information`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: '👤 Username', value: user.username, inline: true },
                { name: '🏷️ Tag', value: `#${user.discriminator}`, inline: true },
                { name: '🆔 User ID', value: user.id, inline: true },
                { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: false }
            );

        if (member) {
            embed.addFields(
                { name: '📅 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
                { name: '🎭 Roles', value: member.roles.cache.map(role => role.toString()).join(' ') || 'None', inline: false }
            );
        }

        embed.setTimestamp()
            .setFooter({ text: 'User Info', iconURL: interaction.client.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed] });
    },
};