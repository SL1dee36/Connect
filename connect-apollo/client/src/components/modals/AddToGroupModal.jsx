import React from "react";
import { useApp } from "../../context/AppContext";
import Modal from "../common/Modal";

const AddToGroupModal = () => {
    const {
        setActiveModal,
        searchQuery,
        setSearchQuery,
        friends,
        groupMembers,
    } = useApp();

    return (
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
    );
}

export default AddToGroupModal;