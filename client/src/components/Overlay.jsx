import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Overlay.css';

const Overlay = ({ socket, theme, animation = 'spring', customThemes = [], state }) => {
  const [currentSc, setCurrentSc] = useState(null);
  
  const activeCustomTheme = customThemes.find(t => t.id === theme);
  const themeClass = activeCustomTheme ? activeCustomTheme.baseTheme : theme;

  useEffect(() => {
    // Transparent background for body when in overlay mode
    document.body.style.backgroundColor = 'transparent';

    // Instead of relying purely on socket events which might be missed by late joiners like OBS,
    // sync with the global state which is sent upon connection.
    if (state && state.currentSuperchatId && state.history) {
      const activeSc = state.history.find(sc => sc.id === state.currentSuperchatId);
      if (activeSc) setCurrentSc(activeSc);
    } else if (state && !state.currentSuperchatId) {
      setCurrentSc(null);
    }

    return () => {
      document.body.style.backgroundColor = ''; // Reset
    };
  }, [state]);

  useEffect(() => {
    if (activeCustomTheme && activeCustomTheme.fontFamily) {
      const fontName = activeCustomTheme.fontFamily.replace(/ /g, '+');
      const linkId = `font-${fontName}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;600;700;800&display=swap`;
        document.head.appendChild(link);
      }
    }
  }, [activeCustomTheme]);

  // YouTube standard colors based on tier (rough approximation)
  const getTierColors = (tier) => {
    switch(tier) {
      case 1: return { header: '#1565C0', body: '#1976D2' }; // Blue
      case 2: return { header: '#00B8D4', body: '#00E5FF' }; // Light Blue
      case 3: return { header: '#00BFA5', body: '#1DE9B6' }; // Green
      case 4: return { header: '#FFB300', body: '#FFCA28' }; // Yellow
      case 5: return { header: '#E65100', body: '#F57C00' }; // Orange
      case 6: return { header: '#C2185B', body: '#E91E63' }; // Magenta
      case 7: return { header: '#D32F2F', body: '#E53935' }; // Red
      default: return { header: '#1565C0', body: '#1976D2' };
    }
  };

  const getStyle = (type, tier) => {
    if (activeCustomTheme) {
      if (type === 'card') {
        return { 
          fontFamily: activeCustomTheme.fontFamily,
          ...(activeCustomTheme.baseTheme === 'glass' ? { borderTop: `4px solid ${getTierColors(tier).header}` } : {})
        };
      }
      if (type === 'header') {
        return { 
          backgroundColor: activeCustomTheme.headerBg, 
          color: activeCustomTheme.headerColor 
        };
      }
      if (type === 'body') {
        return { 
          backgroundColor: activeCustomTheme.bodyBg, 
          color: activeCustomTheme.bodyColor,
          fontSize: activeCustomTheme.bodyFontSize
        };
      }
      if (type === 'author') {
         return { fontSize: activeCustomTheme.authorFontSize, color: activeCustomTheme.headerColor };
      }
      if (type === 'amount') {
         return { fontSize: activeCustomTheme.amountFontSize, color: activeCustomTheme.amountColor };
      }
    }

    if (theme === 'default') {
      const colors = getTierColors(tier);
      if (type === 'header') return { backgroundColor: colors.header, color: 'white' };
      if (type === 'body') return { backgroundColor: colors.body, color: 'black' };
    }
    
    if (theme === 'glass') {
      // We can add a subtle border color based on tier
      const colors = getTierColors(tier);
      if (type === 'card') return { borderTop: `4px solid ${colors.header}` };
    }

    return {};
  };

  const getVariants = () => {
    switch(animation) {
      case 'fade':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: 0.5 }
        };
      case 'slide-up':
        return {
          initial: { opacity: 0, y: 100 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -100 },
          transition: { type: 'tween', duration: 0.4, ease: 'easeOut' }
        };
      case 'slide-left':
        return {
          initial: { opacity: 0, x: 200 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -200 },
          transition: { type: 'tween', duration: 0.4, ease: 'easeOut' }
        };
      case 'spring':
      default:
        return {
          initial: { opacity: 0, y: 50, scale: 0.9 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: -50, scale: 0.9 },
          transition: { type: 'spring', damping: 20, stiffness: 100 }
        };
    }
  };

  const animProps = getVariants();

  return (
    <div className={`overlay-container theme-${themeClass}`}>
      <AnimatePresence mode="wait">
        {currentSc && (
          <motion.div 
            key={currentSc.id}
            className="sc-card"
            style={getStyle('card', currentSc.tier)}
            initial={animProps.initial}
            animate={animProps.animate}
            exit={animProps.exit}
            transition={animProps.transition}
          >
            <div className="sc-header" style={getStyle('header', currentSc.tier)}>
              <img 
                src={currentSc.authorProfileImageUrl} 
                alt={currentSc.authorName} 
                className="sc-avatar"
              />
              <div className="sc-author-info">
                <div className="sc-author-name" style={getStyle('author')}>{currentSc.authorName}</div>
                <div className="sc-amount" style={getStyle('amount')}>{currentSc.amountDisplayString}</div>
              </div>
            </div>
            
            {currentSc.userComment && (
              <div className="sc-body" style={getStyle('body', currentSc.tier)}>
                {currentSc.userComment}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Overlay;
