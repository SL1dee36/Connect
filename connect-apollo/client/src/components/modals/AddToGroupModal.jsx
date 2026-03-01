import React from "react";
import Modal from "../common/Modal";
import { useUIStore } from "../../stores/uiStore";
import { useProfileStore } from "../../stores/profileStore";
import { useChatStore } from "../../stores/chatStore";
import { useAuthStore } from "../../stores/authStore";

const AddToGroupModal = () => {
    const setActiveModal = useUIStore(s => s.setActiveModal);
    
    const searchQuery = useProfileStore(s => s.searchQuery);
    const setSearchQuery = useProfileStore(s => s.setSearchQuery);
    const friends = useProfileStore(s => s.friends);
    
    const groupMembers = useChatStore(s => s.groupMembers);
    const room = useChatStore(s => s.room);
    
    const socket = useAuthStore(s => s.socket);

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
                const isAlreadyMember = groupMembers.some(m => m.username === f.username || m.username === f);
                const friendName = typeof f === 'string' ? f : f.username;
                const matchesSearch = friendName.toLowerCase().includes(searchQuery.toLowerCase());
                return !isAlreadyMember && matchesSearch;
              })
              .map((friend) => {
                const friendObj = typeof friend === 'string' ? { username: friend } : friend;
                return (
                  <div key={friendObj.username} className="settings-item">
                    <div className="friend-avatar" style={{
                      backgroundImage: friendObj.avatar_url ? `url(${friendObj.avatar_url})` : 'none',
                      backgroundColor: '#333'
                    }}>
                      {!friendObj.avatar_url && friendObj.username[0].toUpperCase()}
                    </div>
                    <div className="settings-label">
                      <div style={{ fontSize: "15px", color: "white" }}>
                        {friendObj.display_name || friendObj.username}
                      </div>
                      <div style={{ fontSize: "12px", color: "#888" }}>
                        @{friendObj.username}
                      </div>
                    </div>
                    <button
                      className="add-btn-small"
                      onClick={() => {
                        socket.emit("add_group_member", { room, username: friendObj.username });
                        alert(`${friendObj.username} добавлен!`);
                      }}
                    >
                      +
                    </button>
                  </div>
                )
              })
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