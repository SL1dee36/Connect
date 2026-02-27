import React from "react";
import { useApp } from "../../context/AppContext";
import Modal from "../common/Modal";

const SearchGroupModal = () => {
    const {
        setActiveModal,
        setSearchQuery,
        searchQuery,
        searchGroupResults,
        myChats,
    } = useApp();

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