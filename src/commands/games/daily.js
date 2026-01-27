const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../../database/database');
const leaderboardUpdater = require('../../utils/leaderboardUpdater');

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily coins'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        
        const userBalance = await database.getUserEconomy(userId, guildId);
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const lastDaily = userBalance.last_daily ? new Date(userBalance.last_daily).getTime() : 0;

        if (now - lastDaily < oneDay) {
            const timeLeft = oneDay - (now - lastDaily);
            const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

            return interaction.reply({
                content: `⏰ You already claimed your daily reward! Come back in ${hoursLeft}h ${minutesLeft}m`,
                ephemeral: true
            });
        }

        const dailyAmount = getRandomInt(100, 500);
        const newCoins = userBalance.coins + dailyAmount;
        
        await database.updateUserEconomy(userId, guildId, {
            coins: newCoins,
            last_daily: new Date().toISOString(),
            total_earned: (userBalance.total_earned || 1000) + dailyAmount
        });

        // Update casino leaderboard immediately for all daily claims
        leaderboardUpdater.updateCasinoLeaderboardNow(interaction.client);

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎁 Daily Reward Claimed!')
            .setDescription(`You received **${dailyAmount}** coins!`)
            .addFields({ name: '💰 New Balance', value: `${newCoins.toLocaleString()} coins`, inline: true })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};