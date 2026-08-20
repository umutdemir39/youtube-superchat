const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const store = require('./store');
const youtube = require('./youtube');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the React client build
app.use(express.static(path.join(__dirname, '../client/dist')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // allow all for local dev
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send initial state
    socket.emit('state_update', store.getState());

    // Update settings (API Key, Video ID, Theme)
    socket.on('update_settings', (newSettings) => {
        store.updateSettings(newSettings);
        io.emit('state_update', store.getState());
        
        // Restart polling with new settings if api/video changes
        youtube.startPolling(io);
    });

    // Control Panel actions
    socket.on('show_superchat', (superchat) => {
        // Update current superchat
        store.setCurrentSuperchatId(superchat.id);
        // Send to OBS overlay
        io.emit('display_superchat', superchat);
        // Remove from queue
        store.removeFromQueue(superchat.id);
        // Update all panels
        io.emit('state_update', store.getState());
    });
    
    socket.on('hide_superchat', () => {
         store.setCurrentSuperchatId(null);
         io.emit('hide_current_superchat');
         io.emit('state_update', store.getState());
    });

    socket.on('skip_superchat', (id) => {
        store.removeFromQueue(id);
        io.emit('state_update', store.getState());
    });

    socket.on('clear_queue', () => {
        store.clearQueue();
        io.emit('state_update', store.getState());
    });
    
    socket.on('clear_mock_data', () => {
        store.clearMockData();
        if (!store.getState().currentSuperchatId) {
            io.emit('hide_current_superchat');
        }
        io.emit('state_update', store.getState());
    });
    
    socket.on('add_mock_superchat', () => {
        const mockMessages = [
            "Bu bir deneme mesajıdır! Harika yayınlar 🚀",
            "Selam! Başarılarının devamını dilerim, çok güzel bir içerik olmuş.",
            "Kısa mesaj.",
            "Wow!",
            "Gerçekten inanılmaz bir yayın. Saatlerdir izliyorum ve hiç sıkılmadım. Emeklerine sağlık, böyle devam et lütfen! Daha fazla içerik bekliyoruz.",
            "Destek olmak istedim, iyi eğlenceler.",
            "", // Boş mesaj
            "Soru: Yeni video ne zaman gelecek?"
        ];
        
        const mockNames = ["Ahmet", "Ayşe", "Mehmet", "Zeynep", "Ali", "Fatma", "Can", "Elif", "Bora", "Deniz"];
        
        const randomMsg = mockMessages[Math.floor(Math.random() * mockMessages.length)];
        const randomName = mockNames[Math.floor(Math.random() * mockNames.length)] + ' ' + Math.floor(Math.random() * 100);
        const randomAmount = Math.floor(Math.random() * 500) + 10;
        
        const mock = {
            id: 'mock_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            timestamp: Date.now(),
            authorName: randomName,
            authorProfileImageUrl: 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj',
            amountDisplayString: '₺' + randomAmount + ',00',
            amountMicros: randomAmount * 1000000,
            currency: 'TRY',
            userComment: randomMsg,
            tier: Math.floor(Math.random() * 7) + 1,
            isSticker: false
        };
        store.addSuperChat(mock);
        io.emit('state_update', store.getState());
    });

    socket.on('add_custom_theme', (theme) => {
        store.addCustomTheme(theme);
        io.emit('state_update', store.getState());
    });

    socket.on('update_custom_theme', (data) => {
        store.updateCustomTheme(data.id, data.theme);
        io.emit('state_update', store.getState());
    });

    socket.on('delete_custom_theme', (id) => {
        store.deleteCustomTheme(id);
        io.emit('state_update', store.getState());
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start YouTube polling if settings exist
if (store.getState().settings.apiKey && store.getState().settings.videoId) {
    youtube.startPolling(io);
}

// React Router fallback (must be after all API/Socket setup, right before app.listen)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`SC Manager Server running on port ${PORT}`);
});
