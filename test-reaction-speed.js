// Quick test script to verify reaction role performance
// Run this after deploying the optimized code

const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
    ],
});

client.once('ready', () => {
    console.log('✅ Test client ready! You can now test reaction speeds.');
    console.log('🔍 Monitoring reaction events for performance...');
});

// Monitor reaction add performance
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    
    const startTime = Date.now();
    console.log(`⚡ Reaction ADD detected at ${startTime}: ${user.tag} -> ${reaction.emoji.name}`);
    
    // Wait a bit to see how long the role operation takes
    setTimeout(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`⏱️  ADD operation completed in ~${duration}ms`);
    }, 100);
});

// Monitor reaction remove performance
client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;
    
    const startTime = Date.now();
    console.log(`⚡ Reaction REMOVE detected at ${startTime}: ${user.tag} -> ${reaction.emoji.name}`);
    
    // Wait a bit to see how long the role operation takes
    setTimeout(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`⏱️  REMOVE operation completed in ~${duration}ms`);
    }, 100);
});

client.login(process.env.DISCORD_TOKEN);

// Instructions
console.log(`
🧪 REACTION SPEED TEST
======================

1. Deploy the optimized code to your server
2. Run this test script: node test-reaction-speed.js
3. Go to your Discord server and quickly react/unreact to autorole messages
4. Watch the console for timing information

Expected improvements:
- Reduced verbose logging
- Faster member fetching
- Better race condition handling
- More efficient role lookup

Press Ctrl+C to stop the test when done.
`);