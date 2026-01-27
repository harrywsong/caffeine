const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../../database/database');
const RestrictionMiddleware = require('../../middleware/restrictions');
const leaderboardUpdater = require('../../utils/leaderboardUpdater');

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('Roll dice and bet on the outcome')
        .addIntegerOption(option =>
            option.setName('guess')
                .setDescription('Guess the dice roll (1-6)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(6))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount to bet (10-1000)')
                .setRequired(true)
                .setMinValue(10)
                .setMaxValue(1000)),

    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        // Check casino game restrictions
        const allowed = await RestrictionMiddleware.checkCasinoGameRestriction(interaction, 'dice');
        if (!allowed) return;

        const guess = interaction.options.getInteger('guess');
        const amount = interaction.options.getInteger('amount');
        const userBalance = await database.getUserEconomy(userId, guildId);

        if (userBalance.coins < amount) {
            return interaction.reply({ content: '❌ You don\'t have enough coins!', ephemeral: true });
        }

        const roll = getRandomInt(1, 6);
        const won = guess === roll;
        const winAmount = won ? amount * 5 : -amount; // 5x payout for exact guess
        const newCoins = userBalance.coins + winAmount;
        
        await database.updateUserEconomy(userId, guildId, {
            coins: newCoins,
            total_earned: (userBalance.total_earned || 1000) + (won ? amount * 5 : 0)
        });

        // Update casino leaderboard immediately for all dice games
        leaderboardUpdater.updateCasinoLeaderboardNow(interaction.client);

        const embed = new EmbedBuilder()
            .setColor(won ? 0x00FF00 : 0xFF0000)
            .setTitle('🎲 Dice Roll')
            .setDescription(`The dice rolled **${roll}**!`)
            .addFields(
                { name: 'Your Guess', value: guess.toString(), inline: true },
                { name: 'Result', value: won ? '✅ You Won!' : '❌ You Lost!', inline: true },
                { name: 'Amount', value: `${winAmount > 0 ? '+' : ''}${winAmount} coins`, inline: true },
                { name: '💰 New Balance', value: `${newCoins.toLocaleString()} coins`, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};