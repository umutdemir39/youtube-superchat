import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import Panel from './components/Panel';
import Overlay from './components/Overlay';

// Connect to the backend server (dynamically check if running from Vite dev server or Electron)
const socketUrl = window.location.port === '5173' ? 'http://localhost:3001' : '';
const socket = io(socketUrl);

function App() {
  const [state, setState] = useState({
    settings: { apiKey: '', videoId: '', theme: 'glass', animation: 'spring' },
    queue: [],
    history: []
  });
  const [isConnected, setIsConnected] = useState(false);
  const [apiStatus, setApiStatus] = useState(null);

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    socket.on('state_update', (newState) => {
      setState(newState);
    });

    socket.on('api_error', (msg) => {
      setApiStatus({ type: 'error', message: msg });
    });

    socket.on('api_status', (status) => {
      setApiStatus({ type: 'success', message: 'Connected to YouTube' });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('state_update');
      socket.off('api_error');
      socket.off('api_status');
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            <Panel 
              socket={socket} 
              state={state} 
              isConnected={isConnected} 
              apiStatus={apiStatus} 
            />
          } 
        />
        <Route 
          path="/overlay" 
          element={<Overlay socket={socket} theme={state.settings.theme} animation={state.settings.animation} customThemes={state.customThemes} state={state} />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
