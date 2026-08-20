const axios = require('axios');
const store = require('./store');

let pollingInterval = null;
let currentVideoId = null;

// Starts polling youtube API
function startPolling(io) {
    if (pollingInterval) clearInterval(pollingInterval);


    console.log('Starting YouTube API polling...');
    poll(io); // initial poll
    pollingInterval = setInterval(() => poll(io), 10000); // Poll every 10 seconds (respecting quotas)
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

async function poll(io) {
    const state = store.getState();
    const { settings } = state;
    const { apiKey, videoId } = settings;
    let { activeLiveChatId, nextPageToken } = state;

    if (!apiKey || !videoId) {
        // Missing settings, wait for them
        return;
    }

    try {
        // Step 1: Get live chat ID if video changed or we don't have it
        if (currentVideoId !== videoId || !activeLiveChatId) {
            currentVideoId = videoId;
            const videoRes = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
                params: {
                    part: 'liveStreamingDetails',
                    id: videoId,
                    key: apiKey
                }
            });

            if (videoRes.data.items && videoRes.data.items.length > 0) {
                const liveDetails = videoRes.data.items[0].liveStreamingDetails;
                if (liveDetails && liveDetails.activeLiveChatId) {
                    const fetchedChatId = liveDetails.activeLiveChatId;
                    
                    if (fetchedChatId !== activeLiveChatId) {
                        console.log(`New live chat ID found: ${fetchedChatId}, resetting token.`);
                        store.setNextPageToken(null);
                        store.setActiveLiveChatId(fetchedChatId);
                        activeLiveChatId = fetchedChatId;
                        nextPageToken = null;
                    } else {
                        console.log(`Found live chat ID: ${activeLiveChatId}`);
                    }
                } else {
                    console.log('Video is not live or has no live chat.');
                    io.emit('api_error', 'Video is not live or has no live chat.');
                    return;
                }
            } else {
                console.log('Video not found.');
                io.emit('api_error', 'Video not found or API key is invalid.');
                return;
            }
        }

        // Step 2: Fetch chat messages
        const chatRes = await axios.get(`https://www.googleapis.com/youtube/v3/liveChat/messages`, {
            params: {
                liveChatId: activeLiveChatId,
                part: 'snippet,authorDetails',
                key: apiKey,
                pageToken: nextPageToken || undefined
            }
        });

        const items = chatRes.data.items || [];
        if (chatRes.data.nextPageToken) {
            store.setNextPageToken(chatRes.data.nextPageToken);
        }

        // Step 3: Process super chats
        let hasNewSuperChats = false;

        for (const item of items) {
            const snippet = item.snippet;
            
            // Check if it's a super chat or super sticker
            if (snippet.type === 'superChatEvent' || snippet.type === 'superStickerEvent') {
                const author = item.authorDetails;
                const superChatDetails = snippet.superChatDetails || snippet.superStickerDetails;
                
                const superChatData = {
                    id: item.id,
                    timestamp: new Date(snippet.publishedAt).getTime(),
                    authorName: author.displayName,
                    authorProfileImageUrl: author.profileImageUrl,
                    amountDisplayString: superChatDetails.displayString,
                    amountMicros: superChatDetails.amountMicros,
                    currency: superChatDetails.currency,
                    userComment: superChatDetails.userComment || '', // super stickers might not have comments
                    tier: superChatDetails.tier,
                    isSticker: snippet.type === 'superStickerEvent',
                    stickerUrl: snippet.type === 'superStickerEvent' ? superChatDetails.superStickerMetadata?.stickerUrl : null
                };

                // Try to add to store
                const added = store.addSuperChat(superChatData);
                if (added) {
                    hasNewSuperChats = true;
                    console.log(`New Super Chat: ${superChatData.authorName} - ${superChatData.amountDisplayString}`);
                }
            }
        }

        if (hasNewSuperChats) {
            // Tell all connected clients to update their state
            io.emit('state_update', store.getState());
        }

        io.emit('api_status', { status: 'connected' });

    } catch (error) {
        console.error('YouTube API Error:', error.response?.data?.error?.message || error.message);
        
        // Reset tokens if API key/Video ID is bad
        if (error.response && error.response.status === 403) {
             io.emit('api_error', 'API Quota exceeded or permission denied.');
        } else if (error.response && error.response.status === 400) {
             io.emit('api_error', 'Invalid API request (check Video ID or API Key).');
             store.setActiveLiveChatId(null);
             store.setNextPageToken(null);
        } else {
             io.emit('api_error', 'Connection error: ' + (error.response?.data?.error?.message || error.message));
        }
    }
}

module.exports = {
    startPolling,
    stopPolling
};
