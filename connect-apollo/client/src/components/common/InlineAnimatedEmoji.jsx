import React, { useState, useEffect, useRef } from 'react';
import { getNotoEmojiUrls } from '../common/EmojiPickerPanel';

const InlineAnimatedEmoji = React.memo(({ nativeEmoji, autoAnimate = false, sizeClass = 'inline' }) => {
  const [isAnimated, setIsAnimated] = useState(autoAnimate);
  const [failed, setFailed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
      if (autoAnimate) {
        setIsAnimated(entry.isIntersecting);
      } else if (!entry.isIntersecting && isAnimated) {
        setIsAnimated(false);
      }
    }, { rootMargin: '100px' });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [isAnimated, autoAnimate]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (!failed && !autoAnimate) setIsAnimated(!isAnimated);
  };

  const hexCode = Array.from(nativeEmoji).map(c => c.codePointAt(0).toString(16)).join('_');
  const { webp, gif } = getNotoEmojiUrls(hexCode);
  const showStatic = (!isAnimated && !autoAnimate) || failed || !isVisible;

  return (
    <span
      ref={ref}
      className={`inline-emoji-wrapper ${sizeClass}`}
      onClick={handleClick}
      title={failed || autoAnimate ? "" : "Нажмите для анимации"}
    >
      {showStatic ? (
        <span className="inline-emoji-static">{nativeEmoji}</span>
      ) : (
        <picture className="inline-animated-emoji">
          <source srcSet={webp} type="image/webp" />
          <img src={gif} alt={nativeEmoji} onError={() => { setFailed(true); setIsAnimated(false); }} />
        </picture>
      )}
    </span>
  );
});

export default InlineAnimatedEmoji;