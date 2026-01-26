# Discord Bot for Oracle Cloud

An all-purpose Discord bot designed to run on Oracle Cloud Infrastructure.

## Features

- 🏓 **Ping Command** - Check bot latency and responsiveness
- 📊 **Server Info** - Display detailed server information
- 👤 **User Info** - Get information about users
- 🎵 **Music Player** - Play music from YouTube with queue system
- 🎰 **Casino Games** - Coinflip, slots, dice with economy system
- 🔊 **Auto Voice Channels** - Automatic voice channel creation/deletion
- 🎭 **Auto Roles** - Join roles and reaction role selection
- 🖥️ **Web Dashboard** - Comprehensive admin interface
- 📊 **Activity Logging** - Track all server activities
- 🔒 **Channel Restrictions** - Control where commands can be used
- 📢 **Announcements** - Send server-wide announcements
- 🔧 **Modular Design** - Easy to extend with new commands
- ☁️ **Cloud Ready** - Optimized for Oracle Cloud deployment

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
npm run setup-db
```

### 3. Configure Environment
1. Copy `.env.example` to `.env`
2. Fill in your Discord bot credentials:
   - `DISCORD_TOKEN`: Your bot token from Discord Developer Portal
   - `CLIENT_ID`: Your bot's client ID
   - `GUILD_ID`: Your Discord server ID (for testing)

### 3. Deploy Commands
```bash
# Deploy to specific guild (instant, for testing)
npm run deploy

# Deploy globally (takes up to 1 hour)
node deploy-commands.js --global
```

### 4. Start Bot & Dashboard
```bash
# Development (with auto-restart)
npm run dev

# Production
npm start

# Dashboard only (separate terminal)
npm run dashboard
```

## 🖥️ Web Dashboard

Access the comprehensive admin dashboard at `http://localhost:3000` after starting the bot.

### Dashboard Features
- **Server Settings** - Configure channels, roles, and bot behavior
- **Channel Management** - View and organize all server channels
- **Restrictions** - Control which commands work in specific channels
- **Casino Management** - Assign games to dedicated channels
- **Activity Logs** - Monitor all bot and user activities
- **Announcements** - Send formatted messages to any channel
- **Real-time Stats** - Track usage and server metrics

### Admin Commands
- `/admin setup channels` - Configure important server channels
- `/admin setup voice` - Setup automatic voice channel system
- `/admin setup casino` - Configure casino category
- `/admin restrictions set` - Set command restrictions for channels
- `/admin casino assign-game` - Assign casino games to specific channels
- `/admin dashboard` - Get dashboard access link
- `/admin status` - View current server configuration

## Oracle Cloud Deployment

### Prerequisites
- Oracle Cloud account with compute instance
- Node.js 16+ installed on the instance
- PM2 for process management

### Deployment Steps

1. **Connect to your Oracle Cloud instance:**
```bash
ssh -i your-key.pem ubuntu@your-instance-ip
```

2. **Install Node.js and PM2:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

3. **Clone and setup your bot:**
```bash
git clone your-repo-url discord-bot
cd discord-bot
npm install
```

4. **Configure environment:**
```bash
cp .env.example .env
nano .env  # Add your bot credentials
```

5. **Deploy commands and start bot:**
```bash
npm run deploy
pm2 start src/index.js --name discord-bot
pm2 save
pm2 startup
```

6. **Configure firewall (if needed):**
```bash
sudo ufw allow 22
sudo ufw enable
```

## Adding New Commands

1. Create a new file in `src/commands/`
2. Follow this template:

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('commandname')
        .setDescription('Command description'),
    async execute(interaction) {
        await interaction.reply('Hello World!');
    },
};
```

3. Redeploy commands: `npm run deploy`

## Monitoring

Use PM2 for process monitoring:
```bash
pm2 status          # Check status
pm2 logs discord-bot # View logs
pm2 restart discord-bot # Restart bot
pm2 stop discord-bot    # Stop bot
```

## Support

For issues and questions, check the Discord.js documentation: https://discord.js.org/

## Command Overview

### Music Commands (`/music`)
- `play <query>` - Play a song from YouTube
- `skip` - Skip current song
- `stop` - Stop music and clear queue
- `queue` - Show current music queue
- `nowplaying` - Show currently playing song

### Casino Commands (`/casino`)
- `balance` - Check your coin balance
- `daily` - Claim daily coins (100-500)
- `coinflip <heads/tails> <amount>` - Bet on coin flip (2x payout)
- `slots <amount>` - Play slot machine (up to 10x payout)
- `dice <guess> <amount>` - Guess dice roll (5x payout)
- `leaderboard` - Show richest users

### Auto Role Commands (`/autorole`)
- `setup <role>` - Set role for new members
- `reaction <title> <description>` - Create role selection message
- `add-reaction-role <role> <emoji> <description>` - Add role to selection
- `remove` - Remove auto role system
- `status` - Show current configuration

### Voice Commands (`/voice`)
- `setup <category> [name_template]` - Setup auto voice channels
- `create-trigger <name>` - Create trigger channel
- `remove` - Remove voice system
- `status` - Show voice configuration

### Utility Commands
- `/ping` - Check bot latency
- `/serverinfo` - Display server information
- `/userinfo [user]` - Display user information

## Advanced Features

### Music System
- YouTube search and playback
- Queue management with skip/stop
- High-quality audio streaming
- Automatic queue progression

### Economy & Casino
- File-based user economy
- Daily coin rewards
- Multiple gambling games
- Server leaderboards

### Auto Voice Channels
- Trigger channels create private rooms
- Automatic cleanup when empty
- Customizable channel names
- Owner permissions for created channels

### Role Management
- Auto-assign roles to new members
- Interactive role selection with dropdowns
- Emoji-based role descriptions
- Bulk role management

## Oracle Cloud Optimization

The bot is specifically optimized for Oracle Cloud's free tier:
- **Low Memory Usage** - Efficient caching and cleanup
- **File-based Storage** - No database required
- **Graceful Error Handling** - Prevents crashes
- **Process Management** - PM2 integration for reliability