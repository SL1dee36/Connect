import React from 'react';
import { useApp } from '../../context/AppContext';
import Modal from '../common/Modal';

const AddFriendModal = () => {
  const { 
    setActiveModal, 
    searchQuery, 
    setSearchQuery, 
    isSearching, 
    searchResults, 
    friends, 
    socket 
  } = useApp();

  return (
    <Modal title="Поиск людей" onClose={() => { setActiveModal(null); setSearchQuery(""); }}>
      <input 
        className="modal-input" 
        placeholder="@nametag или имя..." 
        value={searchQuery} 
        onChange={(e) => setSearchQuery(e.target.value)} 
      />
      
      {isSearching && (<div style={{ textAlign: "center", color: "#888", padding: 10 }}>Поиск...</div>)}
      
      <div className="search-results">
        {searchResults.length === 0 && searchQuery && !isSearching && (
          <div style={{ textAlign: "center", color: "#666", padding: 10 }}>Ничего не найдено</div>
        )}
        
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
              <button 
                className="add-btn-small" 
                onClick={() => { 
                  socket.emit("send_friend_request_by_name", { toUsername: u.username }); 
                  alert("Заявка отправлена!"); 
                }}
              >
                +
              </button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default AddFriendModal;