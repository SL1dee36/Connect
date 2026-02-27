import React from 'react';
import { useApp } from '../../context/AppContext';
import Modal from '../common/Modal';

const GroupInfoModal = () => {
  const {
    setActiveModal,
    roomSettings,
    room,
    groupMembers: groupMembersList,
    myRole,
    globalRole,
    username,
    socket,
    leaveGroup
  } = useApp();

  return (
    <Modal title="Group Info" onClose={() => setActiveModal(null)}>
      <div className="profile-hero">
        <div className="profile-avatar-large" style={{
          backgroundImage: roomSettings.avatar_url ? `url(${roomSettings.avatar_url})` : 'none',
          backgroundColor: '#333'
        }}>
          {!roomSettings.avatar_url && room.substring(0, 2)}
        </div>
        <div className="profile-name">{room}</div>
        {roomSettings.username && (
          <div className="profile-status" style={{ color: '#2b95ff', marginTop: 4 }}>
            @{roomSettings.username}
          </div>
        )}
        <div className="profile-status">{groupMembersList.length} members</div>
      </div>

      {(myRole === 'owner' || globalRole === 'mod') && (
        <div style={{padding: '0 20px', marginBottom: 20}}>
          <div className="settings-item">
            <label>Приватный чат (только по приглашению)</label>
            <div className={`toggle-switch ${roomSettings.is_private ? 'on' : ''}`} onClick={() => socket.emit("update_group_settings", { room, is_private: !roomSettings.is_private, slow_mode: roomSettings.slow_mode, avatar_url: roomSettings.avatar_url, description: roomSettings.description })}>
              <div className="knob"></div>
            </div>
          </div>
          <div className="settings-item" style={{flexDirection: 'column', alignItems: 'flex-start'}}>
            <label style={{marginBottom: 5}}>Slow Mode (секунды): {roomSettings.slow_mode}</label>
            <input type="range" min="0" max="60" value={roomSettings.slow_mode} onChange={(e) => socket.emit("update_group_settings", { room, is_private: roomSettings.is_private, slow_mode: parseInt(e.target.value), avatar_url: roomSettings.avatar_url, description: roomSettings.description })} style={{width: '100%'}} />
          </div>
          <button className="btn-primary" onClick={() => {
            const url = prompt("Введите URL аватарки чата:");
            if(url !== null) socket.emit("update_group_settings", { room, is_private: roomSettings.is_private, slow_mode: roomSettings.slow_mode, avatar_url: url, description: roomSettings.description });
          }}>Сменить аватарку чата</button>
        </div>
      )}

      <div className="settings-list" style={{ padding: "0 15px"}}>
        {roomSettings.description && (
          <div className="settings-item" style={{ alignItems: 'flex-start' }}>
            <div className="settings-label">
              <div style={{ fontSize: "15px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {roomSettings.description}
              </div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>Описание</div>
            </div>
          </div>
        )}

        <div style={{ color: "#8774e1", padding: "10px 0", fontSize: "14px", fontWeight: "bold" }}>Members</div>
        {groupMembersList.map((m, i) => (
          <div key={i} className="settings-item" onClick={(e) => {
            e.stopPropagation();
            if(m.username !== username) socket.emit("get_user_profile", m.username);
          }}>
            <div className="friend-avatar" style={{
              fontSize: 12, marginRight: 15,
              backgroundImage: m.avatar_url ? `url(${m.avatar_url})` : 'none',
              backgroundSize: 'cover', backgroundPosition: 'center',
              color: m.avatar_url ? 'transparent' : 'white',
              backgroundColor: '#333'
            }}>
              {m.username[0].toUpperCase()}
            </div>
            <div className="settings-label" style={{flex: 1}}>
              <div style={{ fontSize: "16px", display: 'flex', alignItems: 'center', gap: 5 }}>
                {m.display_name || m.username}
              </div>
              <div style={{ fontSize: "12px", color: "#888" }}>
                {m.role === "owner" ? "owner" : m.role}
                {m.username !== username && <span style={{marginLeft: 5, color: '#1a7bd6'}}>• Профиль</span>}
              </div>
            </div>
            {(myRole === "owner" || globalRole === 'mod') && m.username !== username && (
              <div style={{display:'flex', gap: 5}}>
                {m.role !== 'owner' && (
                  <>
                    {m.role !== 'editor' && <button className="add-btn-small" onClick={(e) => {e.stopPropagation(); socket.emit("assign_chat_role", { room, targetUsername: m.username, newRole: 'editor' })}}>↑</button>}
                    {m.role === 'editor' && <button className="add-btn-small" onClick={(e) => {e.stopPropagation(); socket.emit("assign_chat_role", { room, targetUsername: m.username, newRole: 'member' })}}>↓</button>}
                    <button className="add-btn-small" style={{background:'#ff4d4d'}} onClick={(e) => {e.stopPropagation(); socket.emit("assign_chat_role", { room, targetUsername: m.username, newRole: 'kick' })}}>✕</button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: "20px" }}>
        {(myRole === "owner" || myRole === "editor" || globalRole === "mod") && (
          <div className="action-card" onClick={() => setActiveModal("addToGroup")} style={{ marginBottom: 10, height: "auto", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M18 2h-6v2h-2v6h2V4h6V2zm0 8h-6v2h6v-2zm0-6h2v6h-2V4zM7 16h2v-2h12v2H9v4h12v-4h2v6H7v-6zM3 8h2v2h2v2H5v2H3v-2H1v-2h2V8z"/></svg>
            Добавить участника
          </div>
        )}
        <button className="btn-danger" style={{ textAlign: "center" }} onClick={leaveGroup}>{myRole === "owner" ? "Delete Group" : "Leave Group"}</button>
      </div>
    </Modal>
  );
};

export default GroupInfoModal;