# TikTok Video Downloader

A Node.js tool to download TikTok videos without watermarks, along with their metadata.

## Features

- Downloads TikTok videos without watermarks
- Saves video metadata in JSON format
- Processes multiple videos from a links file
- Tracks failed downloads
- Uses video descriptions as filenames
- Supports HD video downloads
- Progress tracking and detailed console output

## Prerequisites

- Node.js (v12 or higher)
- npm (Node Package Manager)

## Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:
```bash
npm install axios
```

## Usage

1. Create a `links.txt` file in the project directory
2. Add TikTok video URLs to `links.txt`, one per line:
```
https://www.tiktok.com/@username/video/1234567890
https://www.tiktok.com/@username/video/0987654321
```

3. Run the script:
```bash
node main.js
```

## Output Structure

The script will create the following structure:
```
project/
├── downloads/          # Downloaded videos
├── metadata/          # JSON files containing video metadata
├── failed.txt         # Log of failed downloads
├── links.txt          # Input file with video URLs
└── main.js            # Main script
```

## Metadata Information

Each video's metadata includes:
- Video ID and description
- Creation time
- Author information
- View, like, comment, and share counts
- Music details
- Hashtags
- Video specifications (duration, resolution)

## Error Handling

- Failed downloads are logged to `failed.txt`
- Each failed entry includes the URL and error message
- The script continues processing remaining links even if some fail

## Notes

- A 1-second delay is added between downloads to avoid rate limiting
- Video filenames are based on their descriptions (sanitized for valid characters)
- Maximum filename length is 100 characters
- HD videos are downloaded when available

## Example Output

```
📋 Found 5 links to process

🔄 Processing link 1/5
🔗 URL: https://www.tiktok.com/@username/video/1234567890
📊 Video Metadata:
==================
🆔 Video ID: 1234567890
📝 Description: Video Title
...
✅ Video downloaded successfully: Video_Title.mp4
```

## License

MIT License
