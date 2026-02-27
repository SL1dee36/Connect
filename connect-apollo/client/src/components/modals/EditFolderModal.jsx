import React from "react";
import { useApp } from "../../context/AppContext";
import Modal from "../common/Modal";

const EditFolderModal = () => {
    const {
        folderToEdit,
        setActiveModal,
        removeFolder
    } = useApp();

    return (
        <Modal title={`Папка: ${folderToEdit.name}`} onClose={() => setActiveModal(null)}>
          <button className="btn-danger" onClick={() => removeFolder(folderToEdit.id)}>Удалить папку</button>
        </Modal>
    );
}

export default EditFolderModal;