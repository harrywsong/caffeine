const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../../database/database');
const RestrictionMiddleware = require('../../middleware/restrictions');
const leaderboardUpdater = require('../../utils/leaderboardUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin and bet on the outcome')
        .addStringOption(option =>
            option.setName('side')
                .setDescription('Choose heads or tails')
                .setRequired(true)
                .addChoices(
                    { name: 'Heads', value: 'heads' },
                    { name: 'Tails', value: 'tails' }
                ))
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
        const allowed = await RestrictionMiddleware.checkCasinoGameRestriction(interaction, 'coinflip');
        if (!allowed) return;

        const side = interaction.options.getString('side');
        const amount = interaction.options.getInteger('amount');
        const userBalance = await database.getUserEconomy(userId, guildId);

        if (userBalance.coins < amount) {
            return interaction.reply({ content: '❌ You don\'t have enough coins!', ephemeral: true });
        }

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = side === result;
        const winAmount = won ? amount : -amount;
        const newCoins = userBalance.coins + winAmount;
        
        await database.updateUserEconomy(userId, guildId, {
            coins: newCoins,
            total_earned: (userBalance.total_earned || 1000) + (won ? amount : 0)
        });

        // Update casino leaderboard immediately for all coinflip games
        leaderboardUpdater.updateCasinoLeaderboardNow(interaction.client);

        const embed = new EmbedBuilder()
            .setColor(won ? 0x00FF00 : 0xFF0000)
            .setTitle('🪙 Coinflip Result')
            .setDescription(`The coin landed on **${result}**!`)
            .addFields(
                { name: 'Your Guess', value: side, inline: true },
                { name: 'Result', value: won ? '✅ You Won!' : '❌ You Lost!', inline: true },
                { name: 'Amount', value: `${won ? '+' : '-'}${amount} coins`, inline: true },
                { name: '💰 New Balance', value: `${newCoins.toLocaleString()} coins`, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};