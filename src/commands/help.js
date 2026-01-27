const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show available commands and their descriptions')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Show commands for a specific category')
                .addChoices(
                    { name: 'General Commands', value: 'general' },
                    { name: 'Casino Games', value: 'casino' },
                    { name: 'Voice Commands', value: 'voice' },
                    { name: 'Auto Role System', value: 'autorole' },
                    { name: 'Staff Commands', value: 'staff' }
                )),

    async execute(interaction) {
        const category = interaction.options.getString('category');
        
        if (category) {
            await showCategoryHelp(interaction, category);
        } else {
            await showGeneralHelp(interaction);
        }
    },
};

async function showGeneralHelp(interaction) {
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🤖 CAFFEINE Bot - Command Help')
        .setDescription('Use `/help category:<category>` to see detailed commands for each section.')
        .addFields(
            { 
                name: '🎮 General Commands', 
                value: '`/help category:general` - Basic bot commands\n`/ping` - Check bot latency\n`/serverinfo` - Server information\n`/userinfo` - User information', 
                inline: false 
            },
            { 
                name: '🎰 Casino Games', 
                value: '`/help category:casino` - All casino games\n`/balance` - Check your balance\n`/daily` - Daily reward\n`/leaderboard` - Top players', 
                inline: false 
            },
            { 
                name: '🔊 Voice Commands', 
                value: '`/help category:voice` - Voice channel management\n`/voice` - Voice channel controls\n`/voicetime` - Check voice activity', 
                inline: false 
            },
            { 
                name: '🎭 Auto Role System', 
                value: '`/help category:autorole` - Role management\nReact to messages to get roles automatically', 
                inline: false 
            },
            { 
                name: '⚙️ Staff Commands', 
                value: '`/help category:staff` - Admin/Staff only commands\n`/admin` - Server administration\n`/clear` - Clear messages', 
                inline: false 
            }
        )
        .setFooter({ text: 'Use the category option to see detailed command information' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function showCategoryHelp(interaction, category) {
    let embed;

    switch (category) {
        case 'general':
            embed = createGeneralCommandsEmbed();
            break;
        case 'casino':
            embed = createCasinoCommandsEmbed();
            break;
        case 'voice':
            embed = createVoiceCommandsEmbed();
            break;
        case 'autorole':
            embed = createAutoRoleCommandsEmbed();
            break;
        case 'staff':
            embed = createStaffCommandsEmbed();
            break;
        default:
            return interaction.reply({ content: '❌ Invalid category selected.', ephemeral: true });
    }

    await interaction.reply({ embeds: [embed] });
}

function createGeneralCommandsEmbed() {
    return new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🎮 General Commands')
        .setDescription('Basic bot commands available to all users')
        .addFields(
            { name: '`/ping`', value: 'Check bot latency and response time', inline: false },
            { name: '`/serverinfo`', value: 'Display detailed server information and statistics', inline: false },
            { name: '`/userinfo [user]`', value: 'Show information about yourself or another user', inline: false },
            { name: '`/help [category]`', value: 'Show this help menu or specific category commands', inline: false }
        )
        .setTimestamp();
}

function createCasinoCommandsEmbed() {
    return new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🎰 Casino Games')
        .setDescription('All available casino games and economy commands')
        .addFields(
            { name: '💰 Economy', value: '`/balance` - Check your current balance\n`/daily` - Claim daily reward\n`/leaderboard` - View top players', inline: false },
            { name: '🎲 Dice Games', value: '`/dice <amount> <number>` - Bet on dice roll\n`/coinflip <amount> <heads/tails>` - Flip a coin\n`/crash <amount>` - Crash gambling game', inline: false },
            { name: '🃏 Card Games', value: '`/blackjack <amount>` - Play blackjack\n`/hilo <amount>` - Higher or lower card game', inline: false },
            { name: '🎰 Slot Games', value: '`/slots <amount>` - Spin the slot machine\n`/wof <amount>` - Wheel of Fortune\n`/roulette <amount> <bet>` - European roulette', inline: false },
            { name: '🎮 Other Games', value: '`/rps <amount> <choice>` - Rock Paper Scissors\n`/minesweeper <amount>` - Minesweeper game', inline: false }
        )
        .setFooter({ text: 'Minimum bet: 10 coins | Use casino channels for best experience' })
        .setTimestamp();
}

function createVoiceCommandsEmbed() {
    return new EmbedBuilder()
        .setColor(0x9932CC)
        .setTitle('🔊 Voice Commands')
        .setDescription('Voice channel management and tracking commands')
        .addFields(
            { name: '`/voice create <name>`', value: 'Create a new voice channel', inline: false },
            { name: '`/voice delete`', value: 'Delete your voice channel (owner only)', inline: false },
            { name: '`/voice rename <name>`', value: 'Rename your voice channel (owner only)', inline: false },
            { name: '`/voice limit <number>`', value: 'Set user limit for your voice channel (owner only)', inline: false },
            { name: '`/voice transfer <user>`', value: 'Transfer ownership of your voice channel', inline: false },
            { name: '`/voicetime [user]`', value: 'Check voice channel activity time for yourself or another user', inline: false }
        )
        .setFooter({ text: 'Voice channels are automatically created when joining the trigger channel' })
        .setTimestamp();
}

function createAutoRoleCommandsEmbed() {
    return new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle('🎭 Auto Role System')
        .setDescription('Automatic role assignment through reactions')
        .addFields(
            { name: '🌍 Timezone Roles', value: 'React to timezone emojis to show when you\'re online:\n🌊 PST/PDT • 🏔️ MST/MDT • 🌆 EST/EDT • 🌸 KST', inline: false },
            { name: '🎯 Activity Roles', value: 'React to show your favorite server activities:\n🎰 Casino Games • 🎤 Voice Chat', inline: false },
            { name: '🎮 Game Roles', value: 'Game-specific roles (to be added based on community interest)', inline: false },
            { name: '🎨 Color Roles', value: 'Request custom color roles using the color selector message', inline: false },
            { name: '📝 How to Use', value: '1. Find the role selection messages in the designated channel\n2. React with the appropriate emoji\n3. Your role will be added automatically\n4. Unreact to remove the role', inline: false }
        )
        .setFooter({ text: 'You can select multiple timezone, activity, and game roles!' })
        .setTimestamp();
}

function createStaffCommandsEmbed() {
    return new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('⚙️ Staff Commands')
        .setDescription('Administrative commands (Admin permissions required)')
        .addFields(
            { name: '🗑️ Moderation', value: '`/clear <amount>` - Delete 1-100 messages (Server Owner only)', inline: false },
            { name: '⚙️ Server Setup', value: '`/admin setup channels` - Configure server channels\n`/admin setup voice` - Setup voice system\n`/admin setup casino` - Setup casino system', inline: false },
            { name: '🔒 Restrictions', value: '`/admin restrictions set` - Set channel command restrictions\n`/admin restrictions list` - View current restrictions', inline: false },
            { name: '🎰 Casino Management', value: '`/admin casino assign-game` - Assign games to specific channels', inline: false },
            { name: '🎭 Auto Role Management', value: '`/autorole-setup create-all` - Create all role selection messages\n`/autorole-setup edit-embed` - Edit role message embeds\n`/autorole-setup add-role` - Add role to existing message\n`/autorole-setup remove-role` - Remove role from message\n`/autorole-setup cleanup-colors` - Remove empty color roles\n`/autorole-setup recache-messages` - Fix reaction role issues', inline: false },
            { name: '📊 Monitoring', value: '`/admin status` - View server configuration\n`/admin dashboard` - Access web dashboard', inline: false }
        )
        .setFooter({ text: 'Some commands require specific permission levels' })
        .setTimestamp();
}