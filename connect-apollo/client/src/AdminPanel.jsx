import React, { useState, useEffect } from 'react';
import Modal from './custom/Modal';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

const AdminPanel = ({ token, onClose, socket }) => {
    const [users, setUsers] = useState([]);
    const [badges, setBadges] = useState([]);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("users"); // 'users', 'badges'
    
    // Forms
    const [newBadge, setNewBadge] = useState({ name: "", svg_content: "" });

    useEffect(() => {
        fetchUsers();
        fetchBadges();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
            if(res.ok) setUsers(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchBadges = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/admin/badges`, { headers: { Authorization: `Bearer ${token}` } });
            if(res.ok) setBadges(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleUserAction = async (action, targetUsername, payload = {}) => {
        if(!window.confirm(`Are you sure you want to ${action} ${targetUsername}?`)) return;
        
        try {
            const res = await fetch(`${BACKEND_URL}/admin/user-action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action, targetUsername, payload })
            });
            if(res.ok) {
                alert("Action successful");
                fetchUsers();
            }
        } catch (e) { alert("Error"); }
    };

    const createBadge = async () => {
        if (!newBadge.name || !newBadge.svg_content) return alert("Fill all fields");
        try {
            await fetch(`${BACKEND_URL}/admin/badges`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(newBadge)
            });
            fetchBadges();
            setNewBadge({ name: "", svg_content: "" });
        } catch (e) { alert("Error creating badge"); }
    };

    const deleteBadge = async (id) => {
        if(!window.confirm("Удалить этот бейдж? Он пропадет у всех пользователей.")) return;
        try {
            const res = await fetch(`${BACKEND_URL}/admin/badges/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                fetchBadges();
            } else {
                alert("Error deleting badge");
            }
        } catch (e) { alert("Error"); }
    };

    const assignBadge = async (username, badgeId, action) => {
        try {
            await fetch(`${BACKEND_URL}/admin/assign-badge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ username, badgeId, action })
            });
            // Не показываем алерт, чтобы не спамить, можно добавить toast
            // alert(`${action === 'add' ? 'Given' : 'Removed'} badge`);
        } catch (e) { console.error(e); }
    };

    const filteredUsers = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));

    return (
        <Modal title="Admin Control Panel" onClose={onClose}>
            <div style={{ display: 'flex', gap: 10, padding: '0 20px 20px', marginTop: '100px'}}>
                <button className={`folder-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Users</button>
                <button className={`folder-tab ${activeTab === 'badges' ? 'active' : ''}`} onClick={() => setActiveTab('badges')}>Badges</button>
            </div>

            {activeTab === 'users' && (
                <div style={{ padding: '0 20px' }}>
                    <input 
                        className="modal-input" 
                        placeholder="Search user..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        style={{ marginBottom: 15 }}
                    />
                    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        {filteredUsers.map(u => (
                            <div key={u.id} className="settings-item" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: '1px solid #333', padding: '15px 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontWeight: 'bold', color: u.global_role === 'mod' ? '#2b95ff' : 'white' }}>{u.username}</span>
                                        <span style={{ fontSize: 12, color: '#888', marginLeft: 10 }}>({u.global_role})</span>
                                        {u.display_name && u.display_name !== u.username && <div style={{fontSize: 12, color: '#666'}}>{u.display_name}</div>}
                                    </div>
                                    <div style={{ display: 'flex', gap: 5 }}>
                                        {u.global_role !== 'mod' ? (
                                            <button className="btn-accept" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleUserAction('set_role', u.username, { role: 'mod' })}>Make Mod</button>
                                        ) : (
                                            <button className="btn-decline" style={{ padding: '4px 8px', fontSize: 12, background: '#333', color: '#fff' }} onClick={() => handleUserAction('set_role', u.username, { role: 'member' })}>Demote</button>
                                        )}
                                        <button className="btn-decline" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleUserAction('delete', u.username)}>Del</button>
                                    </div>
                                </div>
                                <div style={{ marginTop: 10, width: '100%' }}>
                                    <div style={{fontSize: 12, color: '#888', marginBottom: 5}}>Actions & Badges:</div>
                                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                        <button className="reset-password-btn" onClick={() => handleUserAction('reset_password', u.username)}>Reset Pass</button>
                                        
                                        {badges.map(b => (
                                            <button 
                                                key={b.id} 
                                                className="folder-tab" 
                                                onClick={() => assignBadge(u.username, b.id, 'add')} 
                                                onContextMenu={(e) => { e.preventDefault(); assignBadge(u.username, b.id, 'remove'); }}
                                                title={`L-Click: Give ${b.name} | R-Click: Remove`}
                                                style={{display: 'flex', alignItems: 'center', gap: 5}}
                                            >
                                                +<div style={{width: 'auto', height: 'auto'}} dangerouslySetInnerHTML={{__html: b.svg_content}} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'badges' && (
                <div style={{ padding: '0 20px' }}>
                    <div className="form-container" style={{marginBottom: 20}}>
                        <input className="modal-input" placeholder="Badge Name" value={newBadge.name} onChange={e => setNewBadge({...newBadge, name: e.target.value})} />
                        <textarea 
                            className="modal-input" 
                            placeholder="SVG Code (<svg...)" 
                            rows={3} 
                            value={newBadge.svg_content} 
                            onChange={e => setNewBadge({...newBadge, svg_content: e.target.value})} 
                            style={{resize: 'vertical', minHeight: 60}}
                        />
                        <button className="btn-primary" onClick={createBadge}>Create Badge</button>
                    </div>
                    
                    <div style={{ marginTop: 20 }}>
                        <h4 style={{color: '#888', marginBottom: 10}}>Existing Badges</h4>
                        {badges.length === 0 && <div style={{color: '#666'}}>No badges created yet.</div>}
                        {badges.map(b => (
                            <div key={b.id} className="settings-item" style={{justifyContent: 'space-between'}}>
                                <div style={{display: 'flex', alignItems: 'center'}}>
                                    <div style={{ width: 32, height: 32, marginRight: 15, background: '#333', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }} dangerouslySetInnerHTML={{__html: b.svg_content}} />
                                    <div>
                                        <div style={{fontWeight: 'bold'}}>{b.name}</div>
                                        <div style={{fontSize: 11, color: '#666'}}>ID: {b.id}</div>
                                    </div>
                                </div>
                                <button className="add-btn-small" style={{background: '#ff4d4d', width: 30, height: 30}} onClick={() => deleteBadge(b.id)} title="Delete Badge">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default AdminPanel;