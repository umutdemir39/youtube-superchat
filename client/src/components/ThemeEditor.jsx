import React, { useState, useEffect } from 'react';
import { PaintBucket } from 'lucide-react';
import './ThemeEditor.css';

const DEFAULT_FONTS = [
  'Inter',
  'Roboto',
  'Poppins',
  'Montserrat',
  'Open Sans',
  'Oswald'
];

const DEFAULT_THEME_TEMPLATES = {
  glass: {
    baseTheme: 'glass',
    fontFamily: 'Inter',
    headerBg: 'rgba(30, 41, 59, 0.85)',
    headerColor: '#ffffff',
    bodyBg: 'rgba(15, 23, 42, 0.85)',
    bodyColor: '#ffffff',
    amountColor: '#4ade80',
    authorFontSize: '1.2rem',
    amountFontSize: '1.5rem',
    bodyFontSize: '1.3rem'
  },
  transparent: {
    baseTheme: 'transparent',
    fontFamily: 'Inter',
    headerBg: 'transparent',
    headerColor: '#ffffff',
    bodyBg: 'transparent',
    bodyColor: '#ffffff',
    amountColor: '#4ade80',
    authorFontSize: '1.2rem',
    amountFontSize: '1.5rem',
    bodyFontSize: '1.3rem'
  },
  default: {
    baseTheme: 'default',
    fontFamily: 'Inter',
    headerBg: '#1565C0',
    headerColor: '#ffffff',
    bodyBg: '#1976D2',
    bodyColor: '#ffffff',
    amountColor: '#10b981',
    authorFontSize: '1.2rem',
    amountFontSize: '1.5rem',
    bodyFontSize: '1.3rem'
  }
};

const ColorInput = ({ label, value, onChange }) => {
  // Extract hex if possible to feed the color picker picker
  let hexValue = '#000000';
  if (value && value.startsWith('#')) {
    hexValue = value.substring(0, 7);
  }

  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="color-input-group">
        <div className="color-swatch-wrapper">
          <input 
            type="color" 
            className="color-input-swatch"
            value={hexValue} 
            onChange={(e) => onChange(e.target.value)} 
          />
          <PaintBucket size={14} className="color-edit-icon" />
        </div>
        <input 
          type="text" 
          className="color-input-text"
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          placeholder="rgba() veya #hex"
        />
      </div>
    </div>
  );
};

const SizeInput = ({ label, value, onChange }) => {
  let displayValue = String(value).replace(/rem|px/g, '');
  // Convert rem to approx px for legacy templates
  if (String(value).includes('rem')) {
    displayValue = (parseFloat(displayValue) * 16).toString();
  }

  const handleNumChange = (e) => {
    onChange(e.target.value + 'px');
  };

  return (
    <div className="form-group">
      <label>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', height: '38px', background: 'var(--bg-color)' }}>
        <input 
          type="number" 
          value={displayValue} 
          onChange={handleNumChange} 
          style={{ flex: 1, border: 'none', background: 'transparent', height: '100%', padding: '0 1rem', outline: 'none', color: 'inherit' }}
        />
        <div style={{ padding: '0 1rem', color: 'var(--text-muted)', borderLeft: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', height: '100%', fontSize: '0.9rem' }}>
          px
        </div>
      </div>
    </div>
  );
};

const ThemeEditor = ({ isOpen, onClose, socket }) => {
  const [themeName, setThemeName] = useState('Yeni Tema');
  const [selectedTemplate, setSelectedTemplate] = useState('glass');
  const [config, setConfig] = useState(DEFAULT_THEME_TEMPLATES.glass);

  useEffect(() => {
    if (isOpen) {
      setThemeName('Yeni Tema');
      setSelectedTemplate('glass');
      setConfig(DEFAULT_THEME_TEMPLATES.glass);
    }
  }, [isOpen]);

  useEffect(() => {
    if (config.fontFamily) {
      const fontName = config.fontFamily.replace(/ /g, '+');
      const linkId = `font-${fontName}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;600;700;800&display=swap`;
        document.head.appendChild(link);
      }
    }
  }, [config.fontFamily]);

  if (!isOpen) return null;

  const handleTemplateChange = (e) => {
    const template = e.target.value;
    setSelectedTemplate(template);
    setConfig(DEFAULT_THEME_TEMPLATES[template]);
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const newTheme = {
      id: 'custom_' + Date.now(),
      name: themeName,
      ...config
    };
    socket.emit('add_custom_theme', newTheme);
    // Auto select the new theme
    socket.emit('update_settings', { theme: newTheme.id });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content theme-editor-modal">
        <div className="modal-header">
          <h2>Temayı Düzenle / Yeni Tema Oluştur</h2>
          <button className="close-btn" onClick={onClose}><i className="fa-solid fa-times"></i></button>
        </div>
        
        <div className="modal-body editor-layout-split">
          <div className="editor-layout-left">
            <div className="form-group">
              <label>Şablon Seç (Kopyala)</label>
              <select value={selectedTemplate} onChange={handleTemplateChange}>
                <option value="glass">Cam Efekti (Glassmorphism)</option>
                <option value="transparent">Arka Plansız (Transparent)</option>
                <option value="default">Klasik (YouTube Standart)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Tema Adı</label>
              <input 
                type="text" 
                value={themeName} 
                onChange={e => setThemeName(e.target.value)} 
                placeholder="Örn: Benim Temam 1"
              />
            </div>

            <div className="editor-grid">
              <div className="editor-section">
                <h3>Genel & Tipografi</h3>
                
                <div className="form-group">
                  <label>Yazı Tipi (Font)</label>
                  <select value={config.fontFamily} onChange={e => handleChange('fontFamily', e.target.value)}>
                    {DEFAULT_FONTS.map(font => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>

                <SizeInput label="Yazar İsmi Boyutu" value={config.authorFontSize} onChange={val => handleChange('authorFontSize', val)} />
                <SizeInput label="Miktar Boyutu" value={config.amountFontSize} onChange={val => handleChange('amountFontSize', val)} />
                <SizeInput label="Mesaj Boyutu" value={config.bodyFontSize} onChange={val => handleChange('bodyFontSize', val)} />
              </div>

              <div className="editor-section">
                <h3>Renkler</h3>
                
                <ColorInput label="Üst Kısım Arka Planı" value={config.headerBg} onChange={val => handleChange('headerBg', val)} />
                <ColorInput label="Yazar İsmi Rengi" value={config.headerColor} onChange={val => handleChange('headerColor', val)} />
                <ColorInput label="Bağış Miktarı Rengi" value={config.amountColor} onChange={val => handleChange('amountColor', val)} />
                <ColorInput label="Mesaj Arka Planı" value={config.bodyBg} onChange={val => handleChange('bodyBg', val)} />
                <ColorInput label="Mesaj Yazı Rengi" value={config.bodyColor} onChange={val => handleChange('bodyColor', val)} />
              </div>
            </div>
          </div>

          <div className="editor-layout-right">
            <h3>Canlı Önizleme</h3>
            <div className="preview-section" style={{ padding: '2rem', background: 'url(https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80) center/cover', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid var(--border-color)', minHeight: '300px' }}>
              <div 
                style={{
                  width: '100%',
                  maxWidth: '350px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  fontFamily: config.fontFamily,
                  ...(config.baseTheme === 'glass' ? { borderTop: '4px solid #1565C0' } : {}),
                  ...(config.baseTheme === 'transparent' ? { background: 'transparent', boxShadow: 'none' } : { boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }),
                }}
              >
                <div style={{
                  padding: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  backgroundColor: config.headerBg,
                  color: config.headerColor,
                  ...(config.baseTheme === 'glass' ? { backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.1)' } : {}),
                  ...(config.baseTheme === 'transparent' ? { textShadow: '1px 1px 2px black, 0 0 1em black' } : {})
                }}>
                  <img src="https://ui-avatars.com/api/?name=Örnek+İzleyici&background=3b82f6&color=fff" style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)' }} alt="avatar" />
                  <div>
                    <div style={{ fontSize: config.authorFontSize, fontWeight: '600' }}>Örnek İzleyici</div>
                    <div style={{ fontSize: config.amountFontSize, fontWeight: '800', color: config.amountColor }}>₺500,00</div>
                  </div>
                </div>
                <div style={{
                  padding: '1.2rem',
                  backgroundColor: config.bodyBg,
                  color: config.bodyColor,
                  fontSize: config.bodyFontSize,
                  lineHeight: '1.5',
                  ...(config.baseTheme === 'glass' ? { backdropFilter: 'blur(12px)' } : {}),
                  ...(config.baseTheme === 'transparent' ? { textShadow: '1px 1px 2px black, 0 0 1em black' } : {})
                }}>
                  Bu bir canlı önizleme mesajıdır. Renk ve yazı boyutu anında yansır!
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button className="btn btn-secondary" onClick={onClose}>İptal</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <i className="fa-solid fa-save"></i> Kaydet ve Seç
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeEditor;
