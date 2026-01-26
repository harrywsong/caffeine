const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../database/database');
const RestrictionMiddleware = require('../middleware/restrictions');
const fs = require('fs');
const path = require('path');

// Simple file-based user economy system
const economyFile = path.join(__dirname, '..', 'data', 'economy.json');

function loadEconomy() {
    try {
        if (fs.existsSync(economyFile)) {
            return JSON.parse(fs.readFileSync(economyFile, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading economy:', error);
    }
    return {};
}

function saveEconomy(data) {
    try {
        const dir = path.dirname(economyFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(economyFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving economy:', error);
    }
}

function getUserBalance(userId) {
    const economy = loadEconomy();
    return economy[userId] || { coins: 1000, lastDaily: 0 };
}

function setUserBalance(userId, balance) {
    const economy = loadEconomy();
    economy[userId] = balance;
    saveEconomy(economy);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('casino')
        .setDescription('Casino games and economy commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('balance')
                .setDescription('Check your coin balance'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('daily')
                .setDescription('Claim your daily coins'))
        .addSubcommand(subcommand =>
            subcommand
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
                        .setDescription('Amount to bet')
                        .setRequired(true)
                        .setMinValue(10)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('slots')
                .setDescription('Play the slot machine')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to bet')
                        .setRequired(true)
                        .setMinValue(10)))
        .addSubcommand(subcommand =>
            subcommand
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
                        .setDescription('Amount to bet')
                        .setRequired(true)
                        .setMinValue(10)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('Show the richest users')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        // Check casino game restrictions
        const allowed = await RestrictionMiddleware.checkCasinoGameRestriction(interaction, subcommand);
        if (!allowed) return;

        switch (subcommand) {
            case 'balance':
                await handleBalance(interaction, userId, guildId);
                break;
            case 'daily':
                await handleDaily(interaction, userId, guildId);
                break;
            case 'coinflip':
                await handleCoinflip(interaction, userId, guildId);
                break;
            case 'slots':
                await handleSlots(interaction, userId, guildId);
                break;
            case 'dice':
                await handleDice(interaction, userId, guildId);
                break;
            case 'leaderboard':
                await handleLeaderboard(interaction, guildId);
                break;
        }
    },
};

async function handleBalance(interaction, userId, guildId) {
    const userBalance = await database.getUserEconomy(userId, guildId);
    
    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('💰 Your Balance')
        .setDescription(`You have **${userBalance.coins.toLocaleString()}** coins!`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleDaily(interaction, userId, guildId) {
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

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎁 Daily Reward Claimed!')
        .setDescription(`You received **${dailyAmount}** coins!`)
        .addFields({ name: '💰 New Balance', value: `${newCoins.toLocaleString()} coins`, inline: true })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleCoinflip(interaction, userId) {
    const side = interaction.options.getString('side');
    const amount = interaction.options.getInteger('amount');
    const userBalance = getUserBalance(userId);

    if (userBalance.coins < amount) {
        return interaction.reply({ content: '❌ You don\'t have enough coins!', ephemeral: true });
    }

    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = side === result;
    
    userBalance.coins += won ? amount : -amount;
    setUserBalance(userId, userBalance);

    const embed = new EmbedBuilder()
        .setColor(won ? 0x00FF00 : 0xFF0000)
        .setTitle('🪙 Coinflip Result')
        .setDescription(`The coin landed on **${result}**!`)
        .addFields(
            { name: 'Your Guess', value: side, inline: true },
            { name: 'Result', value: won ? '✅ You Won!' : '❌ You Lost!', inline: true },
            { name: 'Amount', value: `${won ? '+' : '-'}${amount} coins`, inline: true },
            { name: '💰 New Balance', value: `${userBalance.coins.toLocaleString()} coins`, inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleSlots(interaction, userId) {
    const amount = interaction.options.getInteger('amount');
    const userBalance = getUserBalance(userId);

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
    userBalance.coins += winAmount;
    setUserBalance(userId, userBalance);

    const embed = new EmbedBuilder()
        .setColor(winAmount > 0 ? 0x00FF00 : 0xFF0000)
        .setTitle('🎰 Slot Machine')
        .setDescription(`${results.join(' | ')}`)
        .addFields(
            { name: 'Result', value: winAmount > 0 ? '✅ You Won!' : '❌ You Lost!', inline: true },
            { name: 'Amount', value: `${winAmount > 0 ? '+' : ''}${winAmount} coins`, inline: true },
            { name: '💰 New Balance', value: `${userBalance.coins.toLocaleString()} coins`, inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleDice(interaction, userId) {
    const guess = interaction.options.getInteger('guess');
    const amount = interaction.options.getInteger('amount');
    const userBalance = getUserBalance(userId);

    if (userBalance.coins < amount) {
        return interaction.reply({ content: '❌ You don\'t have enough coins!', ephemeral: true });
    }

    const roll = getRandomInt(1, 6);
    const won = guess === roll;
    const winAmount = won ? amount * 5 : -amount; // 5x payout for exact guess
    
    userBalance.coins += winAmount;
    setUserBalance(userId, userBalance);

    const embed = new EmbedBuilder()
        .setColor(won ? 0x00FF00 : 0xFF0000)
        .setTitle('🎲 Dice Roll')
        .setDescription(`The dice rolled **${roll}**!`)
        .addFields(
            { name: 'Your Guess', value: guess.toString(), inline: true },
            { name: 'Result', value: won ? '✅ You Won!' : '❌ You Lost!', inline: true },
            { name: 'Amount', value: `${winAmount > 0 ? '+' : ''}${winAmount} coins`, inline: true },
            { name: '💰 New Balance', value: `${userBalance.coins.toLocaleString()} coins`, inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleLeaderboard(interaction) {
    const economy = loadEconomy();
    const sortedUsers = Object.entries(economy)
        .sort(([,a], [,b]) => b.coins - a.coins)
        .slice(0, 10);

    if (sortedUsers.length === 0) {
        return interaction.reply({ content: '📭 No users found in the economy system!', ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🏆 Coin Leaderboard')
        .setTimestamp();

    let description = '';
    for (let i = 0; i < sortedUsers.length; i++) {
        const [userId, data] = sortedUsers[i];
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        const username = user ? user.username : 'Unknown User';
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        description += `${medal} **${username}** - ${data.coins.toLocaleString()} coins\n`;
    }

    embed.setDescription(description);
    await interaction.reply({ embeds: [embed] });
}