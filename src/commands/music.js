const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const { YoutubeApi } = require('youtube-search-api');

// Music queue system
const musicQueues = new Map();

class MusicQueue {
    constructor(guildId) {
        this.guildId = guildId;
        this.songs = [];
        this.isPlaying = false;
        this.connection = null;
        this.player = null;
        this.currentSong = null;
    }

    addSong(song) {
        this.songs.push(song);
    }

    getNextSong() {
        return this.songs.shift();
    }

    clear() {
        this.songs = [];
        this.currentSong = null;
    }
}

async function searchYoutube(query) {
    try {
        const results = await YoutubeApi.GetListByKeyword(query, false, 1);
        if (results.items && results.items.length > 0) {
            const video = results.items[0];
            return {
                title: video.title,
                url: `https://www.youtube.com/watch?v=${video.id}`,
                duration: video.length?.simpleText || 'Unknown',
                thumbnail: video.thumbnail?.thumbnails?.[0]?.url
            };
        }
        return null;
    } catch (error) {
        console.error('YouTube search error:', error);
        return null;
    }
}

async function playNextSong(queue, textChannel) {
    if (queue.songs.length === 0) {
        queue.isPlaying = false;
        queue.currentSong = null;
        
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🎵 Queue Finished')
            .setDescription('No more songs in queue. Use `/play` to add more music!');
        
        textChannel.send({ embeds: [embed] });
        return;
    }

    const song = queue.getNextSong();
    queue.currentSong = song;
    queue.isPlaying = true;

    try {
        const stream = ytdl(song.url, {
            filter: 'audioonly',
            highWaterMark: 1 << 25,
            quality: 'highestaudio'
        });

        const resource = createAudioResource(stream);
        queue.player.play(resource);

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎵 Now Playing')
            .setDescription(`**${song.title}**`)
            .addFields(
                { name: '⏱️ Duration', value: song.duration, inline: true },
                { name: '📋 Queue Length', value: `${queue.songs.length} songs`, inline: true }
            )
            .setThumbnail(song.thumbnail)
            .setTimestamp();

        textChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error playing song:', error);
        textChannel.send('❌ Error playing this song. Skipping to next...');
        playNextSong(queue, textChannel);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('Music player commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Play a song from YouTube')
                .addStringOption(option =>
                    option.setName('query')
                        .setDescription('Song name or YouTube URL')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('skip')
                .setDescription('Skip the current song'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Stop music and clear queue'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('queue')
                .setDescription('Show current music queue'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nowplaying')
                .setDescription('Show currently playing song')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        
        // Get or create music queue
        let queue = musicQueues.get(guildId);
        if (!queue) {
            queue = new MusicQueue(guildId);
            musicQueues.set(guildId, queue);
        }

        switch (subcommand) {
            case 'play':
                await handlePlay(interaction, queue);
                break;
            case 'skip':
                await handleSkip(interaction, queue);
                break;
            case 'stop':
                await handleStop(interaction, queue);
                break;
            case 'queue':
                await handleQueue(interaction, queue);
                break;
            case 'nowplaying':
                await handleNowPlaying(interaction, queue);
                break;
        }
    },
};

async function handlePlay(interaction, queue) {
    const member = interaction.member;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        return interaction.reply({ content: '❌ You need to be in a voice channel to play music!', ephemeral: true });
    }

    const query = interaction.options.getString('query');
    await interaction.deferReply();

    // Search for song
    const song = await searchYoutube(query);
    if (!song) {
        return interaction.editReply('❌ Could not find that song on YouTube.');
    }

    // Join voice channel if not connected
    if (!queue.connection) {
        queue.connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        queue.player = createAudioPlayer();
        queue.connection.subscribe(queue.player);

        // Handle player events
        queue.player.on(AudioPlayerStatus.Idle, () => {
            playNextSong(queue, interaction.channel);
        });

        queue.player.on('error', error => {
            console.error('Audio player error:', error);
            interaction.channel.send('❌ An error occurred while playing music.');
        });
    }

    // Add song to queue
    queue.addSong(song);

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Song Added to Queue')
        .setDescription(`**${song.title}**`)
        .addFields(
            { name: '⏱️ Duration', value: song.duration, inline: true },
            { name: '📍 Position in Queue', value: `${queue.songs.length}`, inline: true }
        )
        .setThumbnail(song.thumbnail);

    await interaction.editReply({ embeds: [embed] });

    // Start playing if not already playing
    if (!queue.isPlaying) {
        playNextSong(queue, interaction.channel);
    }
}

async function handleSkip(interaction, queue) {
    if (!queue.isPlaying) {
        return interaction.reply({ content: '❌ No music is currently playing!', ephemeral: true });
    }

    queue.player.stop();
    await interaction.reply('⏭️ Skipped current song!');
}

async function handleStop(interaction, queue) {
    if (!queue.connection) {
        return interaction.reply({ content: '❌ No music is currently playing!', ephemeral: true });
    }

    queue.clear();
    queue.player.stop();
    queue.connection.destroy();
    queue.connection = null;
    queue.player = null;
    queue.isPlaying = false;

    await interaction.reply('⏹️ Music stopped and queue cleared!');
}

async function handleQueue(interaction, queue) {
    if (queue.songs.length === 0 && !queue.currentSong) {
        return interaction.reply({ content: '📭 The music queue is empty!', ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🎵 Music Queue')
        .setTimestamp();

    if (queue.currentSong) {
        embed.addFields({ name: '🎵 Now Playing', value: queue.currentSong.title, inline: false });
    }

    if (queue.songs.length > 0) {
        const queueList = queue.songs
            .slice(0, 10)
            .map((song, index) => `${index + 1}. ${song.title}`)
            .join('\n');
        
        embed.addFields({ name: '📋 Up Next', value: queueList, inline: false });
        
        if (queue.songs.length > 10) {
            embed.addFields({ name: '➕ More', value: `...and ${queue.songs.length - 10} more songs`, inline: false });
        }
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleNowPlaying(interaction, queue) {
    if (!queue.currentSong) {
        return interaction.reply({ content: '❌ No music is currently playing!', ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎵 Now Playing')
        .setDescription(`**${queue.currentSong.title}**`)
        .addFields(
            { name: '⏱️ Duration', value: queue.currentSong.duration, inline: true },
            { name: '📋 Queue Length', value: `${queue.songs.length} songs`, inline: true }
        )
        .setThumbnail(queue.currentSong.thumbnail)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}