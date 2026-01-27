const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../../database/database');
const leaderboardUpdater = require('../../utils/leaderboardUpdater');
const RestrictionMiddleware = require('../../middleware/restrictions');

// Store active blackjack games
const activeBlackjackGames = new Map();

// Debugging function
function debugBlackjack(gameId, action) {
    console.log(`🃏 [${new Date().toISOString()}] Blackjack ${gameId}: ${action}`);
}

class BlackjackGame {
    constructor(userId, bet) {
        this.userId = userId;
        this.bet = bet;
        this.gameOver = false;
        this.doubledDown = false;
        this.split = false;
        this.splitHands = null; // Will store {hand1: [], hand2: []} when split
        this.currentSplitHand = 0; // 0 for hand1, 1 for hand2
        this.splitHandsComplete = [false, false]; // Track which split hands are done
        this.deck = this.createDeck();
        this.shuffleDeck();
        
        this.playerHand = [this.drawCard(), this.drawCard()];
        this.dealerHand = [this.drawCard(), this.drawCard()];
        
        this.playerBlackjack = this.calculateHandValue(this.playerHand) === 21;
        this.dealerBlackjack = this.calculateHandValue(this.dealerHand) === 21;
        
        if (this.playerBlackjack) {
            this.gameOver = true;
        }
    }
    
    createDeck() {
        const suits = ['♠️', '♥️', '♦️', '♣️'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const deck = [];
        
        for (const suit of suits) {
            for (const rank of ranks) {
                const value = rank === 'A' ? 11 : (['J', 'Q', 'K'].includes(rank) ? 10 : parseInt(rank));
                deck.push({ rank, suit, value });
            }
        }
        return deck;
    }
    
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }
    
    drawCard() {
        if (this.deck.length < 10) {
            this.deck = this.createDeck();
            this.shuffleDeck();
        }
        return this.deck.pop();
    }
    
    calculateHandValue(hand) {
        let total = hand.reduce((sum, card) => sum + card.value, 0);
        let aces = hand.filter(card => card.rank === 'A').length;
        
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }
        return total;
    }
    
    handToString(hand, hideFirst = false) {
        if (hideFirst) {
            return `🔒 ${hand.slice(1).map(card => `${card.rank}${card.suit}`).join(' ')}`;
        }
        return hand.map(card => `${card.rank}${card.suit}`).join(' ');
    }
    
    canDoubleDown() {
        if (this.split) {
            // Can only double down on first card of each split hand
            const currentHand = this.splitHands[`hand${this.currentSplitHand + 1}`];
            return currentHand.length === 2 && !this.doubledDown && !this.gameOver;
        }
        return this.playerHand.length === 2 && !this.doubledDown && !this.gameOver;
    }
    
    canSplit() {
        // Can only split on initial two cards, same rank, not already split, and have enough coins
        if (this.split || this.playerHand.length !== 2 || this.gameOver) return false;
        
        const card1 = this.playerHand[0];
        const card2 = this.playerHand[1];
        
        // Check if same rank (treat all 10-value cards as splittable)
        if (card1.rank === card2.rank) return true;
        if (card1.value === 10 && card2.value === 10) return true; // 10, J, Q, K can split with each other
        
        return false;
    }
    
    splitHand() {
        if (!this.canSplit()) return false;
        
        this.split = true;
        this.splitHands = {
            hand1: [this.playerHand[0], this.drawCard()],
            hand2: [this.playerHand[1], this.drawCard()]
        };
        this.currentSplitHand = 0; // Start with first hand
        this.playerHand = []; // Clear original hand
        
        return true;
    }
    
    getCurrentHand() {
        if (this.split) {
            return this.splitHands[`hand${this.currentSplitHand + 1}`];
        }
        return this.playerHand;
    }
    
    switchToNextSplitHand() {
        if (!this.split) return false;
        
        this.splitHandsComplete[this.currentSplitHand] = true;
        
        if (this.currentSplitHand === 0 && !this.splitHandsComplete[1]) {
            this.currentSplitHand = 1;
            this.doubledDown = false; // Reset double down for second hand
            return true;
        }
        
        // Both hands complete
        return false;
    }
    
    hit() {
        if (this.gameOver) return false;
        
        const currentHand = this.getCurrentHand();
        currentHand.push(this.drawCard());
        
        const value = this.calculateHandValue(currentHand);
        if (value > 21) {
            // Current hand busted
            if (this.split) {
                // Mark current split hand as complete and switch to next
                if (!this.switchToNextSplitHand()) {
                    // Both hands complete
                    this.gameOver = true;
                }
            } else {
                this.gameOver = true;
            }
        }
        return true;
    }
    
    stand() {
        if (this.gameOver) return;
        
        if (this.split) {
            // Mark current split hand as complete and switch to next
            if (!this.switchToNextSplitHand()) {
                // Both hands complete, now dealer plays
                while (this.calculateHandValue(this.dealerHand) < 17) {
                    this.dealerHand.push(this.drawCard());
                }
                this.gameOver = true;
            }
        } else {
            // Dealer hits on soft 17
            while (this.calculateHandValue(this.dealerHand) < 17) {
                this.dealerHand.push(this.drawCard());
            }
            this.gameOver = true;
        }
    }
    
    doubleDown() {
        if (!this.canDoubleDown()) return false;
        this.doubledDown = true;
        this.hit();
        if (!this.gameOver) {
            this.stand();
        }
        return true;
    }
    
    getResult() {
        const dealerValue = this.calculateHandValue(this.dealerHand);
        
        if (this.split) {
            // Calculate results for both split hands
            const hand1Value = this.calculateHandValue(this.splitHands.hand1);
            const hand2Value = this.calculateHandValue(this.splitHands.hand2);
            
            const results = [];
            
            // Result for hand 1
            let result1 = this.getSingleHandResult(hand1Value, dealerValue, false);
            results.push({ ...result1, hand: 1 });
            
            // Result for hand 2
            let result2 = this.getSingleHandResult(hand2Value, dealerValue, false);
            results.push({ ...result2, hand: 2 });
            
            // Calculate total payout
            const totalPayout = result1.payout + result2.payout;
            const totalBet = this.bet * 2; // Split requires double bet
            
            return {
                result: 'split',
                payout: totalPayout,
                totalBet: totalBet,
                hands: results,
                multiplier: totalPayout / totalBet
            };
        } else {
            // Single hand result
            const playerValue = this.calculateHandValue(this.playerHand);
            return this.getSingleHandResult(playerValue, dealerValue, this.playerBlackjack);
        }
    }
    
    getSingleHandResult(playerValue, dealerValue, isBlackjack) {
        if (isBlackjack && this.calculateHandValue(this.dealerHand) !== 21) {
            return { result: 'blackjack', payout: Math.floor(this.bet * 2.5), multiplier: 2.5 };
        } else if (isBlackjack && this.calculateHandValue(this.dealerHand) === 21) {
            return { result: 'push', payout: this.bet, multiplier: 1 };
        } else if (playerValue > 21) {
            return { result: 'bust', payout: 0, multiplier: 0 };
        } else if (dealerValue > 21 || playerValue > dealerValue) {
            const multiplier = this.doubledDown ? 4 : 2;
            return { result: 'win', payout: this.bet * multiplier, multiplier };
        } else if (playerValue === dealerValue) {
            const multiplier = this.doubledDown ? 2 : 1;
            return { result: 'push', payout: this.bet * multiplier, multiplier };
        } else {
            return { result: 'lose', payout: 0, multiplier: 0 };
        }
    }
    
    createEmbed(final = false) {
        const dealerValue = this.calculateHandValue(this.dealerHand);
        
        let title = '🃏 Blackjack';
        let color = 0x0099FF;
        
        if (final) {
            const result = this.getResult();
            if (result.result === 'split') {
                title = '🃏 Blackjack - 🔀 Split Results';
                color = 0x9B59B6;
            } else {
                switch (result.result) {
                    case 'blackjack':
                        title = '🃏 Blackjack - 🎊 BLACKJACK!';
                        color = 0xFFD700;
                        break;
                    case 'win':
                        title = '🃏 Blackjack - 🏆 You Win!';
                        color = 0x00FF00;
                        break;
                    case 'bust':
                        title = '🃏 Blackjack - 💥 Bust!';
                        color = 0xFF0000;
                        break;
                    case 'lose':
                        title = '🃏 Blackjack - 😞 You Lose';
                        color = 0xFF0000;
                        break;
                    case 'push':
                        title = '🃏 Blackjack - 🤝 Push';
                        color = 0xFFFF00;
                        break;
                }
            }
        }
        
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(color)
            .setTimestamp();
        
        // Game display
        let gameDisplay = `**Dealer Hand:**\n${this.handToString(this.dealerHand, !final && !this.gameOver)}`;
        if (final || this.gameOver) {
            gameDisplay += ` \`(${dealerValue})\``;
        } else {
            gameDisplay += ' `(?)`';
        }
        
        if (this.split) {
            // Display both split hands
            const hand1Value = this.calculateHandValue(this.splitHands.hand1);
            const hand2Value = this.calculateHandValue(this.splitHands.hand2);
            
            gameDisplay += `\n\n**Your Hand 1:**\n${this.handToString(this.splitHands.hand1)} \`(${hand1Value})\``;
            if (this.currentSplitHand === 0 && !final) {
                gameDisplay += ' ← **Current**';
            }
            
            gameDisplay += `\n**Your Hand 2:**\n${this.handToString(this.splitHands.hand2)} \`(${hand2Value})\``;
            if (this.currentSplitHand === 1 && !final) {
                gameDisplay += ' ← **Current**';
            }
        } else {
            const playerValue = this.calculateHandValue(this.playerHand);
            gameDisplay += `\n\n**Your Hand:**\n${this.handToString(this.playerHand)} \`(${playerValue})\``;
            
            if (this.playerBlackjack) {
                gameDisplay += ' (Blackjack!)';
            }
        }
        
        embed.addFields({ name: '🎯 Game Status', value: gameDisplay, inline: false });
        
        // Betting info
        let betInfo = `💰 **Base Bet:** ${this.bet.toLocaleString()} coins`;
        if (this.split) {
            betInfo += `\n🔀 **Split Bet:** ${this.bet.toLocaleString()} coins`;
            betInfo += `\n📊 **Total Risk:** ${(this.bet * 2).toLocaleString()} coins`;
        } else {
            if (this.doubledDown) {
                betInfo += `\n⬆️ **Doubled Down:** ${this.bet.toLocaleString()} coins`;
            }
            const totalRisk = this.bet * (this.doubledDown ? 2 : 1);
            betInfo += `\n📊 **Total Risk:** ${totalRisk.toLocaleString()} coins`;
        }
        
        embed.addFields({ name: '💳 Betting Info', value: betInfo, inline: false });
        
        return embed;
    }
    
    createButtons() {
        const row = new ActionRowBuilder();
        
        const hitButton = new ButtonBuilder()
            .setCustomId('hit')
            .setLabel('Hit')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('➕')
            .setDisabled(this.gameOver);
        
        const standButton = new ButtonBuilder()
            .setCustomId('stand')
            .setLabel('Stand')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('✋')
            .setDisabled(this.gameOver);
        
        const doubleButton = new ButtonBuilder()
            .setCustomId('double')
            .setLabel('Double Down')
            .setStyle(ButtonStyle.Success)
            .setEmoji('⬆️')
            .setDisabled(!this.canDoubleDown());
        
        const splitButton = new ButtonBuilder()
            .setCustomId('split')
            .setLabel('Split')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔀')
            .setDisabled(!this.canSplit());
        
        row.addComponents(hitButton, standButton, doubleButton, splitButton);
        return row;
    }
}

async function startBlackjackGame(interaction, userId, guildId, amount) {
    const userBalance = await database.getUserEconomy(userId, guildId);

    if (userBalance.coins < amount) {
        return interaction.reply({ content: '❌ You don\'t have enough coins!', ephemeral: true });
    }

    // Deduct bet amount
    await database.updateUserEconomy(userId, guildId, {
        coins: userBalance.coins - amount,
        total_earned: userBalance.total_earned || 1000
    });

    // Create new blackjack game
    const game = new BlackjackGame(userId, amount);
    const gameId = `blackjack_${userId}_${Date.now()}`;
    
    debugBlackjack(gameId, 'CREATED');
    
    // Store game with extended timeout
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
            activeBlackjackGames.delete(gameId);
            debugBlackjack(gameId, 'EXPIRED after 24 hours of inactivity');
        }, 86400000); // 24 hours
    };
    
    setupTimeout();
    activeBlackjackGames.set(gameId, gameData);
    
    debugBlackjack(gameId, `STORED - Active games: ${activeBlackjackGames.size}`);

    const embed = game.createEmbed();
    const buttons = game.createButtons();

    // Store game ID in button custom IDs
    buttons.components.forEach(button => {
        const originalId = button.data.custom_id;
        const newId = `blackjack_${originalId}_${gameId}`;
        button.setCustomId(newId);
        debugBlackjack(gameId, `Set button ID: ${newId}`);
    });

    await interaction.reply({ embeds: [embed], components: [buttons] });

    // If player has blackjack, end game immediately
    if (game.gameOver) {
        setTimeout(async () => {
            await endBlackjackGame(interaction, game, gameId);
        }, 2000);
    }
}

async function handleBlackjackButton(interaction) {
    const customId = interaction.customId;
    console.log(`🔍 Full customId: "${customId}"`);
    
    // Parse: blackjack_action_blackjack_userId_timestamp
    const parts = customId.split('_');
    console.log(`🔍 Split parts:`, parts);
    
    if (parts.length < 4 || parts[0] !== 'blackjack') {
        console.log(`🔍 Invalid button format`);
        return interaction.reply({ content: '❌ Invalid button!', ephemeral: true });
    }
    
    const action = parts[1]; // hit, stand, double
    const gameId = parts.slice(2).join('_'); // blackjack_userId_timestamp
    
    console.log(`🔍 Parsed action: "${action}"`);
    console.log(`🔍 Parsed gameId: "${gameId}"`);
    
    debugBlackjack(gameId, `BUTTON CLICKED: ${action} - Active games: ${activeBlackjackGames.size}`);
    
    const gameData = activeBlackjackGames.get(gameId);
    if (!gameData) {
        debugBlackjack(gameId, 'NOT FOUND in active games');
        console.log(`🔍 Available game IDs:`, Array.from(activeBlackjackGames.keys()));
        return interaction.reply({ content: '❌ Game session expired! Please start a new game with `/casino blackjack`.', ephemeral: true });
    }

    const game = gameData.game;
    if (interaction.user.id !== game.userId) {
        return interaction.reply({ content: '❌ This is not your game!', ephemeral: true });
    }

    // Refresh the timeout on activity - 24 HOURS
    gameData.lastActivity = Date.now();
    if (gameData.timeoutId) {
        clearTimeout(gameData.timeoutId);
        gameData.timeoutId = setTimeout(() => {
            activeBlackjackGames.delete(gameId);
            debugBlackjack(gameId, 'EXPIRED after 24 hours of inactivity');
        }, 86400000); // 24 hours
    }
    
    debugBlackjack(gameId, `ACTIVITY REFRESHED - timeout reset to 24 hours`);

    await interaction.deferUpdate();

    let gameEnded = false;

    switch (action) {
        case 'hit':
            game.hit();
            if (game.gameOver) gameEnded = true;
            break;
        case 'stand':
            game.stand();
            if (game.gameOver) gameEnded = true;
            break;
        case 'double':
            const userBalance = await database.getUserEconomy(game.userId, interaction.guild.id);
            if (userBalance.coins < game.bet) {
                return interaction.followUp({ content: '❌ Not enough coins to double down!', ephemeral: true });
            }
            
            // Deduct additional bet
            await database.updateUserEconomy(game.userId, interaction.guild.id, {
                coins: userBalance.coins - game.bet,
                total_earned: userBalance.total_earned || 1000
            });
            
            game.doubleDown();
            if (game.gameOver) gameEnded = true;
            break;
        case 'split':
            const userBalanceForSplit = await database.getUserEconomy(game.userId, interaction.guild.id);
            if (userBalanceForSplit.coins < game.bet) {
                return interaction.followUp({ content: '❌ Not enough coins to split! You need another bet equal to your original bet.', ephemeral: true });
            }
            
            // Deduct additional bet for split
            await database.updateUserEconomy(game.userId, interaction.guild.id, {
                coins: userBalanceForSplit.coins - game.bet,
                total_earned: userBalanceForSplit.total_earned || 1000
            });
            
            game.splitHand();
            debugBlackjack(gameId, `SPLIT - Now playing hand 1`);
            break;
    }

    if (gameEnded) {
        await endBlackjackGame(interaction, game, gameId);
    } else {
        const embed = game.createEmbed();
        const buttons = game.createButtons();
        
        // Update button IDs
        buttons.components.forEach(button => {
            const originalId = button.data.custom_id;
            const newId = `blackjack_${originalId}_${gameId}`;
            button.setCustomId(newId);
            debugBlackjack(gameId, `Updated button ID: ${newId}`);
        });
        
        await interaction.editReply({ embeds: [embed], components: [buttons] });
    }
}

async function endBlackjackGame(interaction, game, gameId) {
    const result = game.getResult();
    
    // Update user balance with payout
    if (result.payout > 0) {
        const userBalance = await database.getUserEconomy(game.userId, interaction.guild.id);
        await database.updateUserEconomy(game.userId, interaction.guild.id, {
            coins: userBalance.coins + result.payout,
            total_earned: (userBalance.total_earned || 1000) + (result.payout > (result.totalBet || game.bet) ? result.payout - (result.totalBet || game.bet) : 0)
        });
    }

    // Update leaderboard
    leaderboardUpdater.updateCasinoLeaderboardNow(interaction.client);

    const embed = game.createEmbed(true);
    
    // Add result information
    let resultText = '';
    
    if (result.result === 'split') {
        resultText = '🔀 **Split Results:**\n\n';
        
        result.hands.forEach((handResult, index) => {
            const handNum = handResult.hand;
            let handText = `**Hand ${handNum}:** `;
            
            switch (handResult.result) {
                case 'blackjack':
                    handText += '🎊 BLACKJACK!';
                    break;
                case 'win':
                    handText += '🎉 Win!';
                    break;
                case 'bust':
                    handText += '💥 Bust!';
                    break;
                case 'lose':
                    handText += '😞 Lose';
                    break;
                case 'push':
                    handText += '🤝 Push';
                    break;
            }
            
            if (handResult.payout > 0) {
                const profit = handResult.payout - game.bet;
                handText += ` (+${handResult.payout.toLocaleString()} coins)`;
            } else {
                handText += ` (-${game.bet.toLocaleString()} coins)`;
            }
            
            resultText += handText + '\n';
        });
        
        const totalBet = result.totalBet;
        const totalProfit = result.payout - totalBet;
        
        resultText += `\n💰 **Total Payout:** ${result.payout.toLocaleString()} coins`;
        if (totalProfit > 0) {
            resultText += `\n📈 **Total Profit:** +${totalProfit.toLocaleString()} coins`;
        } else if (totalProfit === 0) {
            resultText += `\n🤝 **Break Even**`;
        } else {
            resultText += `\n📉 **Total Loss:** ${Math.abs(totalProfit).toLocaleString()} coins`;
        }
        
    } else {
        // Single hand result
        const totalBet = game.bet * (game.doubledDown ? 2 : 1);
        
        switch (result.result) {
            case 'blackjack':
                resultText = '🎊 **BLACKJACK!**';
                break;
            case 'win':
                resultText = '🎉 **You Win!**';
                break;
            case 'bust':
                resultText = '💥 **Bust!**';
                break;
            case 'lose':
                resultText = '😞 **You Lose**';
                break;
            case 'push':
                resultText = '🤝 **Push (Tie)**';
                break;
        }
        
        if (result.payout > 0) {
            const profit = result.payout - totalBet;
            resultText += `\n\n💰 **Payout:** ${result.payout.toLocaleString()} coins`;
            if (profit > 0) {
                resultText += `\n📈 **Profit:** +${profit.toLocaleString()} coins`;
            } else if (profit === 0) {
                resultText += `\n🤝 **Break Even**`;
            }
        } else {
            resultText += `\n\n💸 **Loss:** ${totalBet.toLocaleString()} coins`;
        }
    }
    
    embed.addFields({ name: '📊 Game Result', value: resultText, inline: false });
    
    // Show new balance
    const newBalance = await database.getUserEconomy(game.userId, interaction.guild.id);
    embed.addFields({ name: '🏦 Current Balance', value: `${newBalance.coins.toLocaleString()} coins`, inline: false });
    
    // Disable all buttons
    const disabledButtons = game.createButtons();
    disabledButtons.components.forEach(button => button.setDisabled(true));
    
    await interaction.editReply({ embeds: [embed], components: [disabledButtons] });
    
    // Clean up game and clear timeout
    const gameData = activeBlackjackGames.get(gameId);
    if (gameData && gameData.timeoutId) {
        clearTimeout(gameData.timeoutId);
    }
    activeBlackjackGames.delete(gameId);
    debugBlackjack(gameId, 'CLEANED UP - game ended');
}

function getActiveBlackjackGames() {
    return activeBlackjackGames;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play blackjack with hit, stand, double down, and split options')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount to bet (25-1000)')
                .setRequired(true)
                .setMinValue(25)
                .setMaxValue(1000)),

    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const amount = interaction.options.getInteger('amount');

        // Check casino game restrictions
        const allowed = await RestrictionMiddleware.checkCasinoGameRestriction(interaction, 'blackjack');
        if (!allowed) return;

        await startBlackjackGame(interaction, userId, guildId, amount);
    },

    // Handle button interactions
    async handleButtonInteraction(interaction) {
        await handleBlackjackButton(interaction);
    },

    // Export utility functions for other modules
    startBlackjackGame,
    handleBlackjackButton,
    getActiveBlackjackGames
};