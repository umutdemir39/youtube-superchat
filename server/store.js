const fs = require('fs');
const path = require('path');

const STORE_FILE = path.join(__dirname, 'data.json');

// Default initial state
let state = {
    settings: {
        apiKey: '',
        videoId: '',
        theme: 'glass', // glass, default, transparent, or custom theme id
        animation: 'spring', // spring, fade, slide-up, slide-left
    },
    customThemes: [], // Array of custom theme objects
    queue: [],
    history: [],
    lastReadEventId: null,
    currentSuperchatId: null,
    nextPageToken: null,
    activeLiveChatId: null
};

// Load state from file on startup
function loadState() {
    try {
        if (fs.existsSync(STORE_FILE)) {
            const data = fs.readFileSync(STORE_FILE, 'utf8');
            const parsed = JSON.parse(data);
            state = { ...state, ...parsed };
            console.log('State loaded from data.json');
        }
    } catch (err) {
        console.error('Error loading state:', err);
    }
}

// Save state to file
function saveState() {
    try {
        fs.writeFileSync(STORE_FILE, JSON.stringify(state, null, 2));
    } catch (err) {
        console.error('Error saving state:', err);
    }
}

function getState() {
    return state;
}

function updateSettings(settings) {
    state.settings = { ...state.settings, ...settings };
    saveState();
}

function setCurrentSuperchatId(id) {
    state.currentSuperchatId = id;
    saveState();
}

function addSuperChat(superchat) {
    // Check if it's already in queue or history to avoid duplicates
    if (state.queue.some(sc => sc.id === superchat.id) || state.history.some(sc => sc.id === superchat.id)) {
        return false;
    }

    // Add to queue
    state.queue.push(superchat);

    // Save the last event ID we processed
    state.lastReadEventId = superchat.id;
    
    saveState();
    return true;
}

function addToHistory(superchat) {
    if (!state.history.some(sc => sc.id === superchat.id)) {
        state.history.unshift(superchat);
        saveState();
    }
}

function removeFromQueue(id) {
    state.queue = state.queue.filter(sc => sc.id !== id);
    saveState();
}

function clearQueue() {
    state.queue = [];
    saveState();
}

function clearMockData() {
    state.queue = state.queue.filter(sc => !sc.id.startsWith('mock_'));
    state.history = state.history.filter(sc => !sc.id.startsWith('mock_'));
    if (state.currentSuperchatId && state.currentSuperchatId.startsWith('mock_')) {
        state.currentSuperchatId = null;
    }
    saveState();
}

function setLastReadEventId(id) {
    state.lastReadEventId = id;
    saveState();
}

function setNextPageToken(token) {
    state.nextPageToken = token;
    saveState();
}

function setActiveLiveChatId(id) {
    state.activeLiveChatId = id;
    saveState();
}

function addCustomTheme(theme) {
    if (!state.customThemes) state.customThemes = [];
    state.customThemes.push(theme);
    saveState();
}

function updateCustomTheme(id, themeData) {
    if (!state.customThemes) return;
    const index = state.customThemes.findIndex(t => t.id === id);
    if (index !== -1) {
        state.customThemes[index] = { ...state.customThemes[index], ...themeData };
        saveState();
    }
}

function deleteCustomTheme(id) {
    if (!state.customThemes) return;
    state.customThemes = state.customThemes.filter(t => t.id !== id);
    if (state.settings.theme === id) {
        state.settings.theme = 'glass'; // Reset to default if deleted
    }
    saveState();
}

// Initialize
loadState();

module.exports = {
    getState,
    updateSettings,
    addSuperChat,
    addToHistory,
    removeFromQueue,
    clearQueue,
    clearMockData,
    setLastReadEventId,
    setCurrentSuperchatId,
    setNextPageToken,
    setActiveLiveChatId,
    addCustomTheme,
    updateCustomTheme,
    deleteCustomTheme
};
