import React from "react";
import { useApp } from "../../context/AppContext";
import Modal from "../common/Modal";

const CreateFolderModal = () => {
    const {
        setActiveModal,
        setNewFolderName,
        newFolderName,
        createNewFolder
    } = useApp();

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