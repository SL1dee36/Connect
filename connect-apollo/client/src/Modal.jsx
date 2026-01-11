import React, { useRef, useState, useEffect } from 'react';

const Modal = ({ title, onClose, children }) => {
  const contentRef = useRef(null);
  
  // Состояние для анимации
  const [isClosing, setIsClosing] = useState(false);

  // Рефы для логики свайпа (чтобы не вызывать ререндер при каждом пикселе движения)
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const isDragging = useRef(false);

  // Закрытие по клику на фон
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handleClose = () => {
    setIsClosing(true);
    // Ждем анимацию закрытия (совпадает с CSS animation duration)
    setTimeout(onClose, 250); 
  };

  // --- ЛОГИКА СВАЙПА (ANYWHERE DRAG) ---

  const handleTouchStart = (e) => {
    // 1. Проверяем, не пытается ли юзер скроллить контент внутри
    let target = e.target;
    let isScrolledContent = false;

    // Идем от элемента, на который нажали, вверх до самого модального окна
    while (target && target !== contentRef.current) {
        // Если элемент имеет скролл и он прокручен хоть немного вниз...
        if (target.scrollHeight > target.clientHeight && target.scrollTop > 0) {
            isScrolledContent = true;
            break;
        }
        target = target.parentElement;
    }

    // Если мы внутри прокрученного контента - не активируем драг окна
    if (isScrolledContent) return;

    // Иначе - начинаем тянуть окно
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
    
    // Убираем плавность, чтобы окно "прилипло" к пальцу мгновенно
    if (contentRef.current) {
        contentRef.current.style.transition = 'none';
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current || !contentRef.current) return;
    
    const touchY = e.touches[0].clientY;
    const deltaY = touchY - touchStartY.current;

    // Тянем только вниз (deltaY > 0)
    if (deltaY > 0) {
      // Блокируем стандартный скролл страницы (pull-to-refresh и т.д.)
      if (e.cancelable) e.preventDefault(); 
      
      touchCurrentY.current = deltaY;
      
      // Добавляем немного сопротивления (резинка), если нужно, 
      // но для закрытия лучше 1:1, как в нативных аппах
      contentRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || !contentRef.current) return;
    isDragging.current = false;

    const movedDistance = touchCurrentY.current;
    
    // Возвращаем плавную анимацию (пружину)
    contentRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';

    // ПОРОГ ЗАКРЫТИЯ: Если протащили больше 120px
    if (movedDistance > 120) {
        // Уводим окно вниз за экран
        contentRef.current.style.transform = `translateY(100vh)`;
        setTimeout(onClose, 300); // Вызываем onClose после анимации улета
    } else {
        // ПРУЖИНА: Возвращаем на место (0px)
        contentRef.current.style.transform = '';
    }
    
    // Сброс
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
        {/* Визуальная ручка (для красоты, тянуть можно везде) */}
        <div className="modal-handle-bar"></div>

        <div className="modal-header">
          <h2 style={{ margin: 0, fontSize: '18px' }}>{title}</h2>
          <button className="close-btn" onClick={handleClose}>&times;</button>
        </div>
        {/* Оборачиваем children, чтобы стили скролла применялись корректно */}
        <div className="modal-scroll-container">
            {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;