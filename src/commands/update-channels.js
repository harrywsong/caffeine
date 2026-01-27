const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// Channel IDs
const REGULAR_COMMANDS_CHANNEL = '1465474884867199008';
const STAFF_COMMANDS_CHANNEL = '1465474886788190282';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('update-channels')
        .setDescription('Update command documentation channels (Server Owner only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        // Check if user is the server owner
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({
                content: '❌ This command can only be used by the server owner.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Get channels
            const regularChannel = await interaction.client.channels.fetch(REGULAR_COMMANDS_CHANNEL);
            const staffChannel = await interaction.client.channels.fetch(STAFF_COMMANDS_CHANNEL);
            
            // Clear existing messages
            await clearChannel(regularChannel);
            await clearChannel(staffChannel);
            
            // Post new content
            await postRegularCommands(regularChannel);
            await postStaffCommands(staffChannel);
            
            await interaction.editReply({
                content: '✅ Command channels updated successfully!'
            });
            
        } catch (error) {
            console.error('Error updating channels:', error);
            await interaction.editReply({
                content: '❌ Failed to update command channels. Check console for details.'
            });
        }
    },
};

async function clearChannel(channel) {
    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        if (messages.size > 0) {
            await channel.bulkDelete(messages);
        }
    } catch (error) {
        console.log('Could not bulk delete messages (may be older than 14 days)');
    }
}

async function postRegularCommands(channel) {
    // Header
    const headerEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🤖 CAFFEINE Bot - User Commands')
        .setDescription('Welcome! Here are all the commands available to regular users. Use `/help` for interactive help!')
        .setTimestamp();
    
    await channel.send({ embeds: [headerEmbed] });
    
    // General Commands
    const generalEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎮 General Commands')
        .addFields(
            { name: '`/help [category]`', value: 'Show available commands and help information', inline: false },
            { name: '`/ping`', value: 'Check bot latency and response time', inline: false },
            { name: '`/serverinfo`', value: 'Display detailed server information and statistics', inline: false },
            { name: '`/userinfo [user]`', value: 'Show information about yourself or another user', inline: false }
        );
    
    await channel.send({ embeds: [generalEmbed] });
    
    // Economy Commands
    const economyEmbed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('💰 Economy Commands')
        .addFields(
            { name: '`/balance [user]`', value: 'Check your current balance or another user\'s balance', inline: false },
            { name: '`/daily`', value: 'Claim your daily reward (24-hour cooldown)', inline: false },
            { name: '`/leaderboard [type]`', value: 'View casino or voice leaderboards', inline: false }
        );
    
    await channel.send({ embeds: [economyEmbed] });
    
    // Casino Games - Dice & Coin
    const diceEmbed = new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle('🎲 Dice & Coin Games')
        .addFields(
            { name: '`/dice <amount> <number>`', value: 'Bet on dice roll (1-6) • **Payout:** 5x your bet', inline: false },
            { name: '`/coinflip <amount> <heads/tails>`', value: 'Flip a coin and bet on outcome • **Payout:** 2x your bet', inline: false },
            { name: '`/crash <amount>`', value: 'Crash gambling - cash out before it crashes!', inline: false }
        )
        .setFooter({ text: 'Minimum bet: 10 coins' });
    
    await channel.send({ embeds: [diceEmbed] });
    
    // Casino Games - Cards
    const cardEmbed = new EmbedBuilder()
        .setColor(0x4ECDC4)
        .setTitle('🃏 Card Games')
        .addFields(
            { name: '`/blackjack <amount>`', value: 'Play blackjack vs dealer • **Payout:** 2x win, 2.5x blackjack', inline: false },
            { name: '`/hilo <amount>`', value: 'Higher or lower card guessing game', inline: false }
        )
        .setFooter({ text: 'Minimum bet: 10 coins' });
    
    await channel.send({ embeds: [cardEmbed] });
    
    // Casino Games - Slots & Wheels
    const slotEmbed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('🎰 Slot & Wheel Games')
        .addFields(
            { name: '`/slots <amount>`', value: 'Spin the slot machine • **Payout:** Varies by symbols', inline: false },
            { name: '`/wof <amount>`', value: 'Spin the Wheel of Fortune', inline: false },
            { name: '`/roulette <amount> <bet>`', value: 'European roulette • **Bet:** red/black/odd/even/1-36', inline: false }
        )
        .setFooter({ text: 'Roulette payouts: 2x for red/black/odd/even, 36x for numbers' });
    
    await channel.send({ embeds: [slotEmbed] });
    
    // Other Games
    const otherEmbed = new EmbedBuilder()
        .setColor(0xF39C12)
        .setTitle('🎮 Other Games')
        .addFields(
            { name: '`/rps <amount> <choice>`', value: 'Rock Paper Scissors vs bot • **Payout:** 2x your bet', inline: false },
            { name: '`/minesweeper <amount>`', value: 'Minesweeper gambling - avoid mines, cash out anytime', inline: false }
        )
        .setFooter({ text: 'Minimum bet: 10 coins' });
    
    await channel.send({ embeds: [otherEmbed] });
    
    // Voice Commands
    const voiceEmbed = new EmbedBuilder()
        .setColor(0x9932CC)
        .setTitle('🔊 Voice Commands')
        .addFields(
            { name: '`/voice create <name>`', value: 'Create a new voice channel', inline: false },
            { name: '`/voice delete`', value: 'Delete your voice channel (owner only)', inline: false },
            { name: '`/voice rename <name>`', value: 'Rename your voice channel (owner only)', inline: false },
            { name: '`/voice limit <number>`', value: 'Set user limit (0 = unlimited, owner only)', inline: false },
            { name: '`/voice transfer <user>`', value: 'Transfer channel ownership', inline: false },
            { name: '`/voicetime [user]`', value: 'Check voice activity time for yourself or another user', inline: false }
        )
        .setFooter({ text: 'Voice channels auto-create when joining trigger channel' });
    
    await channel.send({ embeds: [voiceEmbed] });
    
    // Auto Role System
    const roleEmbed = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle('🎭 Auto Role System')
        .setDescription('**No commands needed!** Just react to role messages to get roles automatically.')
        .addFields(
            { name: '🌍 Timezone Roles', value: '🌊 PST/PDT • 🏔️ MST/MDT • 🌆 EST/EDT • 🌸 KST\n*Shows when you\'re typically online*', inline: false },
            { name: '🎯 Activity Roles', value: '🎰 Casino Games • 🎤 Voice Chat\n*Shows your favorite server activities*', inline: false },
            { name: '🎮 Game Roles', value: 'Game-specific roles (added based on community interest)', inline: false },
            { name: '🎨 Color Roles', value: 'Use the color selector to request custom colors', inline: false },
            { name: '📝 How to Use', value: '1. Find role messages in the designated channel\n2. React with the emoji\n3. Role added automatically\n4. Unreact to remove', inline: false }
        )
        .setFooter({ text: 'You can have multiple timezone/activity roles, but only one color' });
    
    await channel.send({ embeds: [roleEmbed] });
    
    // Tips & Info
    const tipsEmbed = new EmbedBuilder()
        .setColor(0x17A2B8)
        .setTitle('💡 Tips & Information')
        .addFields(
            { name: '🎰 Casino Tips', value: '• Minimum bet: 10 coins\n• Claim daily rewards\n• Use casino channels for best experience\n• Set personal limits', inline: true },
            { name: '🔊 Voice Tips', value: '• Join trigger channel to auto-create\n• Channel owners can manage settings\n• Empty channels auto-delete\n• Transfer ownership anytime', inline: true },
            { name: '🎭 Role Tips', value: '• Roles update instantly\n• Multiple timezone/activity roles OK\n• One color role at a time\n• Roles persist through restarts', inline: true }
        )
        .addFields(
            { name: '🆘 Need Help?', value: 'Use `/help` for interactive assistance or ask staff members!', inline: false }
        );
    
    await channel.send({ embeds: [tipsEmbed] });
}

async function postStaffCommands(channel) {
    // Header
    const headerEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🛡️ CAFFEINE Bot - Staff Commands')
        .setDescription('Administrative commands for staff members. Most require Administrator permissions.')
        .setTimestamp();
    
    await channel.send({ embeds: [headerEmbed] });
    
    // Moderation
    const modEmbed = new EmbedBuilder()
        .setColor(0xDC3545)
        .setTitle('🗑️ Moderation Commands')
        .addFields(
            { name: '`/clear <amount>`', value: '**Server Owner Only** - Delete 1-100 messages from current channel\n• Cannot delete messages older than 14 days\n• Reports skipped messages', inline: false }
        );
    
    await channel.send({ embeds: [modEmbed] });
    
    // Admin Setup
    const setupEmbed = new EmbedBuilder()
        .setColor(0x28A745)
        .setTitle('⚙️ Server Setup Commands')
        .addFields(
            { name: '`/admin setup channels`', value: 'Configure server channels (logs, announcements, welcome, roles)', inline: false },
            { name: '`/admin setup voice`', value: 'Setup voice system (category, trigger channel, name template)', inline: false },
            { name: '`/admin setup casino`', value: 'Setup casino system (category for casino channels)', inline: false }
        );
    
    await channel.send({ embeds: [setupEmbed] });
    
    // Admin Management
    const adminEmbed = new EmbedBuilder()
        .setColor(0x007BFF)
        .setTitle('🔧 Server Management Commands')
        .addFields(
            { name: '`/admin restrictions set`', value: 'Set command restrictions for channels\n• **Parameters:** channel, command type, allowed (true/false)', inline: false },
            { name: '`/admin restrictions list`', value: 'View all current channel restrictions', inline: false },
            { name: '`/admin casino assign-game`', value: 'Assign specific games to channels\n• **Games:** coinflip, slots, dice, blackjack, all', inline: false },
            { name: '`/admin status`', value: 'View complete server configuration status', inline: false },
            { name: '`/admin dashboard`', value: 'Get web dashboard access link', inline: false }
        );
    
    await channel.send({ embeds: [adminEmbed] });
    
    // Auto Role Setup
    const roleSetupEmbed = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle('🎭 Auto Role Setup Commands')
        .addFields(
            { name: '`/autorole-setup create-all`', value: 'Create all role selection messages (timezone, activities, games, color)', inline: false },
            { name: '`/autorole-setup create-color`', value: 'Create only the color role selection message', inline: false },
            { name: '`/autorole-setup create-timezone`', value: 'Create only the timezone role selection message', inline: false },
            { name: '`/autorole-setup create-activities`', value: 'Create only the activities role selection message', inline: false },
            { name: '`/autorole-setup create-games`', value: 'Create only the games role selection message', inline: false }
        );
    
    await channel.send({ embeds: [roleSetupEmbed] });
    
    // Auto Role Management
    const roleManageEmbed = new EmbedBuilder()
        .setColor(0x6F42C1)
        .setTitle('🎯 Auto Role Management Commands')
        .addFields(
            { name: '`/autorole-setup add-role`', value: 'Add role to existing message\n• **Parameters:** message-id, role, emoji\n• **Example:** `/autorole-setup add-role message-id:123 role:@NewRole emoji:🎮`', inline: false },
            { name: '`/autorole-setup remove-role`', value: 'Remove role from message\n• **Parameters:** message-id, emoji', inline: false },
            { name: '`/autorole-setup edit-embed`', value: 'Edit message embed\n• **Parameters:** message-id, title, description, color, footer\n• **Note:** Use \\\\n for line breaks in description', inline: false }
        );
    
    await channel.send({ embeds: [roleManageEmbed] });
    
    // Auto Role Maintenance
    const maintenanceEmbed = new EmbedBuilder()
        .setColor(0xFD7E14)
        .setTitle('🔧 Auto Role Maintenance Commands')
        .addFields(
            { name: '`/autorole-setup cleanup-colors`', value: 'Remove empty color roles (roles starting with "Color:" that have 0 members)', inline: false },
            { name: '`/autorole-setup recache-messages`', value: 'Refresh auto role message cache (fixes reaction role issues)', inline: false },
            { name: '`/autorole-setup update-color`', value: 'Update existing color role messages with new features', inline: false }
        );
    
    await channel.send({ embeds: [maintenanceEmbed] });
    
    // Other Staff Commands
    const otherEmbed = new EmbedBuilder()
        .setColor(0x20C997)
        .setTitle('📋 Other Staff Commands')
        .addFields(
            { name: '`/closeticket`', value: 'Close the current ticket channel (only works in ticket channels)', inline: false },
            { name: '`/help category:staff`', value: 'Show detailed staff command help', inline: false },
            { name: '`/update-channels`', value: 'Update command documentation channels (Server Owner only)', inline: false }
        );
    
    await channel.send({ embeds: [otherEmbed] });
    
    // Troubleshooting Guide
    const troubleEmbed = new EmbedBuilder()
        .setColor(0x6C757D)
        .setTitle('🆘 Troubleshooting Guide')
        .addFields(
            { name: '🔄 Reaction roles not working?', value: '• Use `/autorole-setup recache-messages`\n• Check bot permissions in channel\n• Verify message IDs are correct', inline: false },
            { name: '🔊 Voice channels not creating?', value: '• Check `/admin status` for voice setup\n• Verify bot permissions in voice category\n• Ensure trigger channel is set correctly', inline: false },
            { name: '🎰 Casino commands not working?', value: '• Check `/admin restrictions list`\n• Verify casino setup with `/admin status`\n• Ensure proper channel assignments', inline: false },
            { name: '🎨 Too many color roles?', value: '• Use `/autorole-setup cleanup-colors`\n• Runs automatically every 24 hours\n• Only removes roles with 0 members', inline: false }
        );
    
    await channel.send({ embeds: [troubleEmbed] });
    
    // Important Notes
    const notesEmbed = new EmbedBuilder()
        .setColor(0xFFC107)
        .setTitle('📝 Important Notes')
        .addFields(
            { name: '🔐 Permissions', value: '• Most admin commands require Administrator permissions\n• `/clear` is Server Owner only\n• Some features require specific channel permissions', inline: false },
            { name: '🔄 Automatic Systems', value: '• Auto role messages cached on startup\n• Voice channels auto-delete when empty\n• Color role cleanup runs every 24 hours\n• Casino stats tracked in real-time', inline: false },
            { name: '📊 Monitoring', value: '• Use `/admin status` to check configuration\n• Web dashboard available for detailed stats\n• All admin actions are logged', inline: false }
        )
        .setFooter({ text: 'For additional support, check the web dashboard or contact the bot developer' });
    
    await channel.send({ embeds: [notesEmbed] });
}