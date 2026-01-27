# 🤖 CAFFEINE Bot - User Commands

This document contains all commands available to regular users of the CAFFEINE bot.

## 🎮 General Commands

### `/help [category]`
**Description:** Show available commands and their descriptions  
**Parameters:**
- `category` (optional): Show commands for a specific category (general/casino/voice/autorole/staff)

**Usage Examples:**
```
/help                    # Show all command categories
/help category:casino    # Show casino commands
/help category:voice     # Show voice commands
```

### `/ping`
**Description:** Check bot latency and response time  
**Usage:** `/ping`

### `/serverinfo`
**Description:** Display detailed server information and statistics  
**Usage:** `/serverinfo`

### `/userinfo [user]`
**Description:** Show information about yourself or another user  
**Parameters:**
- `user` (optional): User to get information about (defaults to yourself)

**Usage Examples:**
```
/userinfo              # Your own information
/userinfo user:@John   # Information about John
```

---

## 🎰 Casino Games & Economy

### 💰 Economy Commands

#### `/balance [user]`
**Description:** Check your current balance or another user's balance  
**Usage Examples:**
```
/balance              # Your balance
/balance user:@John   # John's balance
```

#### `/daily`
**Description:** Claim your daily reward  
**Usage:** `/daily`  
**Cooldown:** 24 hours

#### `/leaderboard [type]`
**Description:** View leaderboards for different categories  
**Parameters:**
- `type` (optional): casino/voice (defaults to casino)

### 🎲 Dice & Coin Games

#### `/dice <amount> <number>`
**Description:** Bet on a dice roll (1-6)  
**Parameters:**
- `amount`: Amount to bet (minimum 10)
- `number`: Number to bet on (1-6)

**Payout:** 5x your bet if you win

#### `/coinflip <amount> <heads/tails>`
**Description:** Flip a coin and bet on the outcome  
**Parameters:**
- `amount`: Amount to bet (minimum 10)
- `choice`: heads or tails

**Payout:** 2x your bet if you win

#### `/crash <amount>`
**Description:** Crash gambling game - cash out before it crashes!  
**Parameters:**
- `amount`: Amount to bet (minimum 10)

**How to play:** Watch the multiplier rise and cash out before it crashes

### 🃏 Card Games

#### `/blackjack <amount>`
**Description:** Play blackjack against the dealer  
**Parameters:**
- `amount`: Amount to bet (minimum 10)

**Payouts:**
- Regular win: 2x your bet
- Blackjack: 2.5x your bet

#### `/hilo <amount>`
**Description:** Higher or lower card guessing game  
**Parameters:**
- `amount`: Amount to bet (minimum 10)

**How to play:** Guess if the next card will be higher or lower

### 🎰 Slot & Wheel Games

#### `/slots <amount>`
**Description:** Spin the slot machine  
**Parameters:**
- `amount`: Amount to bet (minimum 10)

**Payouts vary based on symbol combinations**

#### `/wof <amount>`
**Description:** Spin the Wheel of Fortune  
**Parameters:**
- `amount`: Amount to bet (minimum 10)

#### `/roulette <amount> <bet>`
**Description:** Play European roulette  
**Parameters:**
- `amount`: Amount to bet (minimum 10)
- `bet`: What to bet on (red/black/odd/even/1-36)

**Payouts:**
- Red/Black, Odd/Even: 2x
- Single number: 36x

### 🎮 Other Games

#### `/rps <amount> <choice>`
**Description:** Rock Paper Scissors against the bot  
**Parameters:**
- `amount`: Amount to bet (minimum 10)
- `choice`: rock/paper/scissors

**Payout:** 2x your bet if you win

#### `/minesweeper <amount>`
**Description:** Play minesweeper gambling game  
**Parameters:**
- `amount`: Amount to bet (minimum 10)

**How to play:** Reveal tiles without hitting mines, cash out anytime

---

## 🔊 Voice Commands

### `/voice create <name>`
**Description:** Create a new voice channel  
**Parameters:**
- `name`: Name for your voice channel

### `/voice delete`
**Description:** Delete your voice channel (channel owner only)  
**Usage:** `/voice delete`

### `/voice rename <name>`
**Description:** Rename your voice channel (channel owner only)  
**Parameters:**
- `name`: New name for your voice channel

### `/voice limit <number>`
**Description:** Set user limit for your voice channel (channel owner only)  
**Parameters:**
- `number`: User limit (0 for unlimited, 1-99 for specific limit)

### `/voice transfer <user>`
**Description:** Transfer ownership of your voice channel  
**Parameters:**
- `user`: User to transfer ownership to

### `/voicetime [user]`
**Description:** Check voice channel activity time  
**Parameters:**
- `user` (optional): User to check (defaults to yourself)

**Usage Examples:**
```
/voicetime              # Your voice time
/voicetime user:@John   # John's voice time
```

---

## 🎭 Auto Role System

The auto role system allows you to get roles automatically by reacting to specific messages. No commands needed - just react!

### 🌍 Timezone Roles
React to show when you're typically online:
- 🌊 **PST/PDT** - Pacific Time
- 🏔️ **MST/MDT** - Mountain Time  
- 🌆 **EST/EDT** - Eastern Time
- 🌸 **KST** - Korean Standard Time

### 🎯 Activity Roles
React to show your favorite server activities:
- 🎰 **Casino** - Love playing casino games
- 🎤 **Voice** - Enjoy voice chatting

### 🎮 Game Roles
Game-specific roles (to be added based on community interest)

### 🎨 Color Roles
Use the color selector message to request custom color roles

### 📝 How to Use Auto Roles
1. Find the role selection messages in the designated channel
2. React with the appropriate emoji
3. Your role will be added automatically
4. Unreact to remove the role

**Note:** You can select multiple timezone, activity, and game roles, but only one color role at a time.

---

## 🎫 Ticket System

Tickets may be created automatically by the bot or by staff members. If you're in a ticket channel, it will be clearly marked.

---

## 💡 Tips & Information

### Casino Tips
- **Minimum bet:** 10 coins for all games
- **Daily rewards:** Don't forget to claim your daily bonus
- **Responsible gaming:** Set limits for yourself and stick to them
- **Best channels:** Use designated casino channels for the best experience

### Voice Tips
- **Auto-creation:** Join the trigger channel to automatically create a new voice channel
- **Ownership:** The person who creates a channel becomes its owner
- **Auto-deletion:** Empty voice channels are automatically deleted
- **Permissions:** Channel owners can manage their channel settings

### Auto Role Tips
- **Multiple selections:** You can have multiple timezone and activity roles
- **Instant updates:** Roles are added/removed immediately when you react/unreact
- **Color roles:** Only one color role at a time - requesting a new one removes the old one
- **Persistence:** Your roles are saved even if the bot restarts

---

## 🆘 Getting Help

- Use `/help` to see all available commands
- Use `/help category:<name>` for specific command categories
- Ask staff members if you need assistance with any features
- Check the server announcements for updates and new features

---

## 📊 Statistics & Leaderboards

- **Casino Leaderboard:** See top players by total winnings
- **Voice Leaderboard:** See most active voice chat users
- **Personal Stats:** Check your own statistics with various commands
- **Server Stats:** View server information and activity

---

## 🔄 Updates & Changes

The bot is regularly updated with new features and improvements. Check the announcements channel for:
- New games and features
- Balance changes and adjustments
- Bug fixes and improvements
- Scheduled maintenance notifications