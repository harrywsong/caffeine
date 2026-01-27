const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../../database/database');
const RestrictionMiddleware = require('../../middleware/restrictions');
const leaderboardUpdater = require('../../utils/leaderboardUpdater');

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Play the slot machine')
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
        const allowed = await RestrictionMiddleware.checkCasinoGameRestriction(interaction, 'slots');
        if (!allowed) return;

        const amount = interaction.options.getInteger('amount');
        const userBalance = await database.getUserEconomy(userId, guildId);

        if (userBalance.coins < amount) {
            return interaction.reply({ content: '❌ You don\'t have enough coins!', ephemeral: true });
        }

        const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎'];
        const results = [
            symbols[getRandomInt(0, symbols.length - 1)],
            symbols[getRandomInt(0, symbols.length - 1)],
            symbols[getRandomInt(0, symbols.length - 1)]
        ];

        let multiplier = 0;
        if (results[0] === results[1] && results[1] === results[2]) {
            // Three of a kind
            if (results[0] === '💎') multiplier = 10;
            else if (results[0] === '⭐') multiplier = 5;
            else multiplier = 3;
        } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
            // Two of a kind
            multiplier = 1.5;
        }

        const winAmount = Math.floor(amount * multiplier) - amount;
        const newCoins = userBalance.coins + winAmount;
        
        await database.updateUserEconomy(userId, guildId, {
            coins: newCoins,
            total_earned: (userBalance.total_earned || 1000) + (winAmount > 0 ? winAmount : 0)
        });

        // Update casino leaderboard immediately for all slots games
        leaderboardUpdater.updateCasinoLeaderboardNow(interaction.client);

        const embed = new EmbedBuilder()
            .setColor(winAmount > 0 ? 0x00FF00 : 0xFF0000)
            .setTitle('🎰 Slot Machine')
            .setDescription(`${results.join(' | ')}`)
            .addFields(
                { name: 'Result', value: winAmount > 0 ? '✅ You Won!' : '❌ You Lost!', inline: true },
                { name: 'Amount', value: `${winAmount > 0 ? '+' : ''}${winAmount} coins`, inline: true },
                { name: '💰 New Balance', value: `${newCoins.toLocaleString()} coins`, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};