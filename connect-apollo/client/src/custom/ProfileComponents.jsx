import React, { useState } from 'react';
import { getAuthMediaUrl } from '../Chat';

// 1. ПЕРЕКЛЮЧАТЕЛЬ (TOGGLE SWITCH)
export const ToggleSwitch = ({ checked, onChange }) => (
    <div className={`toggle-switch ${checked ? 'on' : ''}`} onClick={onChange}>
        <div className="knob"></div>
    </div>
);

// 2. ШАПКА ПРОФИЛЯ (Использует родные классы .profile-hero, .profile-avatar-background, .ProfName, .btns)
export const ProfileHero = ({ 
    avatarUrl, 
    title, 
    subtitle, 
    badges = [], 
    actions = [], 
    onAvatarClick 
}) => {
    const avatarStyle = avatarUrl 
        ? { backgroundImage: `url(${getAuthMediaUrl(avatarUrl)})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#333', color: 'transparent' } 
        : { backgroundColor: '#333' };

    return (
        <div className="profile-hero">
            <div className="profile-avatar-background" style={avatarStyle} onClick={onAvatarClick}>
                {!avatarUrl && title?.[0]?.toUpperCase()}

                <div className="ProfName">
                    <div className="profile-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{title}</span>
                        {badges.map((b, i) => (
                            <span key={i} title={b.name} style={{ width: 16, height: 16, display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: b.svg_content }} />
                        ))}
                    </div>
                    {subtitle && <div className="profile-status">{subtitle}</div>}
                </div>

                {actions.length > 0 && (
                    <div className="btns">
                        {actions.map((act, idx) => (
                            <button 
                                key={idx} 
                                className="change-avatar-btn" 
                                onClick={act.onClick} 
                                title={act.title}
                                style={act.danger ? { color: '#ff4d4d' } : {}}
                            >
                                {act.icon}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// 3. СТРОЧКА НАСТРОЕК (Использует родные классы .settings-item, .settings-icon, .settings-label)
export const SettingsItem = ({ 
    icon, 
    label, 
    sublabel, 
    action, 
    onClick, 
    danger = false,
    children 
}) => {
    return (
        <div 
            className="settings-item" 
            style={{ 
                cursor: onClick ? 'pointer' : 'default',
                color: danger ? '#ff5959' : 'inherit'
            }} 
            onClick={onClick}
        >
            {icon && <div className="settings-icon" style={danger ? { color: '#ff5959' } : {}}>{icon}</div>}
            
            <div className="settings-label" style={{ flex: 1 }}>
                {children ? children : (
                    <>
                        <div style={{ fontSize: "16px", color: danger ? "#ff5959" : "white" }}>{label}</div>
                        {sublabel && <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>{sublabel}</div>}
                    </>
                )}
            </div>

            {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
        </div>
    );
};

// 4. ГАЛЕРЕЯ МЕДИФАЙЛОВ (Использует родные классы .profile-media-section, .media-grid, .media-grid-item)
export const MediaGallery = ({ 
    media = [], 
    onMediaClick, 
    onAddMedia, 
    onDeleteMedia,
    isEditable = false 
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!isEditable && (!media || media.length === 0)) return null;

    const displayedMedia = isExpanded ? media : (media || []).slice(-6).reverse();

    return (
        <div className="profile-media-section">
            <div className="profile-media-header">
                <h4>Медиа ({media ? media.length : 0})</h4>
            </div>

            <div className="media-grid">
                {isEditable && onAddMedia && (
                    <div className="media-grid-add-btn" onClick={onAddMedia}>+</div>
                )}

                {displayedMedia.map((item, idx) => (
                    <div key={item.id || idx} className="media-grid-item" onClick={() => onMediaClick?.(item.url)}>
                        {item.type === 'video' ? (
                            <video src={getAuthMediaUrl(item.url)} muted />
                        ) : (
                            <img src={getAuthMediaUrl(item.url)} alt="media" />
                        )}
                        {isEditable && onDeleteMedia && (
                            <button className="delete-media-btn" onClick={(e) => { e.stopPropagation(); onDeleteMedia(item.id); }}>
                                &times;
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {media && media.length > 6 && (
                <button className="media-toggle-btn" onClick={() => setIsExpanded(!isExpanded)}>
                    {isExpanded ? "Свернуть" : `Показать все (${media.length})`}
                </button>
            )}
        </div>
    );
};