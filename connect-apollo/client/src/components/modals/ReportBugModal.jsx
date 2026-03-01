import React from "react";
import Modal from "../common/Modal";
import { useUIStore } from "../../stores/uiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useAuthStore } from "../../stores/authStore";

const ReportBugModal = () => {
    const setActiveModal = useUIStore(s => s.setActiveModal);
    const username = useAuthStore(s => s.username);
    
    const bugDescription = useSettingsStore(s => s.bugDescription);
    const setBugDescription = useSettingsStore(s => s.setBugDescription);
    const bugFiles = useSettingsStore(s => s.bugFiles);
    const setBugFiles = useSettingsStore(s => s.setBugFiles);

    return (
         <Modal title="Сообщить о баге" onClose={() => setActiveModal(null)}>
          <div style={{padding: 20, display: 'flex', flexDirection: 'column', gap: 15, marginTop: '100px'}}>
            <textarea
              className="modal-input"
              rows={5}
              placeholder="Опишите проблему, шаги воспроизведения..."
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              style={{border: '1px solid #444', borderRadius: 8, padding: 10, resize: 'none', width: '-webkit-fill-available'}}
            />
            <input
              type="file"
              multiple
              onChange={(e) => setBugFiles(Array.from(e.target.files))}
              style={{color: '#aaa'}}
            />
            <button className="btn-primary" onClick={async () => {
              if (!bugDescription) return alert("Опишите проблему");
              const formData = new FormData();
              formData.append("reporter", username);
              formData.append("description", bugDescription);
              bugFiles.forEach(f => formData.append("files", f));
              try {
                await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/report-bug`, { method: "POST", body: formData });
                alert("Баг отправлен! Спасибо.");
                setActiveModal(null);
                setBugDescription("");
                setBugFiles([]);
              } catch (e) {
                alert("Ошибка отправки");
              }
            }}>Отправить отчет</button>
          </div>
        </Modal>
    );
}

export default ReportBugModal;