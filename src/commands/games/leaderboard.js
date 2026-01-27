const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Show the richest users'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        try {
            const leaderboard = await database.getCoinLeaderboard(guildId, 10);

            if (leaderboard.length === 0) {
                return interaction.reply({ content: '📭 No users found in the economy system!', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🏆 Coin Leaderboard')
                .setTimestamp();

            let description = '';
            for (let i = 0; i < leaderboard.length; i++) {
                const userData = leaderboard[i];
                const user = await interaction.client.users.fetch(userData.user_id).catch(() => null);
                const username = user ? user.username : 'Unknown User';
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                description += `${medal} **${username}** - ${userData.coins.toLocaleString()} coins\n`;
            }

            embed.setDescription(description);
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            await interaction.reply({ content: '❌ Error fetching leaderboard data!', ephemeral: true });
        }
    }
};