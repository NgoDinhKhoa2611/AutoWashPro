import { useState, useEffect } from 'react';

export const GlobalToastAndConfirm = () => {
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    // 1. Toast System
    const TOAST_ICONS = {
      success: 'fa-check-circle',
      error: 'fa-times-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };

    window.showToast = (message, type = 'success') => {
      const container = document.getElementById('toast-container');
      if (!container) return;

      // Prevent duplicate toast if the exact same message is currently active
      const existingToasts = container.getElementsByClassName('toast-content');
      for (let i = 0; i < existingToasts.length; i++) {
        if (existingToasts[i].textContent === String(message)) {
          return;
        }
      }

      const id = 'toast_' + Date.now();
      const icon = TOAST_ICONS[type] || TOAST_ICONS.info;

      const el = document.createElement('div');
      el.className = `toast-item toast-${type} animate-toast-in`;
      el.id = id;

      const iconBox = document.createElement('div');
      iconBox.className = 'toast-icon';
      const iconElement = document.createElement('i');
      iconElement.className = `fas ${icon}`;
      iconBox.appendChild(iconElement);

      const content = document.createElement('div');
      content.className = 'toast-content';
      content.textContent = String(message);

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'toast-close-btn';
      closeBtn.setAttribute('aria-label', 'Đóng thông báo');
      const closeIcon = document.createElement('i');
      closeIcon.className = 'fas fa-times';
      closeBtn.appendChild(closeIcon);

      const progress = document.createElement('div');
      progress.className = 'toast-progress';

      el.append(iconBox, content, closeBtn, progress);

      container.appendChild(el);
      closeBtn.onclick = () => window.dismissToast(id);

      setTimeout(() => window.dismissToast(id), 3500);
    };

    window.dismissToast = (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('animate-toast-in');
      el.classList.add('animate-toast-out');
      setTimeout(() => el.remove(), 350);
    };

    // 2. Confirm Modal System
    window.showConfirm = (title, message, onConfirm) => {
      setConfirm({
        title,
        message,
        onConfirm: () => {
          if (onConfirm) onConfirm();
          setConfirm(null);
        },
        onCancel: () => {
          setConfirm(null);
        }
      });
    };

    window.closeConfirm = () => {
      setConfirm(null);
    };

    return () => {
      delete window.showToast;
      delete window.dismissToast;
      delete window.showConfirm;
      delete window.closeConfirm;
    };
  }, []);

  return (
    <>
      <div id="toast-container"></div>
      {confirm && (
        <div id="confirm-modal-backdrop" className="confirm-modal-backdrop show" style={{ display: 'flex' }}>
          <div className="confirm-modal-card animate-confirm-in">
            <div className="confirm-modal-header">
              <h5 className="confirm-modal-title">{confirm.title}</h5>
              <button type="button" className="confirm-modal-close-btn" onClick={confirm.onCancel}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="confirm-modal-body">{confirm.message}</div>
            <div className="confirm-modal-footer">
              <button className="confirm-cancel-btn" onClick={confirm.onCancel}>HỦY</button>
              <button className="confirm-ok-btn confirm-btn-cyan" onClick={confirm.onConfirm}>XÁC NHẬN</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
