const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your coin balance'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        
        const userBalance = await database.getUserEconomy(userId, guildId);
        
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('💰 Your Balance')
            .setDescription(`You have **${userBalance.coins.toLocaleString()}** coins!`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};