import React from 'react';
import { useApp } from '../../context/AppContext';
import Modal from '../common/Modal';
import { IconMessage, IconCall, IconLightning, IconMore, IconShare } from '../common/Icons';

const UserProfileModal = () => {
  const {
    setActiveModal, viewProfileData, username, room, switchChat, startCall,
    setFriendOverrideForm, copyProfileLink, isMediaExpanded, setIsMediaExpanded,
    setImageModalSrc, removeFriend, blockUser
  } = useApp();

  return (
    <Modal title="Info" onClose={() => setActiveModal(null)}>
      <div className="profile-hero">
        <div className="profile-avatar-background" style={{
          backgroundImage: viewProfileData.avatar_url ? `url(${viewProfileData.avatar_url})` : 'none',
          backgroundColor: '#333'
        }}>
          <div className="ProfName">
            <div className="profile-name">{viewProfileData.display_name}</div>
            <div className="profile-status">@{viewProfileData.username}</div>
          </div>
          <div className="btns">
            <button className="change-avatar-btn" title="Написать сообщение" onClick={() => {
              const roomId = [username, viewProfileData.username].sort().join("_");
              switchChat(roomId);
              setActiveModal(null);
            }}>
              <IconMessage />
            </button>
            <button className="change-avatar-btn" title="Позвонить" onClick={() => {
              const roomId = [username, viewProfileData.username].sort().join("_");
              if (room !== roomId) switchChat(roomId);
              setTimeout(() => startCall(true), 100);
            }}>
              <IconCall />
            </button>
            <button className="change-avatar-btn" title="Boost"><IconLightning /></button>
            <button className="change-avatar-btn" title="Еще" onClick={() => {
              setFriendOverrideForm({
                local_display_name: viewProfileData.local_overrides?.local_display_name || viewProfileData.original_display_name,
                local_avatar_file: null,
                preview_avatar: viewProfileData.local_overrides?.local_avatar_url || viewProfileData.original_avatar_url
              });
              setActiveModal('editFriendProfile');
            }}>
              <IconMore />
            </button>
          </div>
        </div>
      </div>

      <div className="settings-list">
        {viewProfileData.badges && viewProfileData.badges.length > 0 && (
          <div className="settings-item" style={{justifyContent:'center'}}>
            {viewProfileData.badges.map((b,i) => (
              <div key={i} title={b.name} style={{width: 24, height: 24}} dangerouslySetInnerHTML={{__html: b.svg_content}} />
            ))}
          </div>
        )}
        {viewProfileData.bio && (
          <div className="settings-item">
            <div className="settings-label">
              <div style={{ fontSize: "16px" }}>{viewProfileData.bio}</div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>Bio</div>
            </div>
          </div>
        )}
        {viewProfileData.phone && (
          <div className="settings-item">
            <div className="settings-label">
              <div style={{ fontSize: "16px" }}>{viewProfileData.phone}</div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>Mobile</div>
            </div>
          </div>
        )}
        <div className="settings-item" onClick={() => copyProfileLink(viewProfileData.username)}>
          <div className="settings-icon"><IconShare/></div>
          <div className="settings-label">Поделиться профилем</div>
        </div>
      </div>

      {viewProfileData.media && viewProfileData.media.length > 0 && (
        <div className="profile-media-section">
          <div className="profile-media-header"><h4>Медиа ({viewProfileData.media.length})</h4></div>
          <div className="media-grid">
            {(isMediaExpanded ? viewProfileData.media : viewProfileData.media.slice(-6).reverse()).map((item, idx) => (
              <div key={idx} className="media-grid-item" onClick={() => setImageModalSrc(item.url)}>
                {item.type === 'video' ? <video src={item.url} muted /> : <img src={item.url} alt="media" />}
              </div>
            ))}
          </div>
          {viewProfileData.media.length > 6 && (
            <button className="media-toggle-btn" onClick={() => setIsMediaExpanded(!isMediaExpanded)}>
              {isMediaExpanded ? "Свернуть" : `Показать все (${viewProfileData.media.length})`}
            </button>
          )}
        </div>
      )}

      <div style={{ marginTop: "10px", background: "#212121", padding: "0 15px" }}>
        {viewProfileData.isFriend && (
          <div className="settings-item" onClick={() => removeFriend(viewProfileData.username)} style={{ color: "#ff5959" }}>
            <span className="settings-icon" style={{ color: "#ff5959" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24"><path fill="#ffffff" d="m8.4 17l3.6-3.6l3.6 3.6l1.4-1.4l-3.6-3.6L17 8.4L15.6 7L12 10.6L8.4 7L7 8.4l3.6 3.6L7 15.6L8.4 17ZM5 21q-.825 0-1.413-.588T3 19V5q0-.825.588-1.413T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.588 1.413T19 21H5Zm0-2h14V5H5v14ZM5 5v14V5Z"/></svg>
            </span>
            Delete Contact
          </div>
        )}
        <div className="settings-item" onClick={() => blockUser(viewProfileData.username)} style={{ color: "#ff5959", border: "none" }}>
          <span className="settings-icon" style={{ color: "#ff5959" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24"><path fill="#ffffff" d="M12 22q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35-3.175 2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Zm0-2q3.35 0 5.675-2.325T20 12q0-1.35-.438-2.6T18.3 7.1L7.1 18.3q1.05.825 2.3 1.263T12 20Zm-6.3-3.1L16.9 5.7q-1.05-.825-2.3-1.262T12 4Q8.65 4 6.325 6.325T4 12q0 1.35.437 2.6T5.7 16.9Z"/></svg>
          </span>
          Block User
        </div>
      </div>
    </Modal>
  );
};

export default UserProfileModal;