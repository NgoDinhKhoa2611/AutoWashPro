import React from 'react';

export const Modal = ({ isOpen, onClose, title, children, footer, maxWidth = '500px' }) => {
  if (!isOpen) return null;
  return (
    <div className="confirm-modal-backdrop show" style={{ display: 'flex', zIndex: 1050 }}>
      <div className="confirm-modal-card animate-confirm-in" style={{ maxWidth, width: '100%', borderRadius: '24px' }}>
        <div className="confirm-modal-header border-bottom pb-2">
          <h5 className="confirm-modal-title text-dark fw-bold">{title}</h5>
          <button type="button" className="confirm-modal-close-btn" onClick={onClose} aria-label="Close modal">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="confirm-modal-body py-3">
          {children}
        </div>
        {footer && (
          <div className="confirm-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
