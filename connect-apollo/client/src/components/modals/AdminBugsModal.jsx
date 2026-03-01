import React from 'react';
import Modal from '../common/Modal';
import { useUIStore } from '../../stores/uiStore';
import { useSettingsStore } from '../../stores/settingsStore';

const AdminBugsModal = () => {
  const setActiveModal = useUIStore(s => s.setActiveModal);
  const setImageModalSrc = useUIStore(s => s.setImageModalSrc);
  const adminBugList = useSettingsStore(s => s.adminBugList);
  const setAdminBugList = useSettingsStore(s => s.setAdminBugList);

  const resolveBug = async (id) => {
    try {
      const token = localStorage.getItem("apollo_token");
      await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/admin/resolve-bug/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdminBugList(adminBugList.map(b => b.id === id ? { ...b, status: 'resolved' } : b));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Modal title="Bug Reports" onClose={() => setActiveModal(null)}>
      <div className="settings-list">
        {adminBugList.length === 0 && <div style={{padding:20, textAlign:'center'}}>Нет репортов</div>}
        {adminBugList.map(bug => (
          <div key={bug.id} className="settings-item" style={{marginTop: '20px', flexDirection: 'column', alignItems: 'flex-start', borderBottom: '1px solid #333', opacity: bug.status === 'resolved' ? 0.5 : 1}}>
            <div style={{display:'flex', justifyContent:'space-between', width:'100%', marginBottom: 5}}>
              <span style={{color: '#2b95ff', fontWeight:'bold'}}>@{bug.reporter}</span>
              <span style={{fontSize: 12, color: '#666'}}>{new Date(bug.created_at).toLocaleDateString()}</span>
            </div>
            <div style={{whiteSpace: 'pre-wrap', marginBottom: 10}}>{bug.description}</div>
            {bug.media_urls && JSON.parse(bug.media_urls).length > 0 && (
              <div className="gallery-grid" style={{marginBottom: 10}}>
                {JSON.parse(bug.media_urls).map((url, i) => (
                  <img key={i} src={url} alt="bug" className="gallery-image" onClick={() => setImageModalSrc(url)} />
                ))}
              </div>
            )}
            {bug.status !== 'resolved' && (
              <button className="btn-accept" onClick={() => resolveBug(bug.id)} style={{width:'100%', marginTop: 5}}>Отметить решенным</button>
            )}
            {bug.status === 'resolved' && <span style={{color: '#4caf50', fontSize: 12}}>✔ Решено</span>}
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default AdminBugsModal;