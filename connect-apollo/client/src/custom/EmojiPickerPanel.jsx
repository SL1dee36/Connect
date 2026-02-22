import React, { useState, useMemo, useRef, useEffect } from 'react';

export const getNotoEmojiUrls = (hexCode) => {
    // У Google Fonts коды разделяются нижним подчеркиванием
    const cleanCode = hexCode.replace(/-/g, '_').toLowerCase();
    return {
        webp: `https://fonts.gstatic.com/s/e/notoemoji/latest/${cleanCode}/512.webp`,
        gif: `https://fonts.gstatic.com/s/e/notoemoji/latest/${cleanCode}/512.gif`
    };
};

const EMOJI_DATA = [
    { category: 'Смайлы', emojis: ['1f600', '1f603', '1f604', '1f601', '1f606', '1f605', '1f923', '1f602', '1f642', '1f643', '1f609', '1f60a', '1f607', '1f970', '1f60d', '1f929', '1f618', '1f617', '1f61a', '1f619', '1f62c', '1f60b', '1f61b', '1f61c', '1f92a', '1f61d', '1f911', '1f917', '1f92d', '1f92b', '1f914', '1f910', '1f928', '1f610', '1f611', '1f636', '1f60f', '1f612', '1f644', '1f925', '1f60c', '1f614', '1f62a', '1f924', '1f634', '1f637', '1f912', '1f915', '1f922', '1f92e', '1f927', '1f975', '1f976', '1f974', '1f635', '1f92f', '1f920', '1f973', '1f978', '1f60e', '1f913', '1f9d0', '1f615', '1f61f', '1f641', '1f627', '1f62e', '1f62f', '1f632', '1f633', '1f97a', '1f626', '1f628', '1f630', '1f625', '1f622', '1f62d', '1f631', '1f616', '1f623', '1f61e', '1f613', '1f629', '1f62b', '1f971', '1f624', '1f621', '1f620', '1f92c', '1f608', '1f47f', '1f480', '2620', '1f4a9', '1f921', '1f479', '1f47a', '1f47b', '1f47d', '1f47e', '1f916'] },
    { category: 'Жесты', emojis: ['1f44b', '1f91a', '1f590', '270b', '1f596', '1f44c', '1f90c', '1f90f', '270c', '1f91e', '1f91f', '1f918', '1f919', '1f448', '1f449', '1f446', '1f595', '1f447', '261d', '1f44d', '1f44e', '270a', '1f44a', '1f91b', '1f91c', '1f44f', '1f64c', '1f450', '1f932', '1f91d', '1f64f', '270d', '1f485', '1f933', '1f4aa'] },
    { category: 'Люди', emojis: ['1f476', '1f467', '1f9d2', '1f466', '1f469', '1f9d1', '1f468', '1f471', '1f475', '1f9d3', '1f474', '1f472', '1f473', '1f9d5', '1f46e', '1f477', '1f482', '1f575', '1f470', '1f935', '1f478', '1f934', '1f977', '1f9b8', '1f9b9', '1f936', '1f385', '1f9d9', '1f9da', '1f9db', '1f9dc', '1f9dd'] },
    { category: 'Животные', emojis: ['1f436', '1f431', '1f42d', '1f439', '1f430', '1f98a', '1f43b', '1f43c', '1f428', '1f42f', '1f981', '1f42e', '1f437', '1f43d', '1f438', '1f435', '1f648', '1f649', '1f64a', '1f412', '1f414', '1f427', '1f426', '1f424', '1f423', '1f425', '1f986', '1f985', '1f989', '1f987', '1f43a', '1f417', '1f434', '1f984', '1f41d', '1f41b', '1f40c', '1f41e', '1f41c', '1f577', '1f578', '1f982', '1f422', '1f40d', '1f98e', '1f996', '1f995', '1f419', '1f991', '1f990', '1f99e', '1f980', '1f421', '1f420', '1f41f', '1f42c', '1f433', '1f40b', '1f988', '1f40a', '1f405', '1f406', '1f993', '1f98d', '1f9a7', '1f415', '1f429', '1f408', '1f413', '1f983', '1f99a', '1f99c', '1f9a2', '1f9a9', '1f54a', '1f407', '1f99d', '1f9a8', '1f9a1', '1f9a6', '1f9a5', '1f401', '1f400', '1f43f'] },
    { category: 'Еда', emojis: ['1f34e', '1f350', '1f34a', '1f34b', '1f34c', '1f349', '1f347', '1f353', '1f348', '1f352', '1f351', '1f96d', '1f34d', '1f965', '1f95d', '1f345', '1f951', '1f346', '1f954', '1f955', '1f33d', '1f336', '1f952', '1f96c', '1f966', '1f9c4', '1f9c5', '1f344', '1f95c', '1f330', '1f35e', '1f950', '1f956', '1f953', '1f968', '1f96f', '1f95e', '1f9c7', '1f9c0', '1f356', '1f357', '1f969', '1f354', '1f35f', '1f355', '1f32d', '1f96a', '1f32e', '1f32f', '1f959', '1f95a', '1f373', '1f958', '1f372', '1f95f', '1f963', '1f957', '1f37f', '1f9c8', '1f9c2', '1f96b', '1f371', '1f358', '1f359', '1f35a', '1f35b', '1f35c', '1f35d', '1f360', '1f362', '1f363', '1f364', '1f365', '1f96e', '1f361', '1f960', '1f961', '1f366', '1f367', '1f368', '1f369', '1f36a', '1f382', '1f370', '1f9c1', '1f967', '1f36b', '1f36c', '1f36d', '1f36e', '1f36f', '1f37c', '1f95b', '2615', '1f375', '1f376', '1f37e', '1f377', '1f378', '1f379', '1f37a', '1f37b', '1f942', '1f943', '1f964', '1f9c3'] },
    { category: 'Спорт', emojis: ['26bd', '1f3c0', '1f3c8', '26be', '1f94e', '1f3be', '1f3d0', '1f3c9', '1f94f', '1f3b1', '1fa80', '1f3d3', '1f3f8', '1f3d2', '1f3d1', '1f94d', '1f945', '26f3', '1fa81', '1f3f9', '1f3a3', '1f93f', '1f94a', '1f94b', '1f3bd', '1f6f9', '1f6fc', '1f6f7', '26f8', '1f94c', '1f3bf', '26f7', '1f3c2', '1fa82', '1f3c6', '1f947', '1f948', '1f949', '1f3c5', '1f396', '1f3f5', '1f397', '1f3ab', '1f39f', '1f3aa', '1f3ad', '1fa70', '1f3a8', '1f3ac', '1f3a4', '1f3a7', '1f3bc', '1f3b9', '1f941', '1fa98', '1f3b7', '1f3ba', '1fa97', '1f3b8', '1fa95', '1f3bb', '1f3b2', '265f', '1f3af', '1f3b3', '1f3ae', '1f3b0', '1f9e9'] },
    { category: 'Символы', emojis: ['2764', '1f9e1', '1f49b', '1f49a', '1f499', '1f49c', '1f5a4', '1f90d', '1f90e', '1f494', '2763', '1f495', '1f49e', '1f493', '1f497', '1f496', '1f498', '1f49d', '1f49f', '262e', '271d', '262a', '1f549', '2638', '2721', '1f52f', '1f54e', '2626', '262f', '1f6d0', '26ce', '2648', '2649', '264a', '264b', '264c', '264d', '264e', '264f', '2650', '2651', '2652', '2653', '1f194', '269b', '1f251', '2622', '2623', '1f4f4', '1f4f3', '1f236', '1f21a', '1f238', '1f23a', '1f237', '2734', '1f19a', '1f4ae', '1f250', '3299', '3297', '1f234', '1f235', '1f239', '1f232', '1f170', '1f171', '1f18e', '1f191', '1f17e', '1f198', '274c', '2b55', '1f6d1', '26d4', '1f4db', '1f6ab', '1f4af', '1f4a2', '2668', '1f6b7', '1f6af', '1f6b3', '1f6b1', '1f51e', '1f4f5', '1f6ad', '2757', '2755', '2753', '2754', '203c', '2049', '1f505', '1f506', '1f3f4', '26a0', '1f6b8', '1f531', '269c', '1f530', '267b', '2705', '1f22f', '1f4b9', '2747', '2733', '274e', '1f310', '1f4a0', '24c2', '1f300', '1f4a4', '1f3e7', '1f6be', '267f', '1f17f', '1f6d7', '1f233', '1f202', '1f6c2', '1f6c3', '1f6c4', '1f6c5', '1f6b9', '1f6ba', '1f6bc', '1f6bb', '1f6ae', '1f3a6', '1f4f6', '1f201', '1f523', '2139', '1f524', '1f521', '1f520', '1f196', '1f197', '1f199', '1f192', '1f195', '1f193', '1f51f', '1f522', '23cf', '25b6', '23f8', '23ef', '23f9', '23fa', '23ed', '23ee', '23e9', '23ea', '23eb', '23ec', '25c0', '1f53c', '1f53d', '27a1', '2b05', '2197', '2198', '2199', '2196', '2195', '2194', '21aa', '21a9', '2934', '2935', '1f500', '1f501', '1f502', '1f504', '1f503', '1f3b5', '1f3b6', '2795', '2796', '2797', '2716', '267e', '1f4b2', '1f4b1', '2122', '1f51a', '1f519', '1f51b', '1f51d', '1f51c', '3030', '27b0', '27bf', '2714', '2611', '1f518', '1f534', '1f7e0', '1f7e1', '1f7e2', '1f535', '1f7e3', '1f7e4', '26ab', '26aa', '1f7e5', '1f7e7', '1f7e8', '1f7e9', '1f7e6', '1f7ea', '1f7eb', '2b1b', '2b1c', '25fc', '25fb', '25fe', '25fd', '25aa', '25ab', '1f536', '1f537', '1f538', '1f539', '1f53a', '1f53b'] }
];

const IconSearch = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5l-1.5 1.5l-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16 6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14C12 14 14 12 14 9.5S12 5 9.5 5Z"/></svg>
);

const IconClose = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/></svg>
);

// Одиночный эмодзи (статичный текст, 0 запросов к сети)
const EmojiItem = React.memo(({ emojiCode, onClick }) => {
    const nativeEmoji = useMemo(() => {
        return emojiCode.split('-').map(part => String.fromCodePoint(parseInt(part, 16))).join('');
    }, [emojiCode]);

    return (
        <button className="emoji-item" onClick={() => onClick(nativeEmoji)} title={nativeEmoji}>
            <span style={{ fontSize: '24px', lineHeight: 1 }}>{nativeEmoji}</span>
        </button>
    );
});

// Lazy-секция: рендерит содержимое только когда попадает в зону видимости экрана
const EmojiCategorySection = React.memo(({ category, onEmojiSelect, forceShow }) => {
    const [isVisible, setIsVisible] = useState(forceShow);
    const ref = useRef(null);

    useEffect(() => {
        if (forceShow) {
            setIsVisible(true);
            return;
        }
        
        const observer = new IntersectionObserver(([entry]) => {
            setIsVisible(entry.isIntersecting);
        }, { rootMargin: '300px' }); // Загружаем чуть заранее, до того как появится на экране

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [forceShow]);

    return (
        <div id={`category-${category.category}`} className="emoji-category-section" ref={ref} style={{ minHeight: isVisible ? 'auto' : '150px' }}>
            <div className="emoji-category-title">{category.category}</div>
            {isVisible && (
                <div className="emoji-grid">
                    {category.emojis.map((code) => (
                        <EmojiItem key={code} emojiCode={code} onClick={onEmojiSelect} />
                    ))}
                </div>
            )}
        </div>
    );
});

const EmojiPickerPanel = ({ isOpen, onClose, onEmojiSelect }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState(EMOJI_DATA[0].category);
    
    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return EMOJI_DATA;
        
        const query = searchQuery.toLowerCase();
        return EMOJI_DATA.map(category => {
            if (category.category.toLowerCase().includes(query)) return category;
            
            const matchedEmojis = category.emojis.filter(code => {
                const native = code.split('-').map(p => String.fromCodePoint(parseInt(p, 16))).join('');
                return native.includes(query) || code.includes(query);
            });
            return { ...category, emojis: matchedEmojis };
        }).filter(cat => cat.emojis.length > 0);
    }, [searchQuery]);

    const scrollToCategory = (categoryName) => {
        setActiveCategory(categoryName);
        const el = document.getElementById(`category-${categoryName}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (!isOpen) return null;

    return (
        <div className="emoji-picker-panel" onClick={(e) => e.stopPropagation()}>
            <div className="emoji-picker-header">
                <div className="emoji-search-container">
                    <IconSearch />
                    <input
                        type="text"
                        className="emoji-search-input"
                        placeholder="Поиск..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    {searchQuery && (
                        <button className="emoji-search-clear" onClick={() => setSearchQuery('')}><IconClose /></button>
                    )}
                </div>
                    {!searchQuery && (
                    <div className="emoji-categories-scroll">
                        {EMOJI_DATA.map((cat) => (
                            <button
                                key={cat.category}
                                className={`emoji-category-tab ${activeCategory === cat.category ? 'active' : ''}`}
                                onClick={() => scrollToCategory(cat.category)}
                            >
                                {cat.category}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="emoji-grid-container">
                {filteredData.length === 0 ? (
                    <div className="emoji-no-results">Ничего не найдено</div>
                ) : (
                    filteredData.map((category) => (
                        <EmojiCategorySection 
                            key={category.category} 
                            category={category} 
                            onEmojiSelect={onEmojiSelect} 
                            forceShow={searchQuery.length > 0} 
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default EmojiPickerPanel;