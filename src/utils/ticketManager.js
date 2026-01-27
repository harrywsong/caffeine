const { ChannelType, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const config = require('./config');
const fs = require('fs');
const path = require('path');
const https = require('https');

class TicketManager {
    constructor() {
        this.activeTickets = new Map(); // Store active ticket info
        this.ticketCounter = 1;
        this.loadTicketData();
    }

    loadTicketData() {
        try {
            const dataFile = path.join(__dirname, '..', 'data', 'tickets.json');
            if (fs.existsSync(dataFile)) {
                const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
                this.ticketCounter = data.counter || 1;
                this.activeTickets = new Map(data.activeTickets || []);
            }
        } catch (error) {
            console.error('Error loading ticket data:', error);
        }
    }

    saveTicketData() {
        try {
            const dataFile = path.join(__dirname, '..', 'data', 'tickets.json');
            const dir = path.dirname(dataFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            const data = {
                counter: this.ticketCounter,
                activeTickets: Array.from(this.activeTickets.entries())
            };
            
            fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving ticket data:', error);
        }
    }

    async createTicket(interaction) {
        try {
            const guild = interaction.guild;
            const user = interaction.user;
            const ticketNumber = this.ticketCounter++;

            // Check if user already has an active ticket
            const existingTicket = Array.from(this.activeTickets.values()).find(ticket => ticket.userId === user.id);
            if (existingTicket) {
                return interaction.reply({
                    content: `❌ You already have an active ticket: <#${existingTicket.channelId}>`,
                    ephemeral: true
                });
            }

            const ticketsCategoryId = config.getChannelId('tickets');
            const adminRoleId = config.getSetting('adminRole');

            // Create ticket channel with PRIVATE permissions
            const ticketChannel = await guild.channels.create({
                name: `ticket-${ticketNumber.toString().padStart(4, '0')}`,
                type: ChannelType.GuildText,
                parent: ticketsCategoryId,
                topic: `Ticket #${ticketNumber} - ${user.tag}`,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory
                        ]
                    },
                    {
                        id: user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.AttachFiles,
                            PermissionFlagsBits.EmbedLinks
                        ]
                    },
                    {
                        id: adminRoleId, // Manager role - only this role can access tickets
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.AttachFiles,
                            PermissionFlagsBits.EmbedLinks,
                            PermissionFlagsBits.ManageMessages
                        ]
                    }
                ]
            });

            // Store ticket info
            this.activeTickets.set(ticketChannel.id, {
                ticketNumber,
                userId: user.id,
                channelId: ticketChannel.id,
                createdAt: new Date().toISOString(),
                messages: []
            });
            this.saveTicketData();

            // Create welcome message in ticket
            const welcomeEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle(`🎫 Ticket #${ticketNumber}`)
                .setDescription(`Hello ${user}! Thank you for creating a ticket.`)
                .addFields(
                    { name: '👤 Created by:', value: user.tag, inline: true },
                    { name: '📅 Created at:', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '📝 Instructions:', value: 'Please describe your issue or question. Staff will respond as soon as possible.', inline: false }
                )
                .setFooter({ text: 'Use the button below or /closeticket to close this ticket when resolved' })
                .setTimestamp();

            const closeButton = new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Close Ticket')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(closeButton);

            await ticketChannel.send({ embeds: [welcomeEmbed], components: [row] });

            // Notify admins
            const adminRole = guild.roles.cache.get(adminRoleId);
            if (adminRole) {
                await ticketChannel.send(`${adminRole} - New ticket created by ${user}`);
            }

            // Log to bot logs
            const botLogsChannelId = config.getSettingChannelId('logChannel');
            if (botLogsChannelId) {
                const botLogsChannel = guild.channels.cache.get(botLogsChannelId);
                if (botLogsChannel) {
                    const logMessage = `🎫 **${user.tag}** created ticket #${ticketNumber}: ${ticketChannel}`;
                    botLogsChannel.send(logMessage).catch(console.error);
                }
            }

            await interaction.reply({
                content: `✅ Ticket created! Please check ${ticketChannel} to continue.`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error creating ticket:', error);
            await interaction.reply({
                content: '❌ Error creating ticket. Please try again or contact an administrator.',
                ephemeral: true
            });
        }
    }

    async closeTicket(interaction, channelId = null) {
        try {
            const channel = channelId ? interaction.guild.channels.cache.get(channelId) : interaction.channel;
            const ticketInfo = this.activeTickets.get(channel.id);

            if (!ticketInfo) {
                return interaction.reply({
                    content: '❌ This is not a valid ticket channel.',
                    ephemeral: true
                });
            }

            const user = interaction.user;
            const adminRoleId = config.getSetting('adminRole');
            const isAdmin = interaction.member.roles.cache.has(adminRoleId);
            const isTicketOwner = ticketInfo.userId === user.id;

            if (!isAdmin && !isTicketOwner) {
                return interaction.reply({
                    content: '❌ You can only close your own tickets or you must be an admin.',
                    ephemeral: true
                });
            }

            // Generate HTML export
            await this.exportTicketToHTML(channel, ticketInfo, interaction.guild);

            // Remove from active tickets
            this.activeTickets.delete(channel.id);
            this.saveTicketData();

            // Send closing message
            const closingEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🔒 Ticket Closing')
                .setDescription(`Ticket #${ticketInfo.ticketNumber} is being closed by ${user.tag}`)
                .addFields({ name: '⏱️ Closing in:', value: '10 seconds...', inline: true })
                .setTimestamp();

            await interaction.reply({ embeds: [closingEmbed] });

            // Log closure
            const botLogsChannelId = config.getSettingChannelId('logChannel');
            if (botLogsChannelId) {
                const botLogsChannel = interaction.guild.channels.cache.get(botLogsChannelId);
                if (botLogsChannel) {
                    const logMessage = `🔒 **${user.tag}** closed ticket #${ticketInfo.ticketNumber}`;
                    botLogsChannel.send(logMessage).catch(console.error);
                }
            }

            // Delete channel after delay
            setTimeout(async () => {
                try {
                    await channel.delete('Ticket closed');
                } catch (error) {
                    console.error('Error deleting ticket channel:', error);
                }
            }, 10000);

        } catch (error) {
            console.error('Error closing ticket:', error);
            await interaction.reply({
                content: '❌ Error closing ticket. Please try again or contact an administrator.',
                ephemeral: true
            });
        }
    }

    async exportTicketToHTML(channel, ticketInfo, guild) {
        try {
            console.log(`📄 Exporting ticket #${ticketInfo.ticketNumber} to HTML...`);

            // Fetch all messages
            const messages = [];
            let lastMessageId = null;

            while (true) {
                const options = { limit: 100 };
                if (lastMessageId) {
                    options.before = lastMessageId;
                }

                const fetchedMessages = await channel.messages.fetch(options);
                if (fetchedMessages.size === 0) break;

                messages.push(...fetchedMessages.values());
                lastMessageId = fetchedMessages.last().id;
            }

            // Sort messages by timestamp
            messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            // Generate HTML
            const html = await this.generateHTML(messages, ticketInfo, guild);

            // Save HTML file
            const fileName = `ticket-${ticketInfo.ticketNumber.toString().padStart(4, '0')}-${Date.now()}.html`;
            const filePath = path.join(__dirname, '..', 'data', 'temp', fileName);
            
            // Ensure temp directory exists
            const tempDir = path.dirname(filePath);
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            fs.writeFileSync(filePath, html, 'utf8');

            // Upload to ticket-history channel
            const ticketHistoryChannelId = config.getChannelId('ticketHistory');
            if (ticketHistoryChannelId) {
                const ticketHistoryChannel = guild.channels.cache.get(ticketHistoryChannelId);
                if (ticketHistoryChannel) {
                    const attachment = new AttachmentBuilder(filePath, { name: fileName });
                    
                    const exportEmbed = new EmbedBuilder()
                        .setColor(0x9B59B6)
                        .setTitle(`📄 Ticket #${ticketInfo.ticketNumber} Archive`)
                        .addFields(
                            { name: '👤 Created by:', value: `<@${ticketInfo.userId}>`, inline: true },
                            { name: '📅 Created:', value: `<t:${Math.floor(new Date(ticketInfo.createdAt).getTime() / 1000)}:F>`, inline: true },
                            { name: '🔒 Closed:', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                            { name: '💬 Messages:', value: messages.length.toString(), inline: true },
                            { name: '📎 Attachments:', value: messages.filter(m => m.attachments.size > 0).length.toString(), inline: true }
                        )
                        .setTimestamp();

                    await ticketHistoryChannel.send({ 
                        embeds: [exportEmbed], 
                        files: [attachment] 
                    });

                    // Also upload any files from the ticket
                    await this.uploadTicketFiles(messages, ticketHistoryChannel, ticketInfo.ticketNumber);
                }
            }

            // Clean up temp file
            fs.unlinkSync(filePath);
            console.log(`✅ Ticket #${ticketInfo.ticketNumber} exported successfully`);

        } catch (error) {
            console.error('Error exporting ticket to HTML:', error);
        }
    }

    async generateHTML(messages, ticketInfo, guild) {
        const user = await guild.members.fetch(ticketInfo.userId).catch(() => null);
        const userName = user ? user.user.tag : 'Unknown User';

        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket #${ticketInfo.ticketNumber} - ${userName}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #36393f;
            color: #dcddde;
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: #2f3136;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .header {
            border-bottom: 2px solid #4f545c;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #00aff4;
            margin: 0;
        }
        .header .info {
            color: #b9bbbe;
            margin-top: 10px;
        }
        .message {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #40444b;
            border-radius: 8px;
            border-left: 4px solid #7289da;
        }
        .message.bot {
            border-left-color: #faa61a;
        }
        .message.admin {
            border-left-color: #f04747;
        }
        .message-header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        .avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            margin-right: 10px;
        }
        .username {
            font-weight: bold;
            color: #ffffff;
        }
        .timestamp {
            color: #72767d;
            font-size: 0.8em;
            margin-left: auto;
        }
        .message-content {
            margin-left: 42px;
            word-wrap: break-word;
        }
        .attachment {
            background-color: #2f3136;
            border: 1px solid #4f545c;
            border-radius: 4px;
            padding: 10px;
            margin-top: 10px;
        }
        .attachment a {
            color: #00aff4;
            text-decoration: none;
        }
        .embed {
            border-left: 4px solid #00aff4;
            background-color: #2f3136;
            padding: 15px;
            margin-top: 10px;
            border-radius: 0 4px 4px 0;
        }
        .embed-title {
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 10px;
        }
        .embed-description {
            margin-bottom: 10px;
        }
        .embed-field {
            margin-bottom: 10px;
        }
        .embed-field-name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #4f545c;
            text-align: center;
            color: #72767d;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Ticket #${ticketInfo.ticketNumber}</h1>
            <div class="info">
                <strong>Created by:</strong> ${userName}<br>
                <strong>Created:</strong> ${new Date(ticketInfo.createdAt).toLocaleString()}<br>
                <strong>Exported:</strong> ${new Date().toLocaleString()}<br>
                <strong>Total Messages:</strong> ${messages.length}
            </div>
        </div>
        <div class="messages">
`;

        for (const message of messages) {
            const author = message.author;
            const member = message.member;
            const isBot = author.bot;
            const isAdmin = member && member.roles.cache.has(config.getSetting('adminRole'));
            
            let messageClass = 'message';
            if (isBot) messageClass += ' bot';
            else if (isAdmin) messageClass += ' admin';

            html += `
            <div class="${messageClass}">
                <div class="message-header">
                    <img class="avatar" src="${author.displayAvatarURL()}" alt="${author.tag}">
                    <span class="username">${author.tag}</span>
                    <span class="timestamp">${message.createdAt.toLocaleString()}</span>
                </div>
                <div class="message-content">
`;

            if (message.content) {
                html += `<div>${this.escapeHtml(message.content)}</div>`;
            }

            // Handle attachments
            if (message.attachments.size > 0) {
                for (const attachment of message.attachments.values()) {
                    html += `
                    <div class="attachment">
                        📎 <a href="${attachment.url}" target="_blank">${attachment.name}</a>
                        <br><small>Size: ${(attachment.size / 1024).toFixed(2)} KB</small>
                    </div>`;
                }
            }

            // Handle embeds
            if (message.embeds.length > 0) {
                for (const embed of message.embeds) {
                    html += `<div class="embed">`;
                    if (embed.title) {
                        html += `<div class="embed-title">${this.escapeHtml(embed.title)}</div>`;
                    }
                    if (embed.description) {
                        html += `<div class="embed-description">${this.escapeHtml(embed.description)}</div>`;
                    }
                    if (embed.fields && embed.fields.length > 0) {
                        for (const field of embed.fields) {
                            html += `
                            <div class="embed-field">
                                <div class="embed-field-name">${this.escapeHtml(field.name)}</div>
                                <div>${this.escapeHtml(field.value)}</div>
                            </div>`;
                        }
                    }
                    html += `</div>`;
                }
            }

            html += `
                </div>
            </div>`;
        }

        html += `
        </div>
        <div class="footer">
            <p>This ticket archive was automatically generated by the ${guild.name} support system.</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>`;

        return html;
    }

    async uploadTicketFiles(messages, historyChannel, ticketNumber) {
        try {
            const attachments = [];
            
            for (const message of messages) {
                if (message.attachments.size > 0) {
                    for (const attachment of message.attachments.values()) {
                        attachments.push({
                            url: attachment.url,
                            name: attachment.name,
                            size: attachment.size,
                            author: message.author.tag,
                            timestamp: message.createdAt
                        });
                    }
                }
            }

            if (attachments.length === 0) return;

            // Create files archive embed
            const filesEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle(`📎 Ticket #${ticketNumber} - Files Archive`)
                .setDescription(`${attachments.length} file(s) from this ticket`)
                .setTimestamp();

            await historyChannel.send({ embeds: [filesEmbed] });

            // Download and reupload each file
            for (const attachment of attachments) {
                try {
                    if (attachment.size > 25 * 1024 * 1024) { // Skip files larger than 25MB
                        await historyChannel.send(`⚠️ **${attachment.name}** (by ${attachment.author}) - File too large to preserve (${(attachment.size / 1024 / 1024).toFixed(2)} MB)`);
                        continue;
                    }

                    const fileBuffer = await this.downloadFile(attachment.url);
                    const fileAttachment = new AttachmentBuilder(fileBuffer, { name: attachment.name });
                    
                    await historyChannel.send({
                        content: `📎 **${attachment.name}** (uploaded by ${attachment.author} on ${attachment.timestamp.toLocaleString()})`,
                        files: [fileAttachment]
                    });

                } catch (error) {
                    console.error(`Error preserving file ${attachment.name}:`, error);
                    await historyChannel.send(`❌ **${attachment.name}** (by ${attachment.author}) - Failed to preserve file`);
                }
            }

        } catch (error) {
            console.error('Error uploading ticket files:', error);
        }
    }

    downloadFile(url) {
        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => resolve(Buffer.concat(chunks)));
                response.on('error', reject);
            }).on('error', reject);
        });
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    getActiveTickets() {
        return Array.from(this.activeTickets.values());
    }

    isTicketChannel(channelId) {
        return this.activeTickets.has(channelId);
    }
}

module.exports = new TicketManager();