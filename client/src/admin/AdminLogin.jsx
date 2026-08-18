import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { ErrorBox, FieldError } from '../components/ui.jsx';

export default function AdminLogin() {
  const { login, user, isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/admin';
  const denied = params.get('denied') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (isAdmin) {
    navigate(next, { replace: true });
    return null;
  }

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      const u = await login(email, password);
      if (u.role !== 'admin') {
        toast.error('This account does not have admin access.');
        setErrors({ form: 'Admin access only. Please use your admin credentials.' });
        return;
      }
      toast.success('Welcome back, Admin!');
      navigate(next, { replace: true });
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-login-wrap">
      <div className="admin-login-card">
        <div className="lock">🔐</div>
        <h1>Admin Portal</h1>
        <p className="sub">Sign in to manage appointments, designs and salon settings.</p>

        {denied && (
          <div className="denied-banner">
            You are signed in as a customer — admin privileges are required to access this area.
          </div>
        )}
        {user && !isAdmin && (
          <div className="denied-banner">
            Signed in as <strong>{user.email}</strong> (customer). Please sign in with an admin account.
          </div>
        )}

        <ErrorBox message={errors.form} />
        <form onSubmit={submit}>
          <div className="field">
            <label>Admin email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="singhharinder662@gmail.com" autoComplete="username" />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign In to Admin'}
          </button>
        </form>
        <div className="auth-switch">
          <Link to="/">← Back to website</Link>
        </div>
      </div>
    </div>
  );
}
