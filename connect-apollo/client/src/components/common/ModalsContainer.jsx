import React, { Suspense } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useProfileStore } from '../../stores/profileStore';
import Modal from './Modal'; 

const NotificationsModal = React.lazy(() => import('../modals/NotificationsModal'));
const CreateFolderModal = React.lazy(() => import('../modals/CreateFolderModal'));
const EditFolderModal = React.lazy(() => import('../modals/EditFolderModal'));
const AddToFolderModal = React.lazy(() => import('../modals/AddToFolderModal'));
const ActionMenuModal = React.lazy(() => import('../modals/ActionMenuModal'));
const CreateGroupContent = React.lazy(() => import('../modals/CreateGroupContent'));
const AddToGroupModal = React.lazy(() => import('../modals/AddToGroupModal'));
const SearchGroupModal = React.lazy(() => import('../modals/SearchGroupModal'));
const AddFriendModal = React.lazy(() => import('../modals/AddFriendModal'));
const ReportBugModal = React.lazy(() => import('../modals/ReportBugModal'));
const AdminBugsModal = React.lazy(() => import('../modals/AdminBugsModal'));
const SettingsModal = React.lazy(() => import('../modals/SettingsModal'));
const GroupInfoModal = React.lazy(() => import('../modals/GroupInfoModal'));
const EditFriendProfileModal = React.lazy(() => import('../modals/EditFriendProfileModal'));
const UserProfileModal = React.lazy(() => import('../modals/UserProfileModal'));
const AvatarEditorModal = React.lazy(() => import('../modals/AvatarEditorModal'));
const AdminPanel = React.lazy(() => import('../admin/AdminPanel'));

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

  if (!activeModal && !useProfileStore.getState().avatarEditor.isOpen) return null;

  return (
    <Suspense fallback={null}>
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
    </Suspense>
  );
};

export default ModalsContainer;