import React from "react";
import Modal from "../common/Modal";
import { useUIStore } from "../../stores/uiStore";
import { useProfileStore } from "../../stores/profileStore";
import { useAuthStore } from "../../stores/authStore";

const SearchGroupModal = () => {
    const setActiveModal = useUIStore(s => s.setActiveModal);
    const searchQuery = useProfileStore(s => s.searchQuery);
    const setSearchQuery = useProfileStore(s => s.setSearchQuery);
    const searchGroupResults = useProfileStore(s => s.searchGroupResults);
    const myChats = useProfileStore(s => s.myChats);
    
    const socket = useAuthStore(s => s.socket);
    const username = useAuthStore(s => s.username);

    React.useEffect(() => {
      const delayDebounceFn = setTimeout(() => {
        if (searchQuery.trim() && socket) {
          socket.emit("search_groups", searchQuery);
        }
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, socket]);

    return (
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
    );
}

export default SearchGroupModal;