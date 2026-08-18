import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let seed = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'info', title) => {
      const id = ++seed;
      setToasts((t) => [...t, { id, message, type, title }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  const toast = useCallback(
    {
      success: (m, t) => push(m, 'success', t),
      error: (m, t) => push(m, 'error', t),
      info: (m, t) => push(m, 'info', t),
      warning: (m, t) => push(m, 'warning', t),
    },
    [push]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-viewport" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} role="status">
            {t.title && <div className="toast__title">{t.title}</div>}
            <div className="toast__msg">{t.message}</div>
            <button className="toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
