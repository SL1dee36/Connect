import React from 'react';
import { useApp } from '../../context/AppContext';
import Modal from './Modal';
import AdminPanel from '../admin/AdminPanel';

import CreateGroupContent from '../modals/CreateGroupContent';
import GroupInfoModal from '../modals/GroupInfoModal';
import SettingsModal from '../modals/SettingsModal';
import NotificationsModal from '../modals/NotificationsModal';
import AddFriendModal from '../modals/AddFriendModal';
import CreateFolderModal from "../modals/CreateFolderModal";
import EditFolderModal from '../modals/EditFolderModal';
import AddToFolderModal from '../modals/AddToFolderModal';
import AddToGroupModal from '../modals/AddToGroupModal';
import SearchGroupModal from '../modals/SearchGroupModal';
import ReportBugModal from '../modals/ReportBugModal';
import ActionMenuModal from '../modals/ActionMenuModal';
import AdminBugsModal from '../modals/AdminBugsModal';
import AvatarEditorModal from '../modals/AvatarEditorModal';
import EditFriendProfileModal from '../modals/EditFriendProfileModal';
import UserProfileModal from '../modals/UserProfileModal';

const ModalsContainer = () => {
  const {
    activeModal,
    setActiveModal,
    messageToDelete,
    setMessageToDelete,
    confirmDelete,
    myRole,
    globalRole,
    messageList,
    username,
    onFileChange,
    avatarInputRef,
    socket,
    folderToEdit,
    viewProfileData
  } = useApp();

  return (
    <>
      {activeModal === "notifications" && <NotificationsModal />}
      {activeModal === "createFolder" && <CreateFolderModal />}
      {activeModal === "editFolder" && folderToEdit && <EditFolderModal />}
      {activeModal === "addToFolder" && <AddToFolderModal />}
      {activeModal === "actionMenu" && <ActionMenuModal />}
      {activeModal === "createGroup" && <CreateGroupContent username={username} socket={socket} onClose={() => setActiveModal(null)} />}
      {activeModal === "addToGroup" && <AddToGroupModal />}
      {activeModal === "searchGroup" && <SearchGroupModal />}
      {activeModal === "addFriend" && <AddFriendModal />}
      {activeModal === "reportBug" && <ReportBugModal />}
      {activeModal === "adminBugs" && <AdminBugsModal />}
      {activeModal === "settings" && <SettingsModal />}
      {activeModal === "groupInfo" && <GroupInfoModal />}
      {activeModal === "editFriendProfile" && viewProfileData && <EditFriendProfileModal />}
      {activeModal === "userProfile" && viewProfileData && <UserProfileModal />}
      <AvatarEditorModal />

      {activeModal === 'deleteConfirm' && (
        <Modal title="Удалить сообщение" onClose={() => { setActiveModal(null); setMessageToDelete(null); }}>
          <div className="delete-options">
            <p style={{textAlign: 'center', color: '#ccc', marginBottom: 10}}>Вы хотите удалить это сообщение?</p>
            {(myRole === 'owner' || globalRole === 'mod' || messageList.find(m => m.id === messageToDelete)?.author === username) && (
              <button className="btn-delete-everyone" onClick={() => confirmDelete(true)}>Удалить у всех</button>
            )}
            <button className="btn-delete-me" onClick={() => confirmDelete(false)}>Удалить у меня</button>
          </div>
        </Modal>
      )}

      {activeModal === "adminPanel" && (
        <AdminPanel token={localStorage.getItem("apollo_token")} socket={socket} onClose={() => setActiveModal(null)} />
      )}

      <input type="file" ref={avatarInputRef} className="hidden-input" onChange={onFileChange} accept="image/*" />
    </>
  );
};

export default ModalsContainer;