const database = require('./database');

console.log('🔧 Setting up database...');

// Database is automatically initialized when imported
setTimeout(() => {
    console.log('✅ Database setup complete!');
    console.log('📊 Tables created:');
    console.log('  - guild_settings');
    console.log('  - channel_restrictions');
    console.log('  - casino_channels');
    console.log('  - reaction_roles');
    console.log('  - user_economy');
    console.log('  - activity_logs');
    console.log('  - temp_voice_channels');
    console.log('  - admin_users');
    console.log('  - music_queue');
    
    process.exit(0);
}, 1000);