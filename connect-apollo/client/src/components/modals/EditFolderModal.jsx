import React from "react";
import Modal from "../common/Modal";
import { useSettingsStore } from "../../stores/settingsStore";
import { useUIStore } from "../../stores/uiStore";

const EditFolderModal = () => {
    const setActiveModal = useUIStore(s => s.setActiveModal);
    
    const folderToEdit = useSettingsStore(s => s.folderToEdit);
    const folders = useSettingsStore(s => s.folders);
    const setFolders = useSettingsStore(s => s.setFolders);
    const setActiveFolderId = useSettingsStore(s => s.setActiveFolderId);

    const removeFolder = (id) => {
        setFolders(folders.filter(f => f.id !== id));
        setActiveFolderId('all');
        setActiveModal(null);
    };

    if (!folderToEdit) return null;

    return (
        <Modal title={`Папка: ${folderToEdit.name}`} onClose={() => setActiveModal(null)}>
          <button className="btn-danger" onClick={() => removeFolder(folderToEdit.id)}>Удалить папку</button>
        </Modal>
    );
}

export default EditFolderModal;