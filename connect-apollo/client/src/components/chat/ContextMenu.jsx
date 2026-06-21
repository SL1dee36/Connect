import React, { useLayoutEffect, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { IconReply, IconCopy, IconTrash, IconEdit, IconForward } from '../common/Icons';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const ContextMenu = ({ x, y, msg, onClose, onReply, onCopy, onDeleteRequest, canDelete, onEditRequest, canEdit, onReact, onForward }) => {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ left: x, top: y, opacity: 0 });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    const screenWidth = document.documentElement.clientWidth;
    const screenHeight = window.innerHeight;

    let newX = x;
    let newY = y;

    if (x + width > screenWidth) {
      newX = screenWidth - width - 8;
    }
    if (y + height > screenHeight) {
      newY = screenHeight - height - 8;
    }
    if (newX < 8) newX = 8;
    if (newY < 8) newY = 8;

    setPosition({ left: newX, top: newY, opacity: 1 });

  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  const menuContent = (
    <div
      ref={menuRef}
      className="context-menu-container"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 999999,
        background: '#252525',
        borderRadius: 12,
        border: '1px solid #333',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        minWidth: 180,
        transformOrigin: 'top left',
        transform: position.opacity ? 'scale(1)' : 'scale(0.95)',
        opacity: position.opacity,
        transition: 'opacity 0.12s ease, transform 0.12s ease'
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', gap: 4, padding: '8px 10px', borderBottom: '1px solid #333' }}>
        {REACTION_EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => { onReact?.(emoji); onClose(); }}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: '2px 4px', borderRadius: 8, transition: 'transform 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="menu-item" onClick={onReply} style={itemStyle}>
        <IconReply/> Ответить
      </div>

      <div className="menu-item" onClick={onForward} style={itemStyle}>
        <IconForward/> Переслать
      </div>

      <div className="menu-item" onClick={onCopy} style={itemStyle}>
        <IconCopy/> Копировать
      </div>

      {canEdit && (
        <div className="menu-item" onClick={onEditRequest} style={itemStyle}>
          <IconEdit/> Изменить
        </div>
      )}

      {canDelete && (
        <div className="menu-item" onClick={onDeleteRequest} style={{...itemStyle, color: '#ff4d4d'}}>
          <IconTrash/> Удалить
        </div>
      )}

    </div>
  );

  return ReactDOM.createPortal(menuContent, document.body);
};

const itemStyle = {
  padding: '10px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  cursor: 'pointer',
  color: 'white'
};

export default ContextMenu;