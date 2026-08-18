import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { ErrorBox, FieldError } from '../components/ui.jsx';
import { useSiteData } from '../hooks/useSiteData.js';
import { getBrandName } from '../utils/branding.js';

const TITLES = {
  login: 'Welcome Back',
  signup: 'Create Your Account',
  forgot: 'Reset Your Password',
  reset: 'Set a New Password',
};

const SUBS = {
  login: 'Sign in to book appointments and track your requests.',
  signup: 'Join Blush to book, track and manage your nail appointments.',
  forgot: "Enter your email and we'll send you a reset link.",
  reset: 'Choose a new password for your account.',
};

export default function AuthPage({ mode }) {
  const { login, signup } = useAuth();
  const { settings } = useSiteData();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const brandName = getBrandName(settings?.salon_name);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    token: params.get('token') || '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Welcome back! You are signed in.');
        navigate(next, { replace: true });
      } else if (mode === 'signup') {
        await signup({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          confirm_password: form.confirm_password,
        });
        toast.success('Your account is ready — let us find you the perfect set!');
        navigate(next, { replace: true });
      } else if (mode === 'forgot') {
        await api('/auth/forgot-password', { method: 'POST', body: { email: form.email } });
        setSent(true);
      } else if (mode === 'reset') {
        await api('/auth/reset-password', {
          method: 'POST',
          body: { token: form.token, password: form.password, confirm_password: form.confirm_password },
        });
        toast.success('Password updated. Sign in with your new password.');
        navigate('/login', { replace: true });
      }
    } catch (err) {
      if (err.data?.errors) {
        setErrors(err.data.errors);
      } else {
        setErrors({ form: err.message });
      }
    } finally {
      setBusy(false);
    }
  };

  const heading = TITLES[mode] || 'Welcome';
  const sub = mode === 'signup' ? `Join ${brandName} to book, track and manage your nail appointments.` : SUBS[mode] || '';

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span className="brand__mark" style={{ margin: '0 auto 14px', width: 52, height: 52, fontSize: 26 }}>
            ✿
          </span>
        </div>
        <h1>{heading}</h1>
        <p className="auth-sub">{sub}</p>

        <ErrorBox message={errors.form} />
        {mode === 'forgot' && sent && (
          <div className="success-box">
            If an account exists for that email, a reset link has been sent. (In this demo, check the server
            console for the link.)
          </div>
        )}

        <form onSubmit={submit} noValidate>
          {mode === 'signup' && (
            <>
              <div className="field">
                <label>Full name</label>
                <input className="input" value={form.name} onChange={set('name')} placeholder="Jane Doe" autoComplete="name" />
                <FieldError>{errors.name}</FieldError>
              </div>
              <div className="field">
                <label>Phone number</label>
                <input className="input" value={form.phone} onChange={set('phone')} placeholder="+1 (555) 000-0000" autoComplete="tel" />
                <FieldError>{errors.phone}</FieldError>
              </div>
            </>
          )}
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
            <FieldError>{errors.email}</FieldError>
          </div>
          {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              <FieldError>{errors.password}</FieldError>
            </div>
          )}
          {(mode === 'signup' || mode === 'reset') && (
            <div className="field">
              <label>Confirm password</label>
              <input className="input" type="password" value={form.confirm_password} onChange={set('confirm_password')} placeholder="••••••••" autoComplete="new-password" />
              <FieldError>{errors.confirm_password}</FieldError>
            </div>
          )}
          {mode === 'signup' && <p className="password-hint">Minimum 8 characters.</p>}

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Link' : 'Update Password'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' && (
            <>
              <Link to="/forgot-password">Forgot password?</Link>
              <br />
              New here? <Link to="/signup">Create an account</Link>
            </>
          )}
          {mode === 'signup' && (
            <>
              Already have an account? <Link to="/login">Sign in</Link>
            </>
          )}
          {(mode === 'forgot' || mode === 'reset') && (
            <Link to="/login">← Back to sign in</Link>
          )}
        </div>
      </div>
    </div>
  );
}
