import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useProfileStore } from '../../stores/profileStore';
import Modal from './Modal';

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
  const activeModal = useUIStore(state => state.activeModal);
  const setActiveModal = useUIStore(state => state.setActiveModal);

  const messageToDelete = useChatStore(s => s.messageToDelete);
  const setMessageToDelete = useChatStore(s => s.setMessageToDelete);
  const messageList = useChatStore(s => s.messageList);
  const myRole = useChatStore(s => s.myRole);
  const globalRole = useChatStore(s => s.globalRole);
  const username = useAuthStore(s => s.username);
  const socket = useAuthStore(s => s.socket);
  const folderToEdit = useSettingsStore(s => s.folderToEdit);
  const viewProfileData = useProfileStore(s => s.viewProfileData);

  const confirmDelete = (forEveryone) => {
    if (!messageToDelete) return;
    socket.emit("delete_message", { id: messageToDelete, forEveryone });
    useChatStore.getState().setMessageList(prev => prev.filter(msg => msg.id !== messageToDelete));
    setMessageToDelete(null);
    setActiveModal(null);
  };

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
    </>
  );
};

export default ModalsContainer;