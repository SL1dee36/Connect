import React from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUIStore } from '../../stores/uiStore';

const FolderTabs = () => {
  const folders = useSettingsStore(s => s.folders);
  const activeFolderId = useSettingsStore(s => s.activeFolderId);
  const setActiveFolderId = useSettingsStore(s => s.setActiveFolderId);
  const setFolderToEdit = useSettingsStore(s => s.setFolderToEdit);
  
  const setActiveModal = useUIStore(s => s.setActiveModal);

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