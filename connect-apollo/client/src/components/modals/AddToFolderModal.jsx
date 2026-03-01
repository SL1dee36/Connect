import React from "react";
import Modal from "../common/Modal";
import { useSettingsStore } from "../../stores/settingsStore";
import { useUIStore } from "../../stores/uiStore";
import { useAuthStore } from "../../stores/authStore";

const AddToFolderModal = () => {
    const setActiveModal = useUIStore(s => s.setActiveModal);
    const selectedChats = useUIStore(s => s.selectedChats);
    const clearSelection = useUIStore(s => s.clearSelection);
    
    const folders = useSettingsStore(s => s.folders);
    const setFolders = useSettingsStore(s => s.setFolders);
    const username = useAuthStore(s => s.username);

    const handleAddToFolder = (folderId) => {
        const newFolders = folders.map(f => {
            if (f.id === folderId) {
                const newChatIds = [...f.chatIds];
                selectedChats.forEach(chatId => {
                    const originalId = chatId.split('_').find(u => u !== username) || chatId;
                    if (!newChatIds.includes(originalId)) newChatIds.push(originalId);
                });
                return { ...f, chatIds: newChatIds };
            }
            return f;
        });
        setFolders(newFolders);
        clearSelection();
        setActiveModal(null);
    };

    return (
        <Modal title="Добавить в папку" onClose={() => setActiveModal(null)}>
          <div className="settings-list">
            {folders.map(f => (
              <div key={f.id} className="settings-item" onClick={() => handleAddToFolder(f.id)}>
                <div className="settings-label">{f.name}</div>
              </div>
            ))}
          </div>
        </Modal>
    );
}

export default AddToFolderModal;