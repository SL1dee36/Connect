import React from 'react';
import { useApp } from '../../context/AppContext';
import Modal from './Modal';
import Cropper from 'react-easy-crop';
import AdminPanel from '../admin/AdminPanel';
import {
  IconBell,
  IconCamera,
  IconMic,
  IconFolder,
  IconShare,
  IconBug,
  IconShield,
  IconMessage,
  IconCall,
  IconLightning,
  IconMore
} from './Icons';

const ModalsContainer = () => {
  const {
    activeModal,
    setActiveModal,
    notifications,
    setNotifications,
    setHasUnreadNotifs,
    messageToDelete,
    setMessageToDelete,
    confirmDelete,
    myRole,
    globalRole,
    messageList,
    newFolderName,
    setNewFolderName,
    createNewFolder,
    folderToEdit,
    removeFolder,
    folders,
    handleAddToFolder,
    newChatName,
    setNewChatName,
    socket,
    username,
    searchQuery,
    setSearchQuery,
    searchGroupResults,
    myChats,
    searchResults,
    friends,
    groupMembers,
    bugDescription,
    setBugDescription,
    bugFiles,
    setBugFiles,
    adminBugList,
    resolveBug,
    profileForm,
    setProfileForm,
    myProfile,
    avatarHistory,
    profileMediaInputRef,
    isMediaExpanded,
    setIsMediaExpanded,
    handleLogout,
    saveProfile,
    requestNotificationPermission,
    requestMediaPermissions,
    requestFilePermission,
    copyProfileLink,
    handleProfileMediaSelect,
    avatarEditor,
    setAvatarEditor,
    handleSaveAvatar,
    onFileChange,
    avatarInputRef,
    roomSettings,
    setRoomSettings,
    room,
    groupMembers: groupMembersList,
    leaveGroup,
    viewProfileData,
    friendOverrideForm,
    setFriendOverrideForm,
    friendAvatarInputRef,
    handleSaveFriendOverride,
    switchChat,
    removeFriend,
    blockUser,
    setImageModalSrc,
    startCall,
    fetchBugReports
  } = useApp();

  return (
    <>
      {/* === Notifications Modal === */}
      {activeModal === "notifications" && (
        <Modal title="Уведомления" onClose={() => { setActiveModal(null); setHasUnreadNotifs(false); }}>
          <div className="settings-list" style={{padding: 0 , marginTop: '100px'}}>
            {notifications.length === 0 && (<div style={{textAlign: 'center', padding: 20, color: '#888'}}>Нет уведомлений</div>)}
            {notifications.map((notif) => (
              <div key={notif.id} className="settings-item" style={{ backgroundColor: notif.is_read ? 'transparent' : 'rgba(43, 149, 255, 0.1)', borderBottom: '1px solid #333', flexDirection: 'column', alignItems: 'flex-start', gap: 5 }}>
                <div style={{display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span style={{fontWeight: 'bold', fontSize: 14}}>{notif.type === 'friend_request' ? "Заявка в друзья" : (notif.type === 'mention' ? "Упоминание" : "Уведомление")}</span>
                  <button onClick={() => { socket.emit("delete_notification", {id: notif.id}); setNotifications(prev => prev.filter(n => n.id !== notif.id)); }} style={{background: 'none', border: 'none', color: '#666', cursor: 'pointer'}}>&times;</button>
                </div>
                <div style={{fontSize: 14, color: '#ddd'}}>
                  {notif.type === 'friend_request' ? `Пользователь ${notif.content} хочет добавить вас в друзья.` : notif.content}
                </div>
                {notif.type === 'mention' && (
                  <button className="btn-accept" style={{marginTop: 5, padding: '5px 10px', fontSize: 12}} onClick={() => switchChat(notif.data)}>Перейти к чату</button>
                )}
                {notif.type === 'friend_request' && (
                  <div className="notification-actions" style={{marginTop: 5, display: 'flex', gap: 10}}>
                    <button className="btn-accept" onClick={() => { socket.emit("accept_friend_request", { notifId: notif.id, fromUsername: notif.content }); setNotifications(prev => prev.filter(n => n.id !== notif.id)); }}>Принять</button>
                    <button className="btn-decline" onClick={() => { socket.emit("decline_friend_request", { notifId: notif.id }); setNotifications(prev => prev.filter(n => n.id !== notif.id)); }}>Отклонить</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* === Delete Confirm Modal === */}
      {activeModal === 'deleteConfirm' && (
        <Modal title="Удалить сообщение" onClose={() => { setActiveModal(null); setMessageToDelete(null); }}>
          <div className="delete-options">
            <p style={{textAlign: 'center', color: '#ccc', marginBottom: 10}}>Вы хотите удалить это сообщение?</p>
            {(myRole === 'owner' || globalRole === 'mod' || messageList.find(m => m.id === messageToDelete)?.author === username) && (
              <button className="btn-delete-everyone" onClick={() => confirmDelete(true)}>Удалить у всех</button>
            )}
            <button className="btn-delete-me" onClick={() => confirmDelete(false)}>Удалить у меня</button>
          </div>
        </Modal>
      )}

      {/* === Create Folder Modal === */}
      {activeModal === "createFolder" && (
        <Modal title="Новая папка" onClose={() => setActiveModal(null)}>
          <input
            className="modal-input"
            placeholder="Название папки..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <button className="btn-primary" onClick={createNewFolder}>Создать</button>
        </Modal>
      )}

      {/* === Edit Folder Modal === */}
      {activeModal === "editFolder" && folderToEdit && (
        <Modal title={`Папка: ${folderToEdit.name}`} onClose={() => setActiveModal(null)}>
          <button className="btn-danger" onClick={() => removeFolder(folderToEdit.id)}>Удалить папку</button>
        </Modal>
      )}

      {/* === Add to Folder Modal === */}
      {activeModal === "addToFolder" && (
        <Modal title="Добавить в папку" onClose={() => setActiveModal(null)}>
          <div className="settings-list">
            {folders.map(f => (
              <div key={f.id} className="settings-item" onClick={() => handleAddToFolder(f.id)}>
                <div className="settings-label">{f.name}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* === Action Menu Modal === */}
      {activeModal === "actionMenu" && (
        <Modal title="NEW MESSAGE" onClose={() => setActiveModal(null)}>
          <div className="action-grid">
            <div className="action-card" onClick={() => setActiveModal("createGroup")}>
              <span style={{ fontSize: 12}}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path fill="#ffffff" d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4z"/></svg></span>
              <div><div style={{ fontWeight: "bold" }}>Новая группа</div></div>
            </div>
            <div className="action-card" onClick={() => setActiveModal("searchGroup")}>
              <span style={{ fontSize: 24 }}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path fill="#ffffff" d="M6 2h8v2H6V2zM4 6V4h2v2H4zm0 8H2V6h2v8zm2 2H4v-2h2v2zm8 0v2H6v-2h8zm2-2h-2v2h2v2h2v2h2v2h2v-2h-2v-2h-2v-2h-2v-2zm0-8h2v8h-2V6zm0 0V4h-2v2h2z"/></svg></span>
              <div><div style={{ fontWeight: "bold" }}>Найти группу</div></div>
            </div>
            <div className="action-card" onClick={() => setActiveModal("addFriend")}>
              <span style={{ fontSize: 24 }}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path fill="#ffffff" d="M18 2h-6v2h-2v6h2V4h6V2zm0 8h-6v2h6v-2zm0-6h2v6h-2V4zM7 16h2v-2h12v2H9v4h12v-4h2v6H7v-6zM3 8h2v2h2v2H5v2H3v-2H1v-2h2V8z"/></svg></span>
              <div><div style={{ fontWeight: "bold" }}>Поиск людей</div></div>
            </div>
            <div className="action-card" onClick={() => setActiveModal("reportBug")}>
              <span style={{ fontSize: 24 }}><IconBug/></span>
              <div><div style={{ fontWeight: "bold" }}>Report Bug</div></div>
            </div>
            {(username === 'slide36' || myRole === 'admin' || globalRole === 'mod') && (
              <div className="action-card" onClick={() => { setActiveModal("adminBugs"); fetchBugReports(); }}>
                <span style={{ fontSize: 24 }}><IconShield/></span>
                <div><div style={{ fontWeight: "bold" }}>Admin Bugs</div></div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* === Create Group Modal === */}
      {activeModal === "createGroup" && (
        <Modal title="Создать группу" onClose={() => setActiveModal(null)}>
          <input className="modal-input" placeholder="Название..." value={newChatName} onChange={(e) => setNewChatName(e.target.value)} />
          <button className="btn-primary" onClick={() => { if (newChatName) socket.emit("create_group", { room: newChatName, username }); }}>
            Создать
          </button>
        </Modal>
      )}

      {/* === Add to Group Modal === */}
      {activeModal === "addToGroup" && (
        <Modal title="Добавить участников" onClose={() => { setActiveModal(null); setSearchQuery(""); }}>
          <div className="addToGroupbar" style={{ padding: "0 20px" }}>
            <input
              className="modal-input"
              placeholder="Поиск по друзьям..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{marginBottom: 15}}
            />
          </div>
          <div className="settings-list">
            {friends
              .filter(f => {
                const isAlreadyMember = groupMembers.some(m => m.username === f.username);
                const matchesSearch = f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (f.display_name && f.display_name.toLowerCase().includes(searchQuery.toLowerCase()));
                return !isAlreadyMember && matchesSearch;
              })
              .map((friend) => (
                <div key={friend.username} className="settings-item">
                  <div className="friend-avatar" style={{
                    backgroundImage: friend.avatar_url ? `url(${friend.avatar_url})` : 'none',
                    backgroundColor: '#333'
                  }}>
                    {!friend.avatar_url && friend.username[0].toUpperCase()}
                  </div>
                  <div className="settings-label">
                    <div style={{ fontSize: "15px", color: "white" }}>
                      {friend.display_name || friend.username}
                    </div>
                    <div style={{ fontSize: "12px", color: "#888" }}>
                      @{friend.username}
                    </div>
                  </div>
                  <button
                    className="add-btn-small"
                    onClick={() => {
                      socket.emit("add_group_member", { room, username: friend.username });
                      alert(`${friend.username} добавлен!`);
                    }}
                  >
                    +
                  </button>
                </div>
              ))
            }
            {friends.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
                Ваш список друзей пуст
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* === Search Group Modal === */}
      {activeModal === "searchGroup" && (
        <Modal title="Поиск групп" onClose={() => { setActiveModal(null); setSearchQuery(""); }}>
          <input className="modal-input" placeholder="Название..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          {searchGroupResults.length === 0 && searchQuery && (
            <div style={{ textAlign: "center", color: "#666", padding: 10 }}>Ничего не найдено</div>
          )}
          <div className="search-results">
            {searchGroupResults.map((g, i) => (
              <div key={i} className="search-item">
                <span>{g.room}</span>
                {!myChats.includes(g.room) && (
                  <button className="add-btn-small" onClick={() => socket.emit("join_existing_group", { room: g.room, username })}>➜</button>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* === Add Friend Modal === */}
      {activeModal === "addFriend" && (
        <Modal title="Поиск людей" onClose={() => { setActiveModal(null); setSearchQuery(""); }}>
          <input className="modal-input" placeholder="@nametag или имя..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          {searchResults.length === 0 && searchQuery && (
            <div style={{ textAlign: "center", color: "#666", padding: 10 }}>Ничего не найдено</div>
          )}
          <div className="search-results">
            {searchResults.map((u, i) => (
              <div key={i} className="search-item">
                <div className="member-info">
                  <div className="friend-avatar" style={{ fontSize: 12, backgroundImage: `url(${u.avatar_url})` }}>
                    {!u.avatar_url && u.username[0]}
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-evenly' }}>
                    <span style={{lineHeight: 1}}>{u.display_name}</span>
                    <span style={{fontSize: 11, color: '#888'}}>@{u.username}</span>
                  </div>
                </div>
                {!friends.includes(u.username) && (
                  <button className="add-btn-small" onClick={() => { socket.emit("send_friend_request_by_name", { toUsername: u.username }); alert("Заявка отправлена!"); }}>+</button>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* === Report Bug Modal === */}
      {activeModal === "reportBug" && (
        <Modal title="Сообщить о баге" onClose={() => setActiveModal(null)}>
          <div style={{padding: 20, display: 'flex', flexDirection: 'column', gap: 15, marginTop: '100px'}}>
            <textarea
              className="modal-input"
              rows={5}
              placeholder="Опишите проблему, шаги воспроизведения..."
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              style={{border: '1px solid #444', borderRadius: 8, padding: 10, resize: 'none', width: '-webkit-fill-available'}}
            />
            <input
              type="file"
              multiple
              onChange={(e) => setBugFiles(Array.from(e.target.files))}
              style={{color: '#aaa'}}
            />
            <button className="btn-primary" onClick={async () => {
              if (!bugDescription) return alert("Опишите проблему");
              const formData = new FormData();
              formData.append("reporter", username);
              formData.append("description", bugDescription);
              bugFiles.forEach(f => formData.append("files", f));
              try {
                await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/report-bug`, { method: "POST", body: formData });
                alert("Баг отправлен! Спасибо.");
                setActiveModal(null);
                setBugDescription("");
                setBugFiles([]);
              } catch (e) {
                alert("Ошибка отправки");
              }
            }}>Отправить отчет</button>
          </div>
        </Modal>
      )}

      {/* === Admin Bugs Modal === */}
      {activeModal === "adminBugs" && (
        <Modal title="Bug Reports" onClose={() => setActiveModal(null)}>
          <div className="settings-list">
            {adminBugList.length === 0 && <div style={{padding:20, textAlign:'center'}}>Нет репортов</div>}
            {adminBugList.map(bug => (
              <div key={bug.id} className="settings-item" style={{marginTop: '20px', flexDirection: 'column', alignItems: 'flex-start', borderBottom: '1px solid #333', opacity: bug.status === 'resolved' ? 0.5 : 1}}>
                <div style={{display:'flex', justifyContent:'space-between', width:'100%', marginBottom: 5}}>
                  <span style={{color: '#2b95ff', fontWeight:'bold'}}>@{bug.reporter}</span>
                  <span style={{fontSize: 12, color: '#666'}}>{new Date(bug.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{whiteSpace: 'pre-wrap', marginBottom: 10}}>{bug.description}</div>
                {bug.media_urls && JSON.parse(bug.media_urls).length > 0 && (
                  <div className="gallery-grid" style={{marginBottom: 10}}>
                    {JSON.parse(bug.media_urls).map((url, i) => (
                      <img key={i} src={url} className="gallery-image" onClick={() => setImageModalSrc(url)} />
                    ))}
                  </div>
                )}
                {bug.status !== 'resolved' && (
                  <button className="btn-accept" onClick={() => resolveBug(bug.id)} style={{width:'100%', marginTop: 5}}>Отметить решенным</button>
                )}
                {bug.status === 'resolved' && <span style={{color: '#4caf50', fontSize: 12}}>✔ Решено</span>}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* === Settings/Profile Modal === */}
      {activeModal === "settings" && (
        <Modal title="My Profile" onClose={() => setActiveModal(null)}>
          <div className="profile-hero">
            <div className="profile-avatar-background" style={{
              backgroundImage: myProfile.avatar_url ? `url(${myProfile.avatar_url})` : 'none',
              backgroundColor: '#333'
            }}>
              {!myProfile.avatar_url && username[0].toUpperCase()}
            </div>
            <div className="ProfName">
              <div className="profile-name">{myProfile.display_name || username}</div>
              <div className="profile-status">@{username}</div>
            </div>
            <div className="btns">
              <button className="change-avatar-btn" onClick={() => avatarInputRef.current.click()}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M4 4H2v16h20V4H4zm16 2v12H4V6h16zM8 8H6v2h2V8zm4 0h4v2h-4V8zm-2 2h2v4h-2v-4zm6 4h2v-4h-2v4zm0 0h-4v2h4v-2z"/></svg>
              </button>
            </div>
          </div>

          <div style={{ color: "#2b95ff", padding: "15px 10px 5px 10px", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>
            Аккаунт
          </div>

          <div className="settings-list">
            <div className="settings-item">
              <div className="form-container" style={{ flex: 1, padding: 0, margin: 0 }}>
                <div className="input-group">
                  <label>Display Name</label>
                  <input className="modal-input" style={{ padding: "5px 0", borderBottom: "none" }} value={profileForm.display_name} onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })} placeholder="Your Name" />
                </div>
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-icon"><svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24" fill="#ffffff"><path fill="#ffffff" d="M4 4h16v12H8V8h8v6h2V6H6v12h14v2H4V4zm10 10v-4h-4v4h4z"/></svg></div>
              <div className="form-container" style={{ flex: 1, padding: 0, margin: 0 }}>
                <div className="input-group">
                  <label>Nametag</label>
                  <input className="modal-input" style={{ padding: "5px 0", borderBottom: "none" }} value={profileForm.username} onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })} placeholder="@username" />
                </div>
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-icon"><svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24"><path fill="#ffffff" d="M1 2h8.58l1.487 6.69l-1.86 1.86a14.08 14.08 0 0 0 4.243 4.242l1.86-1.859L22 14.42V23h-1a19.91 19.91 0 0 1-10.85-3.196a20.101 20.101 0 0 1-5.954-5.954A19.91 19.91 0 0 1 1 3V2Zm2.027 2a17.893 17.893 0 0 0 2.849 8.764a18.102 18.102 0 0 0 5.36 5.36A17.892 17.892 0 0 0 20 20.973v-4.949l-4.053-.9l-2.174 2.175l-.663-.377a16.073 16.073 0 0 1-6.032-6.032l-.377-.663l2.175-2.174L7.976 4H3.027Z"/></svg></div>
              <div className="form-container" style={{ flex: 1, padding: 0, margin: 0 }}>
                <div className="input-group">
                  <label>Mobile</label>
                  <input className="modal-input" style={{ padding: "5px 0", borderBottom: "none" }} value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="Add phone number" />
                </div>
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-icon"><svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24"><path fill="#ffffff" d="M21 1v22H3V1h18Zm-8 2v6.5l-3-2.25L7 9.5V3H5v18h14V3h-6ZM9 3v2.5l1-.75l1 .75V3H9Zm-2 9h10v2H7v-2Zm0 4h8v2H7v-2Z"/></svg></div>
              <div className="form-container" style={{ flex: 1, padding: 0, margin: 0 }}>
                <div className="input-group">
                  <label>Bio</label>
                  <input className="modal-input" style={{ padding: "5px 0", borderBottom: "none" }} value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} placeholder="Add a few words about yourself" />
                </div>
              </div>
            </div>
          </div>

          <div style={{ color: "#2b95ff", padding: "15px 10px 5px 10px", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>
            Настройки
          </div>

          <div className="settings-list">
            <div className="settings-item" onClick={requestNotificationPermission}>
              <div className="settings-icon"><IconBell hasUnread={false}/></div>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="settings-label">Push-уведомления</div>
                <div className={`toggle-switch ${profileForm.notifications_enabled ? 'on' : ''}`}>
                  <div className="knob"></div>
                </div>
              </div>
            </div>

            <div className="settings-item" onClick={() => requestMediaPermissions('video')}>
              <div className="settings-icon"><IconCamera /></div>
              <div className="settings-label">Доступ к камере и микрофону</div>
              <div style={{fontSize: 12, color: '#2b95ff'}}>Запросить</div>
            </div>

            <div className="settings-item" onClick={() => requestMediaPermissions('audio')}>
              <div className="settings-icon"><IconMic /></div>
              <div className="settings-label">Доступ к микрофону</div>
              <div style={{fontSize: 12, color: '#2b95ff'}}>Запросить</div>
            </div>

            <div className="settings-item" onClick={requestFilePermission}>
              <div className="settings-icon"><IconFolder /></div>
              <div className="settings-label">Доступ к галерее и файлам</div>
              <div style={{fontSize: 12, color: '#2b95ff'}}>Запросить</div>
            </div>

            <div style={{ marginBottom: 20 }}></div>

            <div className="settings-item" onClick={() => copyProfileLink(username)}>
              <div className="settings-icon"><IconShare/></div>
              <div className="settings-label">Поделиться профилем</div>
            </div>
          </div>

          <div className="avatar-history" style={{ padding: "0 20px" }}>
            <h4>История аватаров</h4>
            <div className="avatar-history-container">
              {avatarHistory.map((avatar) => (
                <div key={avatar.id} className="avatar-history-item">
                  <img src={avatar.avatar_url} alt="old avatar" onClick={() => setImageModalSrc(avatar.avatar_url)} />
                  <button className="delete-avatar-btn" onClick={() => socket.emit("delete_avatar", { avatarId: avatar.id })}>⨉</button>
                </div>
              ))}
            </div>
          </div>

          <div className="profile-media-section">
            <div className="profile-media-header">
              <h4>Медиа профиля ({myProfile.media ? myProfile.media.length : 0})</h4>
            </div>
            <div className="media-grid">
              <div className="media-grid-add-btn" onClick={() => profileMediaInputRef.current.click()}>+</div>
              {myProfile.media && (isMediaExpanded ? myProfile.media : myProfile.media.slice(-5).reverse()).map((item, idx) => (
                <div key={idx} className="media-grid-item" onClick={() => setImageModalSrc(item.url)}>
                  {item.temp && <div className="uploading-overlay"><div className="spinner"></div></div>}
                  {item.type === 'video' ? <video src={item.url} muted /> : <img src={item.url} alt="media" />}
                </div>
              ))}
            </div>
            {myProfile.media && myProfile.media.length > 5 && (
              <button className="media-toggle-btn" onClick={() => setIsMediaExpanded(!isMediaExpanded)}>
                {isMediaExpanded ? "Свернуть" : `Показать все (${myProfile.media.length})`}
              </button>
            )}
            <input type="file" ref={profileMediaInputRef} className="hidden-input" accept="image/*,video/*" onChange={handleProfileMediaSelect} />
          </div>

          <div style={{ padding: "20px" }}>
            <button className="btn-primary" style={{ width: "100%" }} onClick={saveProfile}>Save Changes</button>
            <button className="btn-danger" style={{ marginTop: 10, textAlign: "center", width: "100%" }} onClick={handleLogout}>Log Out</button>
          </div>
        </Modal>
      )}

      {/* === Avatar Editor Modal === */}
      {avatarEditor.isOpen && (
        <Modal title="Редактор Аватара" onClose={() => setAvatarEditor({ ...avatarEditor, isOpen: false })}>
          <div className="avatar-editor-content">
            <div className="crop-container">
              <Cropper
                image={avatarEditor.image}
                crop={avatarEditor.crop}
                zoom={avatarEditor.zoom}
                aspect={1}
                onCropChange={(crop) => setAvatarEditor((p) => ({ ...p, crop }))}
                onZoomChange={(zoom) => setAvatarEditor((p) => ({ ...p, zoom }))}
                onCropComplete={(_, croppedAreaPixels) => setAvatarEditor((p) => ({ ...p, croppedAreaPixels }))}
                imageStyle={{ filter: `brightness(${avatarEditor.filters.brightness}%) contrast(${avatarEditor.filters.contrast}%) saturate(${avatarEditor.filters.saturate}%) blur(${avatarEditor.filters.blur}px)` }}
              />
            </div>
            <div className="editor-controls">
              <div className="slider-group">
                <label>Zoom</label>
                <input type="range" min={1} max={3} step={0.1} value={avatarEditor.zoom} onChange={(e) => setAvatarEditor((p) => ({ ...p, zoom: e.target.value }))} />
              </div>
              <div className="slider-group">
                <label>Яркость</label>
                <input type="range" min={0} max={200} value={avatarEditor.filters.brightness} onChange={(e) => setAvatarEditor((p) => ({ ...p, filters: { ...p.filters, brightness: e.target.value } }))} />
              </div>
              <div className="slider-group">
                <label>Контраст</label>
                <input type="range" min={0} max={200} value={avatarEditor.filters.contrast} onChange={(e) => setAvatarEditor((p) => ({ ...p, filters: { ...p.filters, contrast: e.target.value } }))} />
              </div>
              <div className="slider-group">
                <label>Насыщ.</label>
                <input type="range" min={0} max={200} value={avatarEditor.filters.saturate} onChange={(e) => setAvatarEditor((p) => ({ ...p, filters: { ...p.filters, saturate: e.target.value } }))} />
              </div>
              <div className="slider-group">
                <label>Размытие</label>
                <input type="range" min={0} max={10} step={0.1} value={avatarEditor.filters.blur} onChange={(e) => setAvatarEditor((p) => ({ ...p, filters: { ...p.filters, blur: e.target.value } }))} />
              </div>
            </div>
            <button className="btn-primary" onClick={handleSaveAvatar}>Применить</button>
          </div>
        </Modal>
      )}

      {/* === Group Info Modal === */}
      {activeModal === "groupInfo" && (
        <Modal title="Group Info" onClose={() => setActiveModal(null)}>
          <div className="profile-hero">
            <div className="profile-avatar-large" style={{
              backgroundImage: roomSettings.avatar_url ? `url(${roomSettings.avatar_url})` : 'none',
              backgroundColor: '#333'
            }}>
              {!roomSettings.avatar_url && room.substring(0, 2)}
            </div>
            <div className="profile-name">{room}</div>
            <div className="profile-status">{groupMembersList.length} members</div>
          </div>

          {(myRole === 'owner' || globalRole === 'mod') && (
            <div style={{padding: '0 20px', marginBottom: 20}}>
              <div className="settings-item">
                <label>Приватный чат (только по приглашению)</label>
                <div className={`toggle-switch ${roomSettings.is_private ? 'on' : ''}`} onClick={() => socket.emit("update_group_settings", { room, is_private: !roomSettings.is_private, slow_mode: roomSettings.slow_mode, avatar_url: roomSettings.avatar_url })}>
                  <div className="knob"></div>
                </div>
              </div>
              <div className="settings-item" style={{flexDirection: 'column', alignItems: 'flex-start'}}>
                <label style={{marginBottom: 5}}>Slow Mode (секунды): {roomSettings.slow_mode}</label>
                <input type="range" min="0" max="60" value={roomSettings.slow_mode} onChange={(e) => socket.emit("update_group_settings", { room, is_private: roomSettings.is_private, slow_mode: parseInt(e.target.value), avatar_url: roomSettings.avatar_url })} style={{width: '100%'}} />
              </div>
              <button className="btn-primary" onClick={() => {
                const url = prompt("Введите URL аватарки чата:");
                if(url) socket.emit("update_group_settings", { room, is_private: roomSettings.is_private, slow_mode: roomSettings.slow_mode, avatar_url: url });
              }}>Сменить аватарку чата</button>
            </div>
          )}

          <div className="settings-list" style={{ padding: "0 15px"}}>
            <div style={{ color: "#8774e1", padding: "10px 0", fontSize: "14px", fontWeight: "bold" }}>Members</div>
            {groupMembersList.map((m, i) => (
              <div key={i} className="settings-item" onClick={(e) => {
                e.stopPropagation();
                if(m.username !== username) {
                  socket.emit("get_user_profile", m.username);
                }
              }}>
                <div className="friend-avatar" style={{
                  fontSize: 12,
                  marginRight: 15,
                  backgroundImage: m.avatar_url ? `url(${m.avatar_url})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
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
      )}

      {/* === Edit Friend Profile Modal === */}
      {activeModal === 'editFriendProfile' && viewProfileData && (
        <Modal title="Редактировать контакт" onClose={() => setActiveModal('userProfile')}>
          <div style={{ padding: 20 }}>
            <div className="form-container">
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                <div className="profile-avatar-large" style={{
                  ...{
                    backgroundImage: friendOverrideForm.preview_avatar ? `url(${friendOverrideForm.preview_avatar})` : 'none',
                    backgroundColor: '#333'
                  },
                  width: 80,
                  height: 80,
                  cursor: 'pointer'
                }} onClick={() => friendAvatarInputRef.current.click()}>
                  {!friendOverrideForm.preview_avatar && viewProfileData.username[0].toUpperCase()}
                </div>
                <input type="file" ref={friendAvatarInputRef} className="hidden-input" accept="image/*" onChange={(e) => {
                  if (e.target.files[0]) {
                    const file = e.target.files[0];
                    setFriendOverrideForm(prev => ({ ...prev, local_avatar_file: file, preview_avatar: URL.createObjectURL(file) }));
                  }
                }} />
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Локальное имя</label>
                  <input className="modal-input" value={friendOverrideForm.local_display_name} onChange={(e) => setFriendOverrideForm(prev => ({ ...prev, local_display_name: e.target.value }))} />
                </div>
              </div>
              <button className="btn-primary" onClick={handleSaveFriendOverride}>Сохранить</button>
              <button className="btn-danger" onClick={() => handleSaveFriendOverride(true)}>Сбросить изменения</button>
            </div>
          </div>
        </Modal>
      )}

      {/* === User Profile Modal === */}
      {activeModal === "userProfile" && viewProfileData && (
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
                  if (room !== roomId) {
                    switchChat(roomId);
                  }
                  setTimeout(() => startCall(true), 100);
                }}>
                  <IconCall />
                </button>
                <button className="change-avatar-btn" title="Boost">
                  <IconLightning />
                </button>
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
                <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="#ffffff"><path fill="#ffffff" d="M12 22q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35-3.175 2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Zm0-2q3.35 0 5.675-2.325T20 12q0-1.35-.438-2.6T18.3 7.1L7.1 18.3q1.05.825 2.3 1.263T12 20Zm-6.3-3.1L16.9 5.7q-1.05-.825-2.3-1.262T12 4Q8.65 4 6.325 6.325T4 12q0 1.35.437 2.6T5.7 16.9Z"/></svg>
              </span>
              Block User
            </div>
          </div>
        </Modal>
      )}

      {/* === Admin Panel Modal === */}
      {activeModal === "adminPanel" && (
        <AdminPanel
          token={localStorage.getItem("apollo_token")}
          socket={socket}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* === Hidden File Inputs === */}
      <input type="file" ref={avatarInputRef} className="hidden-input" onChange={onFileChange} accept="image/*" />
    </>
  );
};

export default ModalsContainer;