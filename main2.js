const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function getTikTokMetadata(videoUrl) {
    try {
        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            throw new Error('Invalid TikTok URL');
        }

        // Using tikwm.com API instead of direct TikTok API as it's more reliable
        const apiUrl = 'https://www.tikwm.com/api/';
        const response = await axios.post(apiUrl, {
            url: videoUrl
        });

        if (response.data.code !== 0) {
            throw new Error('Failed to get video information');
        }

        const videoData = response.data.data;

        // Format metadata from tikwm response
        const metadata = {
            id: videoData.id,
            description: videoData.title,
            createTime: new Date(videoData.create_time * 1000).toLocaleString(),
            author: {
                id: videoData.author.id,
                nickname: videoData.author.nickname,
                username: videoData.author.unique_id,
                avatarUrl: videoData.author.avatar
            },
            stats: {
                plays: videoData.play_count,
                likes: videoData.digg_count,
                shares: videoData.share_count,
                comments: videoData.comment_count
            },
            video: {
                duration: videoData.duration,
                originalUrl: videoData.play,
                hdUrl: videoData.hdplay,
                width: videoData.width,
                height: videoData.height,
            },
            music: {
                title: videoData.music_info.title,
                author: videoData.music_info.author,
                duration: videoData.music_info.duration,
                url: videoData.music_info.play
            },
            hashtags: (videoData.hashtags || []).map(tag => tag.name)
        };

        return metadata;
    } catch (error) {
        console.error('Error fetching metadata:', error.message);
        throw error;
    }
}

async function downloadTikTokVideo(videoUrl) {
    try {
        // Use tikwm.com API for downloading
        const apiUrl = 'https://www.tikwm.com/api/';
        const response = await axios.post(apiUrl, {
            url: videoUrl
        });

        if (response.data.code !== 0) {
            throw new Error('Failed to get video information');
        }

        const videoData = response.data.data;
        const videoDownloadUrl = videoData.play; // No watermark URL

        // Create downloads directory if it doesn't exist
        const downloadDir = path.join(__dirname, 'downloads');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir);
        }

        // Download the video
        const videoResponse = await axios({
            method: 'GET',
            url: videoDownloadUrl,
            responseType: 'stream'
        });

        // Save video with unique name
        const fileName = `tiktok_${videoData.id}_nowm.mp4`;
        const filePath = path.join(downloadDir, fileName);

        // Create write stream
        const writer = fs.createWriteStream(filePath);

        // Pipe the video data to file
        videoResponse.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`Video downloaded successfully: ${fileName}`);
                resolve(filePath);
            });
            writer.on('error', reject);
        });

    } catch (error) {
        console.error('Error downloading video:', error.message);
        throw error;
    }
}

// Helper function to extract video ID from TikTok URL
function extractVideoId(url) {
    const regex = /\/video\/(\d+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

async function main() {
    // Get URL from command line arguments
    const videoUrl = process.argv[2];
    
    if (!videoUrl) {
        console.error('Please provide a TikTok video URL as an argument');
        console.log('Usage: node main.js <TikTok-URL>');
        process.exit(1);
    }

    try {
        // Get and display metadata
        console.log('\n📱 Fetching TikTok video metadata...\n');
        const metadata = await getTikTokMetadata(videoUrl);
        
        console.log('📊 Video Metadata:');
        console.log('==================');
        console.log(`🆔 Video ID: ${metadata.id}`);
        console.log(`📝 Description: ${metadata.description}`);
        console.log(`⏰ Created: ${metadata.createTime}`);
        
        console.log('\n👤 Author Info:');
        console.log(`   Username: @${metadata.author.username}`);
        console.log(`   Nickname: ${metadata.author.nickname}`);
        
        console.log('\n📈 Stats:');
        console.log(`   👁️ Views: ${metadata.stats.plays?.toLocaleString()}`);
        console.log(`   ❤️ Likes: ${metadata.stats.likes?.toLocaleString()}`);
        console.log(`   💬 Comments: ${metadata.stats.comments?.toLocaleString()}`);
        console.log(`   🔄 Shares: ${metadata.stats.shares?.toLocaleString()}`);
        
        console.log('\n🎵 Music:');
        console.log(`   Title: ${metadata.music.title}`);
        console.log(`   Author: ${metadata.music.author}`);
        
        if (metadata.hashtags.length > 0) {
            console.log('\n🏷️ Hashtags:');
            console.log(`   ${metadata.hashtags.map(tag => '#' + tag).join(', ')}`);
        }

        console.log('\n🎬 Video Info:');
        console.log(`   Duration: ${metadata.video.duration}s`);
        console.log(`   Resolution: ${metadata.video.width}x${metadata.video.height}`);

        // Download video
        console.log('\n⬇️ Downloading video...\n');
        const downloadedPath = await downloadTikTokVideo(videoUrl);

        console.log('\n✅ Download Complete!');
        console.log('📁 File saved:');
        console.log(`   Path: ${downloadedPath}`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

// Run if called directly (not imported as module)
if (require.main === module) {
    main();
}

module.exports = {
    downloadTikTokVideo,
    getTikTokMetadata
};