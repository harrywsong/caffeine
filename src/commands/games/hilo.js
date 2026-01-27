const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../../database/database');
const RestrictionMiddleware = require('../../middleware/restrictions');
const leaderboardUpdater = require('../../utils/leaderboardUpdater');

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Hi-Lo Game Class
class HiLoGame {
    constructor(userId, bet) {
        this.userId = userId;
        this.bet = bet;
        this.currentCard = this.drawCard();
        this.nextCard = null;
        this.gameOver = false;
        this.streak = 0;
        this.totalWinnings = 0;
    }
    
    drawCard() {
        const suits = ['♠️', '♥️', '♦️', '♣️'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const suit = suits[getRandomInt(0, suits.length - 1)];
        const rank = ranks[getRandomInt(0, ranks.length - 1)];
        const value = rank === 'A' ? 1 : (rank === 'J' ? 11 : (rank === 'Q' ? 12 : (rank === 'K' ? 13 : parseInt(rank))));
        
        return { suit, rank, value };
    }
    
    makeGuess(guess) {
        if (this.gameOver) return { valid: false };
        
        this.nextCard = this.drawCard();
        let correct = false;
        
        if (guess === 'higher' && this.nextCard.value > this.currentCard.value) {
            correct = true;
        } else if (guess === 'lower' && this.nextCard.value < this.currentCard.value) {
            correct = true;
        } else if (guess === 'equal' && this.nextCard.value === this.currentCard.value) {
            correct = true;
        }
        
        if (correct) {
            this.streak++;
            // Calculate total potential winnings based on streak (not accumulated)
            const multiplier = 1 + (this.streak * 0.2); // Increased multiplier since it's riskier
            this.totalWinnings = Math.floor(this.bet * multiplier); // Total potential, not accumulated
            this.currentCard = this.nextCard;
            return { valid: true, correct: true, multiplier };
        } else {
            this.gameOver = true;
            this.totalWinnings = 0; // Lose everything on wrong guess
            return { valid: true, correct: false };
        }
    }
    
    cashOut() {
        this.gameOver = true;
        return this.totalWinnings;
    }
    
    createEmbed() {
        let title = '🎴 Hi-Lo Card Game';
        let color = 0x0099FF;
        
        if (this.gameOver) {
            if (this.totalWinnings > 0) {
                title = '🎴 Hi-Lo - 🏆 You Won!';
                color = 0x00FF00;
            } else {
                title = '🎴 Hi-Lo - 💥 You Lost Everything!';
                color = 0xFF0000;
            }
        }
        
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(color)
            .setTimestamp();
        
        let gameDisplay = `**Current Card:** ${this.currentCard.rank}${this.currentCard.suit} (Value: ${this.currentCard.value})\n`;
        
        if (this.nextCard) {
            gameDisplay += `**Next Card:** ${this.nextCard.rank}${this.nextCard.suit} (Value: ${this.nextCard.value})\n`;
        }
        
        gameDisplay += `**Streak:** ${this.streak} correct guesses`;
        
        embed.addFields({ name: '🎯 Game Status', value: gameDisplay, inline: false });
        
        let betInfo = `💰 **Original Bet:** ${this.bet.toLocaleString()} coins\n`;
        
        if (this.gameOver) {
            if (this.totalWinnings > 0) {
                const profit = this.totalWinnings - this.bet;
                betInfo += `💵 **Final Payout:** ${this.totalWinnings.toLocaleString()} coins\n`;
                betInfo += `📈 **Profit:** +${profit.toLocaleString()} coins`;
            } else {
                betInfo += `💸 **Loss:** ${this.bet.toLocaleString()} coins\n`;
                betInfo += `⚠️ **All winnings lost!**`;
            }
        } else {
            betInfo += `🎯 **Potential Payout:** ${this.totalWinnings.toLocaleString()} coins\n`;
            
            if (this.streak > 0) {
                const nextMultiplier = 1 + ((this.streak + 1) * 0.2);
                const nextPotential = Math.floor(this.bet * nextMultiplier);
                betInfo += `⚡ **Next Potential:** ${nextPotential.toLocaleString()} coins (${nextMultiplier.toFixed(1)}x)\n`;
                betInfo += `⚠️ **Risk:** Wrong guess = lose everything!`;
            } else {
                betInfo += `🎯 **Next Multiplier:** 1.2x`;
            }
        }
        
        embed.addFields({ name: '💳 Betting Info', value: betInfo, inline: false });
        
        return embed;
    }
    
    createButtons() {
        const row = new ActionRowBuilder();
        
        const higherButton = new ButtonBuilder()
            .setCustomId('hilo_higher')
            .setLabel('Higher')
            .setStyle(ButtonStyle.Success)
            .setEmoji('⬆️')
            .setDisabled(this.gameOver);
        
        const lowerButton = new ButtonBuilder()
            .setCustomId('hilo_lower')
            .setLabel('Lower')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⬇️')
            .setDisabled(this.gameOver);
        
        const equalButton = new ButtonBuilder()
            .setCustomId('hilo_equal')
            .setLabel('Equal')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🟰')
            .setDisabled(this.gameOver);
        
        row.addComponents(higherButton, lowerButton, equalButton);
        
        if (this.streak > 0 && !this.gameOver) {
            const cashOutButton = new ButtonBuilder()
                .setCustomId('hilo_cashout')
                .setLabel(`Cash Out (${this.totalWinnings.toLocaleString()})`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('💰');
            
            const row2 = new ActionRowBuilder().addComponents(cashOutButton);
            return [row, row2];
        }
        
        return [row];
    }
}

// Store active games
const activeHiLoGames = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hilo')
        .setDescription('All-or-nothing Hi-Lo streak game - wrong guess loses everything!')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount to bet (25-500)')
                .setRequired(true)
                .setMinValue(25)
                .setMaxValue(500)),

    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        // Check casino game restrictions
        const allowed = await RestrictionMiddleware.checkCasinoGameRestriction(interaction, 'hilo');
        if (!allowed) return;

        await handleHiLo(interaction, userId, guildId);
    },

    // Handle button interactions
    async handleButtonInteraction(interaction) {
        const customId = interaction.customId;
        
        if (customId.startsWith('hilo_')) {
            await handleHiLoButton(interaction, customId);
        }
    }
};

async function handleHiLo(interaction, userId, guildId) {
    const amount = interaction.options.getInteger('amount');
    const userBalance = await database.getUserEconomy(userId, guildId);

    if (userBalance.coins < amount) {
        return interaction.reply({ content: '❌ You don\'t have enough coins!', ephemeral: true });
    }

    // Deduct bet amount
    await database.updateUserEconomy(userId, guildId, {
        coins: userBalance.coins - amount,
        total_earned: userBalance.total_earned || 1000
    });

    // Create new Hi-Lo game
    const game = new HiLoGame(userId, amount);
    const gameId = `hilo_${userId}_${Date.now()}`;
    
    // Store game with extended timeout and activity tracking
    const gameData = {
        game: game,
        lastActivity: Date.now(),
        timeoutId: null
    };
    
    // Set up auto-cleanup - 24 HOURS timeout
    const setupTimeout = () => {
        if (gameData.timeoutId) {
            clearTimeout(gameData.timeoutId);
        }
        gameData.timeoutId = setTimeout(() => {
            activeHiLoGames.delete(gameId);
            console.log(`🎴 Hi-Lo game ${gameId} expired after 24 hours of inactivity`);
        }, 86400000); // 24 hours
    };
    
    setupTimeout();
    activeHiLoGames.set(gameId, gameData);

    const embed = game.createEmbed();
    const buttons = game.createButtons();

    // Store game ID in buttons
    buttons.forEach(row => {
        row.components.forEach(button => {
            button.setCustomId(`${button.data.custom_id}_${gameId}`);
        });
    });

    await interaction.reply({ embeds: [embed], components: buttons });
}

async function handleHiLoButton(interaction, customIdWithGame) {
    const parts = customIdWithGame.split('_');
    const action = parts[1];
    const gameId = parts.slice(2).join('_');
    
    console.log(`🎴 Hi-Lo button clicked: ${action} for game ${gameId}`);
    
    const gameData = activeHiLoGames.get(gameId);
    if (!gameData) {
        console.log(`🎴 Game ${gameId} not found in active games`);
        return interaction.reply({ content: '❌ Game session expired! Please start a new game with `/hilo`.', ephemeral: true });
    }

    const game = gameData.game;
    if (interaction.user.id !== game.userId) {
        return interaction.reply({ content: '❌ This is not your game!', ephemeral: true });
    }

    // Refresh timeout on activity - 24 HOURS
    gameData.lastActivity = Date.now();
    if (gameData.timeoutId) {
        clearTimeout(gameData.timeoutId);
        gameData.timeoutId = setTimeout(() => {
            activeHiLoGames.delete(gameId);
            console.log(`🎴 Hi-Lo game ${gameId} expired after 24 hours of inactivity`);
        }, 86400000); // 24 hours
    }
    
    console.log(`🎴 Game ${gameId} activity refreshed - timeout reset to 24 hours`);

    await interaction.deferUpdate();

    if (action === 'cashout') {
        const payout = game.cashOut();
        console.log(`🎴 Game ${gameId} cashed out for ${payout} coins`);
        await endHiLoGame(interaction, game, gameId, payout);
    } else {
        const result = game.makeGuess(action);
        
        if (!result.valid) return;
        
        if (game.gameOver) {
            console.log(`🎴 Game ${gameId} ended - ${result.correct ? 'correct guess' : 'wrong guess'}`);
            await endHiLoGame(interaction, game, gameId, game.totalWinnings);
        } else {
            // Update display
            const embed = game.createEmbed();
            const buttons = game.createButtons();
            
            buttons.forEach(row => {
                row.components.forEach(button => {
                    button.setCustomId(`${button.data.custom_id}_${gameId}`);
                });
            });
            
            await interaction.editReply({ embeds: [embed], components: buttons });
        }
    }
}

async function endHiLoGame(interaction, game, gameId, payout) {
    // Update user balance with payout
    if (payout > 0) {
        const userBalance = await database.getUserEconomy(game.userId, interaction.guild.id);
        await database.updateUserEconomy(game.userId, interaction.guild.id, {
            coins: userBalance.coins + payout,
            total_earned: (userBalance.total_earned || 1000) + (payout > game.bet ? payout - game.bet : 0)
        });
    }

    // Update leaderboard
    leaderboardUpdater.updateCasinoLeaderboardNow(interaction.client);

    const embed = game.createEmbed();
    
    // Show new balance
    const newBalance = await database.getUserEconomy(game.userId, interaction.guild.id);
    embed.addFields({ name: '🏦 Current Balance', value: `${newBalance.coins.toLocaleString()} coins`, inline: false });
    
    // Disable buttons
    const buttons = game.createButtons();
    buttons.forEach(row => {
        row.components.forEach(button => button.setDisabled(true));
    });
    
    await interaction.editReply({ embeds: [embed], components: buttons });
    
    // Clean up game and clear timeout
    const gameData = activeHiLoGames.get(gameId);
    if (gameData && gameData.timeoutId) {
        clearTimeout(gameData.timeoutId);
    }
    activeHiLoGames.delete(gameId);
}

function getActiveHiLoGames() {
    return activeHiLoGames;
}

module.exports.getActiveHiLoGames = getActiveHiLoGames;