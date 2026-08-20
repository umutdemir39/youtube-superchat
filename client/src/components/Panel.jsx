import React, { useState, useEffect } from 'react';
import { Settings, Play, SkipForward, Trash2, CheckCircle, XCircle, EyeOff, Plus, History, ArrowLeft, ArrowRight, Search, GripHorizontal, Edit3, Copy, Link as LinkIcon } from 'lucide-react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './Panel.css';
import ThemeEditor from './ThemeEditor';

const ResponsiveGridLayout = WidthProvider(Responsive);

const Panel = ({ socket, state, isConnected, apiStatus }) => {
  const [apiKey, setApiKey] = useState('');
  const [videoId, setVideoId] = useState('');
  const [theme, setTheme] = useState('glass');
  const [animation, setAnimation] = useState('spring');
  const [searchQuery, setSearchQuery] = useState('');
  const [isThemeEditorOpen, setIsThemeEditorOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [layouts, setLayouts] = useState(() => {
    const saved = localStorage.getItem('panelLayout');
    return saved ? JSON.parse(saved) : {
      lg: [
        { i: 'slider', x: 0, y: 0, w: 12, h: 7, minH: 5 },
        { i: 'search', x: 0, y: 7, w: 12, h: 2, minH: 2, maxH: 3 },
        { i: 'queue', x: 0, y: 9, w: 6, h: 14, minW: 3, minH: 5 },
        { i: 'history', x: 6, y: 9, w: 6, h: 14, minW: 3, minH: 5 }
      ]
    };
  });

  const handleLayoutChange = (layout, allLayouts) => {
    setLayouts(allLayouts);
    localStorage.setItem('panelLayout', JSON.stringify(allLayouts));
  };

  useEffect(() => {
    if (state.settings) {
      setApiKey(state.settings.apiKey || '');
      setVideoId(state.settings.videoId || '');
      setTheme(state.settings.theme || 'glass');
      setAnimation(state.settings.animation || 'spring');
    }
  }, [state.settings]);

  const handleSaveSettings = () => {
    socket.emit('update_settings', { apiKey, videoId, theme, animation });
  };

  const showSuperChat = (sc) => {
    socket.emit('show_superchat', sc);
  };

  const hideSuperChat = () => {
    socket.emit('hide_superchat');
  };

  const skipSuperChat = (id) => {
    socket.emit('skip_superchat', id);
  };

  const clearQueue = () => {
    if(window.confirm('Kuyruğu sıfırlamak istediğinize emin misiniz?')) {
      socket.emit('clear_queue');
    }
  };

  const handlePrev = () => {
    if (!state.currentSuperchatId) {
      if (state.history.length > 0) showSuperChat(state.history[0]);
      return;
    }
    const currentIndex = state.history.findIndex(sc => sc.id === state.currentSuperchatId);
    if (currentIndex !== -1 && currentIndex + 1 < state.history.length) {
      showSuperChat(state.history[currentIndex + 1]);
    }
  };

  const handleNext = () => {
    if (!state.currentSuperchatId) {
      if (state.queue.length > 0) showSuperChat(state.queue[0]);
      return;
    }
    const currentIndex = state.history.findIndex(sc => sc.id === state.currentSuperchatId);
    if (currentIndex > 0) {
      showSuperChat(state.history[currentIndex - 1]);
    } else if (currentIndex === 0) {
      if (state.queue.length > 0) showSuperChat(state.queue[0]);
    }
  };

  const handleGoToLive = () => {
    // Bulunan en güncel "Kuyrukta Olmayan" mesaj, yayıncının en son aktif ettiği (kaldığı) mesajdır.
    const lastShown = state.history.find(sc => !state.queue.some(q => q.id === sc.id));
    
    if (lastShown) {
      showSuperChat(lastShown);
    } else if (state.queue.length > 0) {
      // Eğer henüz hiçbir şey gösterilmediyse, en azından kuyruğun başına gitsin.
      showSuperChat(state.queue[0]);
    }
  };

  const addMock = () => {
    socket.emit('add_mock_superchat');
  };

  const clearMockData = () => {
    socket.emit('clear_mock_data');
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString('tr-TR');
  };

  const filteredQueue = state.queue.filter(sc => 
    sc.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sc.userComment && sc.userComment.toLowerCase().includes(searchQuery.toLowerCase())) ||
    sc.amountDisplayString.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredHistory = state.history.filter(sc => 
    sc.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sc.userComment && sc.userComment.toLowerCase().includes(searchQuery.toLowerCase())) ||
    sc.amountDisplayString.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSliderItems = () => {
    // Determine dynamic slots based on window width to prevent squishing
    let pastCount = 2;
    let futureCount = 4;
    
    if (windowWidth < 1400) { pastCount = 1; futureCount = 3; }
    if (windowWidth < 1000) { pastCount = 1; futureCount = 2; }
    if (windowWidth < 800) { pastCount = 0; futureCount = 2; }
    
    const totalSlots = pastCount + 1 + futureCount;
    let slots = Array(totalSlots).fill(null);
    const centerIndex = pastCount;
    
    const getType = (sc) => state.queue.some(q => q.id === sc.id) ? 'queue' : 'history';
    const formatItem = (sc, typeOverride) => ({ ...sc, _type: typeOverride || getType(sc) });

    if (!state.currentSuperchatId) {
      // Find the most recent item that is NOT in the queue
      const lastShownIndex = state.history.findIndex(sc => !state.queue.some(q => q.id === sc.id));
      
      if (lastShownIndex !== -1) {
        slots[centerIndex - 1] = formatItem(state.history[lastShownIndex]);
        if (pastCount === 2 && lastShownIndex + 1 < state.history.length) {
          slots[centerIndex - 2] = formatItem(state.history[lastShownIndex + 1]);
        }
      }
      
      // Future slots from queue
      for(let i = 0; i < futureCount; i++) {
        if (state.queue.length > i) {
          slots[centerIndex + 1 + i] = formatItem(state.queue[i], 'queue');
        }
      }
      return slots;
    }

    const currentIndex = state.history.findIndex(sc => sc.id === state.currentSuperchatId);
    if (currentIndex === -1) return slots;

    slots[centerIndex] = formatItem(state.history[currentIndex], 'active');

    if (pastCount >= 1 && currentIndex + 1 < state.history.length) slots[centerIndex - 1] = formatItem(state.history[currentIndex + 1]);
    if (pastCount === 2 && currentIndex + 2 < state.history.length) slots[centerIndex - 2] = formatItem(state.history[currentIndex + 2]);

    for (let i = 1; i <= futureCount; i++) {
      if (currentIndex - i >= 0) {
        slots[centerIndex + i] = formatItem(state.history[currentIndex - i]);
      }
    }

    return slots;
  };

  const sliderItems = getSliderItems();

  return (
    <div className="panel-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
             <i className="fa-solid fa-bolt" style={{ color: '#3b82f6' }}></i> SC Manager
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
            {!isConnected && (
              <span className="status-badge error">
                <XCircle size={14} /> Sunucu Koptu
              </span>
            )}
            {apiStatus && (
              <span className={`status-badge ${apiStatus.type === 'success' ? 'success' : 'error'}`}>
                {apiStatus.type === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                YouTube API
              </span>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <LinkIcon size={18} /> OBS Bağlantı Linki
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
            Aşağıdaki linki kopyalayıp OBS'te "Tarayıcı (Browser)" kaynağı olarak ekleyin.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              readOnly 
              value="http://localhost:3001/overlay" 
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}
            />
            <button 
              className={`btn ${copied ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => {
                navigator.clipboard.writeText('http://localhost:3001/overlay');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              style={{ padding: '0.5rem', borderRadius: '4px' }}
            >
              {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={20} /> Ayarlar
            </div>
            <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', borderRadius: '4px' }} onClick={() => setIsThemeEditorOpen(true)}>
              <Edit3 size={14} /> Temayı Düzenle
            </button>
          </div>
          
          <div className="form-group">
            <label>YouTube API Key</label>
            <input 
              type="password" 
              value={apiKey} 
              onChange={e => setApiKey(e.target.value)} 
              placeholder="AIzaSy..." 
            />
          </div>
          
          <div className="form-group">
            <label>Canlı Yayın Video ID</label>
            <input 
              type="text" 
              value={videoId} 
              onChange={e => setVideoId(e.target.value)} 
              placeholder="Örn: dQw4w9WgXcQ" 
            />
          </div>

          <div className="form-group">
            <label>OBS Tema</label>
            <select value={theme} onChange={e => setTheme(e.target.value)}>
              <option value="glass">Cam Efekti (Dark Glassmorphism)</option>
              <option value="transparent">Arka Plansız (Transparent)</option>
              <option value="default">YouTube Standart (Default)</option>
              {state.customThemes && state.customThemes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Geçiş Efekti</label>
            <select value={animation} onChange={e => setAnimation(e.target.value)}>
              <option value="spring">Yaylanarak (Spring)</option>
              <option value="fade">Yumuşak (Fade)</option>
              <option value="slide-up">Aşağıdan Yukarı (Slide Up)</option>
              <option value="slide-left">Sağdan Sola (Slide Left)</option>
            </select>
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSaveSettings}>
            Ayarları Kaydet
          </button>

          {/* TEST WIDGET */}
          <div className="widget-panel" style={{ padding: '1rem', flex: 1, minHeight: '120px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Test</h3>
            <button className="btn btn-secondary" onClick={addMock} style={{ width: '100%', marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', borderRadius: '8px' }}>
              <Plus size={18} /> Sahte Super Chat Ekle
            </button>
            <button className="btn btn-secondary" onClick={clearMockData} style={{ width: '100%', display: 'flex', gap: '0.5rem', justifyContent: 'center', borderRadius: '8px', color: 'var(--text-muted)' }}>
              <Trash2 size={18} /> Testleri Temizle
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content" style={{ padding: '1rem', overflowY: 'auto' }}>
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={30}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
          margin={[16, 16]}
        >
          {/* SLIDER WIDGET */}
          <div key="slider" className="widget-panel">
            <div className="drag-handle" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GripHorizontal size={16} /> Zaman Çizelgesi
              </div>
              <button 
                className="btn btn-primary" 
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} 
                onClick={(e) => { e.stopPropagation(); handleGoToLive(); }}
              >
                Canlıya Dön
              </button>
            </div>
            <div className="widget-content">
              <div className="slider-wrapper" style={{ height: '100%' }}>
                <button className="btn btn-secondary slider-nav-btn" onClick={handlePrev}>
                  <ArrowLeft size={24} />
                </button>
                
                <div className="slider-container" style={{ height: '100%' }}>
                  {sliderItems.map((item, i) => {
                    if (!item) {
                      return (
                        <div key={`empty-${i}`} className={`slider-card placeholder ${i === 2 ? 'active' : ''}`}>
                          {i === 2 ? 'Bekleniyor...' : ''}
                        </div>
                      );
                    }
                    return (
                      <div 
                        key={item.id} 
                        className={`slider-card ${item._type === 'active' ? 'active' : ''} ${item._type}`}
                        onClick={() => showSuperChat(item)}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className={`badge ${item._type}`} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
                          {item._type === 'history' ? 'Geçmiş' : item._type === 'queue' ? 'Kuyruk' : 'Canlı'}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '0.5rem', gap: '0.25rem' }}>
                           <img src={item.authorProfileImageUrl} alt="avatar" style={{width: 42, height: 42, borderRadius: '50%', flexShrink: 0, marginBottom: '0.25rem'}} />
                           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', overflow: 'hidden' }}>
                             <span className="sc-author" style={{ width: '100%', textAlign: 'center' }}>{item.authorName}</span>
                             <span className="sc-amount" style={{ fontSize: '1rem', marginTop: '0.2rem' }}>{item.amountDisplayString}</span>
                           </div>
                        </div>
                        {item.userComment && <div className="sc-comment" style={{ textAlign: 'center' }}>{item.userComment}</div>}
                      </div>
                    );
                  })}
                </div>

                <button className="btn btn-secondary slider-nav-btn" onClick={handleNext}>
                  <ArrowRight size={24} />
                </button>
              </div>
            </div>
          </div>

          {/* SEARCH WIDGET */}
          <div key="search" className="widget-panel search-widget">
            <div className="widget-content" style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', height: '100%', flexDirection: 'row' }}>
              <div className="drag-handle" style={{ padding: '0 1rem 0 0', border: 'none', background: 'transparent' }} title="Sürükle">
                <GripHorizontal size={20} color="var(--text-muted)" />
              </div>
              <Search size={22} color="var(--accent)" />
              <input 
                type="text" 
                className="search-input"
                placeholder="İsim, mesaj veya miktar ile ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ marginLeft: '1rem', fontSize: '1.1rem', padding: '0.5rem 0' }}
              />
            </div>
          </div>

          {/* QUEUE WIDGET */}
          <div key="queue" className="widget-panel">
            <div className="drag-handle queue-header" style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)', margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GripHorizontal size={16} />
                <h2 style={{ fontSize: '1rem', margin: 0 }}>Bekleyen ({filteredQueue.length})</h2>
              </div>
              <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                <>
                  <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={handlePrev} title="Önceki (Geçmiş)">
                    <ArrowLeft size={14} /> Geri
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={handleNext} title="Sonraki (Yeni)">
                    İleri <ArrowRight size={14} />
                  </button>
                  <span style={{color: 'var(--border-color)'}}>|</span>
                </>
                <button className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={hideSuperChat}>
                  <EyeOff size={14} /> Gizle
                </button>
                <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={clearQueue}>
                  <Trash2 size={14} /> Sıfırla
                </button>
              </div>
            </div>

            <div className="widget-content scrollable">
              {filteredQueue.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  Sonuç yok.
                </div>
              ) : (
                filteredQueue.map((sc) => (
                  <div className="superchat-item" key={sc.id}>
                    <div className="superchat-info">
                      <img src={sc.authorProfileImageUrl} alt="avatar" className="avatar" />
                      <div>
                        <div>
                          <span className="author-name">{sc.authorName}</span>
                          <span className="amount">{sc.amountDisplayString}</span>
                        </div>
                        <div className="comment">{sc.userComment}</div>
                        <div className="timestamp">{formatDate(sc.timestamp)}</div>
                      </div>
                    </div>
                    <div className="actions">
                      <button className="btn btn-primary" onClick={() => showSuperChat(sc)}>
                        <Play size={16} />
                      </button>
                      <button className="btn btn-secondary" onClick={() => skipSuperChat(sc.id)}>
                        <SkipForward size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* HISTORY WIDGET */}
          <div key="history" className="widget-panel">
            <div className="drag-handle queue-header" style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)', margin: 0 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>
                <GripHorizontal size={16} /> <History size={16} /> Geçmiş ({filteredHistory.length})
              </h2>
            </div>
            
            <div className="widget-content scrollable">
              {filteredHistory.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  Geçmiş kayıt bulunamadı.
                </div>
              ) : (
                filteredHistory.slice(0, 100).map((sc) => (
                  <div className="superchat-item history-item" key={'hist_'+sc.id}>
                    <div className="superchat-info">
                      <img src={sc.authorProfileImageUrl} alt="avatar" className="avatar" style={{width: '36px', height: '36px'}} />
                      <div>
                        <div>
                          <span className="author-name">{sc.authorName}</span>
                          <span className="amount">{sc.amountDisplayString}</span>
                        </div>
                        {sc.userComment && <div className="comment">{sc.userComment}</div>}
                        <div className="timestamp">{formatDate(sc.timestamp)}</div>
                      </div>
                    </div>
                    <div className="actions">
                      <button className="btn btn-secondary" onClick={() => showSuperChat(sc)}>
                        Göster
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </ResponsiveGridLayout>
      </div>
      <ThemeEditor 
        isOpen={isThemeEditorOpen} 
        onClose={() => setIsThemeEditorOpen(false)} 
        customThemes={state.customThemes || []} 
        socket={socket} 
      />
    </div>
  );
};

export default Panel;
