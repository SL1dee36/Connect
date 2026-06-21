import React from 'react';
import Modal from '../common/Modal';
import { IconMessage, IconCall, IconMore, IconShare } from '../common/Icons';
import { useUIStore } from '../../stores/uiStore';
import { useProfileStore } from '../../stores/profileStore';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { useCallLogic } from '../../hooks/useCallLogic';

const UserProfileModal = () => {
  const setActiveModal = useUIStore(s => s.setActiveModal);
  const setImageModalSrc = useUIStore(s => s.setImageModalSrc);
  const isMobile = useUIStore(s => s.isMobile);
  const setSwipeX = useUIStore(s => s.setSwipeX);
  const setShowMobileChat = useUIStore(s => s.setShowMobileChat);

  const viewProfileData = useProfileStore(s => s.viewProfileData);
  const setFriendOverrideForm = useProfileStore(s => s.setFriendOverrideForm);
  const isMediaExpanded = useProfileStore(s => s.isMediaExpanded);
  const setIsMediaExpanded = useProfileStore(s => s.setIsMediaExpanded);

  const username = useAuthStore(s => s.username);
  const socket = useAuthStore(s => s.socket);

  const room = useChatStore(s => s.room);
  const setRoom = useChatStore(s => s.setRoom);

  const { startCall } = useCallLogic();

  const data = viewProfileData || {};
  const displayName = data.display_name || data.username || '';
  const roomId = [username, data.username].sort().join('_');

  const switchChat = (targetName) => {
    if (targetName !== room) setRoom(targetName);
    if (isMobile) { setSwipeX(0); setShowMobileChat(true); }
  };

  const openChat = () => { switchChat(roomId); setActiveModal(null); };
  const callUser = () => { if (room !== roomId) switchChat(roomId); setTimeout(() => startCall(true), 100); };

  const copyProfileLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}?user=${data.username}`);
    alert("Ссылка на профиль скопирована!");
  };

  const openMore = () => {
    setFriendOverrideForm({
      local_display_name: data.local_overrides?.local_display_name || data.original_display_name,
      local_avatar_file: null,
      preview_avatar: data.local_overrides?.local_avatar_url || data.original_avatar_url,
    });
    setActiveModal('editFriendProfile');
  };

  const removeFriend = () => {
    if (window.confirm(`Удалить ${data.username} из контактов?`)) {
      socket.emit("remove_friend", data.username);
      setActiveModal(null);
    }
  };

  const blockUser = () => {
    if (window.confirm(`Заблокировать ${data.username}?`)) {
      socket.emit("block_user", data.username);
      setActiveModal(null);
    }
  };

  const presence = data.is_online
    ? <div className="tgp-presence online">в сети</div>
    : null;

  return (
    <Modal title="Профиль" onClose={() => setActiveModal(null)}>
      <div className="tgp">
        {/* Шапка */}
        <div className="tgp-head">
          <div
            className="tgp-avatar"
            style={data.avatar_url ? { backgroundImage: `url(${data.avatar_url})` } : {}}
            onClick={() => data.avatar_url && setImageModalSrc(data.avatar_url)}
          >
            {!data.avatar_url && displayName[0]?.toUpperCase()}
          </div>
          <div className="tgp-name">{displayName}</div>
          <div className="tgp-username">@{data.username}</div>
          {presence}
          {data.badges && data.badges.length > 0 && (
            <div className="tgp-badges">
              {data.badges.map((b, i) => (
                <div key={i} title={b.name} dangerouslySetInnerHTML={{ __html: b.svg_content }} />
              ))}
            </div>
          )}
        </div>

        {/* Действия */}
        <div className="tgp-actions">
          <button className="tgp-action" onClick={openChat}>
            <IconMessage /><span>Сообщение</span>
          </button>
          <button className="tgp-action" onClick={callUser}>
            <IconCall /><span>Звонок</span>
          </button>
          <button className="tgp-action" onClick={openMore}>
            <IconMore /><span>Ещё</span>
          </button>
        </div>

        {/* Инфо */}
        <div className="tgp-section">
          {data.bio && (
            <div className="tgp-row">
              <div className="tgp-row-main">
                <div className="tgp-row-value">{data.bio}</div>
                <div className="tgp-row-label">О себе</div>
              </div>
            </div>
          )}
          {data.phone && (
            <div className="tgp-row">
              <div className="tgp-row-main">
                <div className="tgp-row-value">{data.phone}</div>
                <div className="tgp-row-label">Телефон</div>
              </div>
            </div>
          )}
          <div className="tgp-row tgp-row--btn" onClick={copyProfileLink}>
            <span className="tgp-row-icon"><IconShare /></span>
            <div className="tgp-row-main"><div className="tgp-row-value">Поделиться профилем</div></div>
          </div>
        </div>

        {/* Медиа */}
        {data.media && data.media.length > 0 && (
          <div className="tgp-media">
            <h4>Медиа ({data.media.length})</h4>
            <div className="media-grid">
              {(isMediaExpanded ? data.media : data.media.slice(-6).reverse()).map((item, idx) => (
                <div key={idx} className="media-grid-item" onClick={() => setImageModalSrc(item.url)}>
                  {item.type === 'video' ? <video src={item.url} muted /> : <img src={item.url} alt="media" />}
                </div>
              ))}
            </div>
            {data.media.length > 6 && (
              <button className="media-toggle-btn" onClick={() => setIsMediaExpanded(!isMediaExpanded)}>
                {isMediaExpanded ? "Свернуть" : `Показать все (${data.media.length})`}
              </button>
            )}
          </div>
        )}

        {/* Опасная зона */}
        <div className="tgp-danger">
          {data.isFriend && (
            <button onClick={removeFriend}>
              <svg viewBox="0 0 24 24"><path d="M15 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM9 14c-3.31 0-7 1.67-7 5v1h14v-1c0-3.33-3.69-5-7-5zm9-2h6v2h-6v-2z"/></svg>
              Удалить из контактов
            </button>
          )}
          <button onClick={blockUser}>
            <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.85 0 3.55.63 4.9 1.69L5.69 16.9A7.95 7.95 0 0 1 4 12a8 8 0 0 1 8-8zm0 16a7.95 7.95 0 0 1-4.9-1.69L18.31 7.1A7.95 7.95 0 0 1 20 12a8 8 0 0 1-8 8z"/></svg>
            Заблокировать
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default UserProfileModal;
