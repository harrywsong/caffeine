# 🛡️ CAFFEINE Bot - Staff Commands

This document contains all administrative commands available to staff members with appropriate permissions.

## 🗑️ Moderation Commands

### `/clear <amount>`
**Permission Required:** Server Owner Only  
**Description:** Delete messages from the current channel  
**Parameters:**
- `amount` (1-100): Number of messages to delete

**Usage Examples:**
```
/clear amount:10    # Delete last 10 messages
/clear amount:50    # Delete last 50 messages
```

**Notes:**
- Only the server owner can use this command
- Cannot delete messages older than 14 days (Discord limitation)
- Bot will skip old messages and report how many were skipped

---

## ⚙️ Server Administration (`/admin`)

### Setup Commands

#### `/admin setup channels`
**Description:** Configure important server channels  
**Parameters:**
- `logs` (optional): Channel for activity logs
- `announcements` (optional): Channel for announcements  
- `welcome` (optional): Channel for welcome messages
- `roles` (optional): Channel for role selection

#### `/admin setup voice`
**Description:** Setup automatic voice channel creation system  
**Parameters:**
- `category` (required): Category where voice channels will be created
- `trigger` (required): Voice channel that triggers creation of new channels
- `template` (optional): Name template for created channels (default: "{user}'s Channel")

#### `/admin setup casino`
**Description:** Setup casino system  
**Parameters:**
- `category` (required): Category for casino channels

### Restriction Management

#### `/admin restrictions set`
**Description:** Set command restrictions for specific channels  
**Parameters:**
- `channel` (required): Channel to restrict
- `command` (required): Command type to restrict (Casino/Voice/All)
- `allowed` (required): Whether commands are allowed (true/false)

#### `/admin restrictions list`
**Description:** View all current channel restrictions

### Casino Management

#### `/admin casino assign-game`
**Description:** Assign specific casino games to channels  
**Parameters:**
- `channel` (required): Channel for the game
- `game` (required): Game type (coinflip/slots/dice/blackjack/all)

### Monitoring & Status

#### `/admin status`
**Description:** View complete server configuration status

#### `/admin dashboard`
**Description:** Get link to web dashboard for advanced management

---

## 🎭 Auto Role System Management (`/autorole-setup`)

### Setup Commands

#### `/autorole-setup create-all`
**Description:** Create all auto role section messages (timezone, activities, games, color)

#### `/autorole-setup create-color`
**Description:** Create only the color role selection message

#### `/autorole-setup create-timezone`
**Description:** Create only the timezone role selection message

#### `/autorole-setup create-activities`
**Description:** Create only the activities role selection message

#### `/autorole-setup create-games`
**Description:** Create only the games role selection message

### Management Commands

#### `/autorole-setup add-role`
**Description:** Add a role to an existing auto role message  
**Parameters:**
- `message-id` (required): ID of the auto role message
- `role` (required): Role to add
- `emoji` (required): Emoji for the role

**Usage Example:**
```
/autorole-setup add-role message-id:1234567890 role:@NewRole emoji:🎮
```

#### `/autorole-setup remove-role`
**Description:** Remove a role from an auto role message  
**Parameters:**
- `message-id` (required): ID of the auto role message
- `emoji` (required): Emoji of the role to remove

#### `/autorole-setup edit-embed`
**Description:** Edit the embed of any auto role message  
**Parameters:**
- `message-id` (required): ID of the message to edit
- `title` (optional): New embed title
- `description` (optional): New embed description (use \\n for line breaks)
- `color` (optional): New embed color (hex code like #FF69B4)
- `footer` (optional): New embed footer text

**Usage Example:**
```
/autorole-setup edit-embed message-id:1234567890 description:New description here!\n\nWith line breaks!
```

### Maintenance Commands

#### `/autorole-setup cleanup-colors`
**Description:** Remove all color roles that have 0 members (roles starting with "Color:")

#### `/autorole-setup recache-messages`
**Description:** Refresh the auto role message cache to fix reaction role issues

#### `/autorole-setup update-color`
**Description:** Update existing color role messages with new buttons/features

---

## 🎫 Ticket System

#### `/closeticket`
**Description:** Close the current ticket channel  
**Note:** Only works in ticket channels

---

## 📊 Information Commands

#### `/help category:staff`
**Description:** Show detailed staff command help

---

## 🔧 Troubleshooting

### Common Issues & Solutions

1. **Reaction roles not working:**
   - Use `/autorole-setup recache-messages` to refresh the cache
   - Check that the bot has proper permissions in the channel

2. **Voice channels not creating:**
   - Verify the voice setup with `/admin status`
   - Ensure the bot has permissions in the voice category

3. **Casino commands not working:**
   - Check channel restrictions with `/admin restrictions list`
   - Verify casino setup with `/admin status`

4. **Color roles accumulating:**
   - Use `/autorole-setup cleanup-colors` to remove empty color roles
   - This runs automatically every 24 hours

---

## 📝 Notes

- All admin commands require Administrator permissions unless specified otherwise
- The `/clear` command is restricted to server owners only for security
- Auto role messages are cached on bot startup and refreshed every 24 hours
- Voice channels are automatically deleted when empty
- Casino statistics are tracked and available via the web dashboard

---

## 🆘 Support

If you encounter issues with any staff commands:
1. Check the bot's permissions in the relevant channels
2. Use `/admin status` to verify server configuration
3. Try `/autorole-setup recache-messages` for reaction role issues
4. Check the web dashboard for detailed logs and statistics