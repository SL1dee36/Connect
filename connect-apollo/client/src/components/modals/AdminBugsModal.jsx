import React from 'react';
import { useApp } from '../../context/AppContext';
import Modal from '../common/Modal';

const AdminBugsModal = () => {
  const { setActiveModal, adminBugList, resolveBug, setImageModalSrc } = useApp();

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