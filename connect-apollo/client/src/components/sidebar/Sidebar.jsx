import React from 'react';
import FolderTabs from './FolderTabs';
import ChatList from './ChatList';
import { 
  IconBell, 
  IconShield, 
  IconPin, 
  IconFolder, 
  IconTrash,
  IconDrag 
} from '../common/Icons';

const Sidebar = ({
  isMobile,
  showMobileChat,
  myProfile,
  username,
  globalRole,
  hasUnreadNotifs,
  isSelectionMode,
  selectedChats,
  folders,
  activeFolderId,
  unifiedChatList,
  room,
  pinnedChats,
  isMobileDragging,
  draggedItemId,
  chatLongPressTimer,
  // Actions
  openSettings,
  setActiveModal,
  setIsSelectionMode,
  setSelectedChats,
  setActiveFolderId,
  setFolderToEdit,
  handlePinSelected,
  handleDeleteSelected,
  onChatClick,
  onChatLongPress,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDragOver,
  onTouchDragStart,
  onTouchDragMove,
  onTouchDragEnd
}) => {
  const getAvatarStyle = (imgUrl) => {
    return imgUrl 
      ? { 
          backgroundImage: `url(${imgUrl})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center', 
          backgroundColor: '#333', 
          color: 'transparent' 
        } 
      : { backgroundColor: '#333' };
  };

  return (
    <div
      className={`left-panel ${isMobile && showMobileChat ? "hidden" : ""}`}
      onTouchMove={onTouchDragMove}
      onTouchEnd={onTouchDragEnd}
    >
      {/* Sidebar Header */}
      <div className="sidebar-top">
        <div className="sidebar-header-content">
          <div 
            className="my-avatar" 
            style={getAvatarStyle(myProfile.avatar_url)} 
            onClick={openSettings}
          >
            {!myProfile.avatar_url && username[0].toUpperCase()}
          </div>
          {isMobile && <div className="mobile-app-title">Connect</div>}
        </div>
        <div className="actMenu" style={{display: 'flex', gap: 15, alignItems: 'center'}}>
          <div 
            onClick={() => setActiveModal("notifications")} 
            title="notifications"
          >
            <IconBell hasUnread={hasUnreadNotifs} />
          </div>
          {globalRole === 'mod' && (
            <button 
              className="fab-btn" 
              style={{backgroundColor: '#444', width: 40, height: 40}} 
              onClick={() => setActiveModal("adminPanel")}
            >
              <IconShield />
            </button>
          )}
          <button 
            className="fab-btn" 
            onClick={() => setActiveModal("actionMenu")}
          >
            <svg 
              id="plus-icon" 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="#ffffff"
            >
              <path fill="#ffffff" d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Selection Mode Header */}
      {isSelectionMode ? (
        <div className="sidebar-selection-header">
          <button 
            className="back-btn" 
            onClick={() => { 
              setIsSelectionMode(false); 
              setSelectedChats([]); 
            }}
          >
            &times;
          </button>
          <span className="selection-title">Выбрано: {selectedChats.length}</span>
          <div className="selection-actions">
            <button 
              className="tool-btn" 
              onClick={handlePinSelected} 
              title="Закрепить/Открепить"
            >
              <IconPin />
            </button>
            <button 
              className="tool-btn" 
              onClick={() => setActiveModal("addToFolder")} 
              title="В папку"
            >
              <IconFolder />
            </button>
            <button 
              className="tool-btn" 
              style={{color: '#ff4d4d'}} 
              onClick={handleDeleteSelected} 
              title="Удалить"
            >
              <IconTrash />
            </button>
          </div>
        </div>
      ) : (
        <p></p>
      )}

      {/* Friends List Section */}
      <div className="friends-list">
        {!isSelectionMode && (
          <FolderTabs
            folders={folders}
            activeFolderId={activeFolderId}
            setActiveFolderId={setActiveFolderId}
            setFolderToEdit={setFolderToEdit}
            setActiveModal={setActiveModal}
          />
        )}

        <ChatList
          unifiedChatList={unifiedChatList}
          room={room}
          selectedChats={selectedChats}
          pinnedChats={pinnedChats}
          isMobileDragging={isMobileDragging}
          draggedItemId={draggedItemId}
          isSelectionMode={isSelectionMode}
          username={username}
          chatPreviews={{}}
          onChatClick={onChatClick}
          onChatLongPress={onChatLongPress}
          onDragStart={onDragStart}
          onDragEnter={onDragEnter}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onTouchDragStart={onTouchDragStart}
          chatLongPressTimer={chatLongPressTimer}
        />
      </div>
    </div>
  );
};

export default Sidebar;