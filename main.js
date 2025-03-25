const axios = require('axios');
const fs = require('fs');
const path = require('path');

function extractVideoId(url) {
    const regex = /\/video\/(\d+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

async function getTikTokData(videoUrl) {
    try {
        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            throw new Error('Invalid TikTok URL');
        }

        const apiUrl = 'https://www.tikwm.com/api/';
        const response = await axios.post(apiUrl, {
            url: videoUrl,
            hd: 1
        });

        if (response.data.code !== 0) {
            throw new Error('Failed to get video information');
        }

        return response.data.data;
    } catch (error) {
        console.error('Error fetching data:', error.message);
        throw error;
    }
}

async function displayMetadata(videoData) {
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

    return metadata;
}

function sanitizeFileName(fileName) {
    // Remove only invalid file name characters
    return fileName
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // Remove invalid characters
        .substring(0, 100);                     // Limit length to 100 characters
}

async function downloadVideo(videoData) {
    try {
        const videoDownloadUrl = videoData.hdplay || videoData.play;

        // Create downloads directory if it doesn't exist
        const downloadDir = path.join(__dirname, 'downloads');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir);
        }

        // Download the video
        console.log('\n⬇️ Downloading video...');
        const videoResponse = await axios({
            method: 'GET',
            url: videoDownloadUrl,
            responseType: 'stream'
        });

        // Create filename from description, fallback to ID if no description
        const safeDescription = videoData.title ? sanitizeFileName(videoData.title) : videoData.id;
        const fileName = `${safeDescription}.mp4`;
        const filePath = path.join(downloadDir, fileName);

        const writer = fs.createWriteStream(filePath);
        videoResponse.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`✅ Video downloaded successfully: ${fileName}`);
                resolve(filePath);
            });
            writer.on('error', reject);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

function saveMetadataToJson(metadata, videoUrl) {
    const metadataDir = path.join(__dirname, 'metadata');
    if (!fs.existsSync(metadataDir)) {
        fs.mkdirSync(metadataDir);
    }

    const metadataPath = path.join(metadataDir, `${metadata.id}.json`);
    const metadataWithUrl = { ...metadata, sourceUrl: videoUrl };
    fs.writeFileSync(metadataPath, JSON.stringify(metadataWithUrl, null, 2));
}

function logFailedDownload(url, error) {
    const failedPath = path.join(__dirname, 'failed.txt');
    const logEntry = `${url} - Error: ${error.message}\n`;
    fs.appendFileSync(failedPath, logEntry);
}

async function processLinks() {
    const linksPath = path.join(__dirname, 'links.txt');
    if (!fs.existsSync(linksPath)) {
        console.error('❌ links.txt file not found!');
        process.exit(1);
    }

    const links = fs.readFileSync(linksPath, 'utf8').split('\n').filter(link => link.trim());
    console.log(`📋 Found ${links.length} links to process\n`);

    for (let i = 0; i < links.length; i++) {
        const url = links[i].trim();
        if (!url) continue;

        console.log(`\n🔄 Processing link ${i + 1}/${links.length}`);
        console.log(`🔗 URL: ${url}`);

        try {
            const videoData = await getTikTokData(url);
            const metadata = await displayMetadata(videoData);
            await downloadVideo(videoData);
            saveMetadataToJson(metadata, url);
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between downloads
        } catch (error) {
            console.error(`❌ Failed to process ${url}: ${error.message}`);
            logFailedDownload(url, error);
        }
    }
}

// Start processing if run directly
if (require.main === module) {
    processLinks().catch(error => {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    });
}

module.exports = {
    getTikTokData,
    downloadVideo
};