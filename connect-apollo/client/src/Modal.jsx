import React, { useRef, useState, useEffect } from 'react';

const Modal = ({ title, onClose, children }) => {
  const contentRef = useRef(null);
  const [isClosing, setIsClosing] = useState(false);

  // Рефы для логики свайпа
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const isDragging = useRef(false);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 250); 
  };

  // --- ЛОГИКА СВАЙПА ---

  const handleTouchStart = (e) => {
    const target = e.target;

    // ВАЖНОЕ ИСПРАВЛЕНИЕ:
    // Если мы касаемся инпута, кнопки или текстового поля - НЕ начинаем драг окна.
    // Это позволит нормально фокусироваться и выделять текст.
    if (['INPUT', 'TEXTAREA', 'BUTTON', 'LABEL'].includes(target.tagName)) {
        return;
    }

    // Проверяем скролл внутри контента
    let currentTarget = target;
    let isScrolledContent = false;

    while (currentTarget && currentTarget !== contentRef.current) {
        if (currentTarget.scrollHeight > currentTarget.clientHeight && currentTarget.scrollTop > 0) {
            isScrolledContent = true;
            break;
        }
        currentTarget = currentTarget.parentElement;
    }

    if (isScrolledContent) return;

    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
    
    if (contentRef.current) {
        contentRef.current.style.transition = 'none';
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current || !contentRef.current) return;
    
    const touchY = e.touches[0].clientY;
    const deltaY = touchY - touchStartY.current;

    if (deltaY > 0) {
      if (e.cancelable) e.preventDefault(); 
      touchCurrentY.current = deltaY;
      contentRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || !contentRef.current) return;
    isDragging.current = false;

    const movedDistance = touchCurrentY.current;
    
    contentRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';

    if (movedDistance > 120) {
        contentRef.current.style.transform = `translateY(100vh)`;
        setTimeout(onClose, 300);
    } else {
        contentRef.current.style.transform = '';
    }
    
    touchCurrentY.current = 0;
  };

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleOverlayClick}>
      <div 
        className={`modal-content ${isClosing ? 'closing' : ''}`}
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="modal-handle-bar"></div>

        <div className="modal-header">
          <h2 style={{ margin: 0, fontSize: '18px' }}>{title}</h2>
          <button className="close-btn" onClick={handleClose}>&times;</button>
        </div>
        <div className="modal-scroll-container">
            {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;