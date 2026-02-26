import React from 'react';
import { IconFolder } from '../common/Icons';

const FolderTabs = ({ 
  folders, 
  activeFolderId, 
  setActiveFolderId, 
  setFolderToEdit, 
  setActiveModal 
}) => {
  return (
    <div className="folder-tabs">
      {folders.map(f => (
        <div
          key={f.id}
          className={`folder-tab ${activeFolderId === f.id ? 'active' : ''}`}
          onClick={() => setActiveFolderId(f.id)}
          onContextMenu={(e) => { 
            e.preventDefault(); 
            setFolderToEdit(f); 
            setActiveModal("editFolder"); 
          }}
        >
          {f.name}
        </div>
      ))}
      <div 
        className="add-folder-btn" 
        onClick={() => setActiveModal("createFolder")}
      >
        +
      </div>
      <div 
        className="background-folder-btn" 
        onClick={() => setActiveModal("createFolder")}
      >
        +
      </div>
    </div>
  );
};

export default FolderTabs;