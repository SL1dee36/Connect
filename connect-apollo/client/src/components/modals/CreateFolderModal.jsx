import React from "react";
import { useSettingsStore } from "../../stores/settingsStore";
import { useUIStore } from "../../stores/uiStore";
import Modal from "../common/Modal";

const CreateFolderModal = () => {
    const setActiveModal = useUIStore(s => s.setActiveModal);
    const newFolderName = useSettingsStore(s => s.newFolderName);
    const setNewFolderName = useSettingsStore(s => s.setNewFolderName);
    
    const folders = useSettingsStore(s => s.folders);
    const setFolders = useSettingsStore(s => s.setFolders);

    const createNewFolder = () => {
      if (!newFolderName.trim()) return;
      const newFolder = { id: Date.now().toString(), name: newFolderName, chatIds: [] };
      setFolders([...folders, newFolder]);
      setNewFolderName("");
      setActiveModal(null);
    };

    return (
        <Modal title="Новая папка" onClose={() => setActiveModal(null)}>
          <input
            className="modal-input"
            placeholder="Название папки..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <button className="btn-primary" onClick={createNewFolder}>Создать</button>
        </Modal>
    );
}
export default CreateFolderModal;