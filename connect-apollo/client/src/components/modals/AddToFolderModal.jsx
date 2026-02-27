import React from "react";
import { useApp } from "../../context/AppContext";
import Modal from "../common/Modal";

const AddToFolderModal = () => {
    const {
        setActiveModal,
        folders,
        handleAddToFolder
    } = useApp();

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