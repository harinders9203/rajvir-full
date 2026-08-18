import { useEffect } from 'react';
import { Link } from 'react-router-dom';

/* ---------------------------------- badges ---------------------------------- */

const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function StatusBadge({ status }) {
  return <span className={`badge badge--${status}`}>{STATUS_LABELS[status] || status}</span>;
}

export function TypeIcon({ type }) {
  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '🚫' };
  return <span className="ntf-icon">{icons[type] || 'ℹ️'}</span>;
}

/* ---------------------------------- modal ---------------------------------- */

export function Modal({ open, onClose, title, children, wide, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__head">
          <h3>{title}</h3>
          <button className="modal__x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Delete', danger }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted">{message}</p>
    </Modal>
  );
}

/* ---------------------------------- loading ---------------------------------- */

export function Spinner({ label }) {
  return (
    <div className="spinner-wrap">
      <span className="spinner" />
      {label && <span className="spinner-label">{label}</span>}
    </div>
  );
}

export function Skeleton({ height = 220 }) {
  return <div className="skeleton" style={{ height }} />;
}

export function PageLoader() {
  return (
    <div className="page-loader">
      <Spinner label="Loading…" />
    </div>
  );
}

/* ---------------------------------- empty state ---------------------------------- */

export function EmptyState({ icon = '🌸', title, message, cta, to, onCta }) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <h3>{title}</h3>
      {message && <p className="muted">{message}</p>}
      {cta &&
        (to ? (
          <Link className="btn btn-primary" to={to}>
            {cta}
          </Link>
        ) : (
          <button className="btn btn-primary" onClick={onCta}>
            {cta}
          </button>
        ))}
    </div>
  );
}

/* ---------------------------------- errors ---------------------------------- */

export function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div className="error-box" role="alert">
      {message}
    </div>
  );
}

export function FieldError({ children }) {
  if (!children) return null;
  return <span className="field-error">{children}</span>;
}
