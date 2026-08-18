import { useCallback, useEffect, useRef, useState } from 'react';
import { api, money } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import { ConfirmDialog, FieldError, Modal, PageLoader, Skeleton } from '../components/ui.jsx';
import { fmtDuration } from '../utils/date.js';

const EMPTY = {
  name: '',
  description: '',
  price: '',
  category: 'Gel Nails',
  duration: 60,
  image_url: '',
  is_active: true,
};

const CATEGORY_OPTIONS = [
  'Gel Nails', 'Acrylic Nails', 'Nail Art', 'French Tips', 'Bridal Nails', 'Extensions', 'Custom Designs', 'Minimal Nails',
];

export default function AdminDesigns() {
  const toast = useToast();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null); // null | { id?, ...form }
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filter, setFilter] = useState('all');
  const fileRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    api('/admin/designs')
      .then((d) => setDesigns(d.designs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setErrors({});
    setEditor({ ...EMPTY });
  };

  const openEdit = (d) => {
    setErrors({});
    setEditor({
      id: d.id,
      name: d.name,
      description: d.description,
      price: d.price,
      category: d.category,
      duration: d.duration,
      image_url: d.image_url,
      is_active: Boolean(d.is_active),
    });
  };

  const uploadImage = async (file) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const d = await api('/admin/uploads', { method: 'POST', form });
      // clean up the old uploaded image if replacing
      if (editor?.image_url?.startsWith('/uploads/')) {
        api('/admin/uploads', { method: 'DELETE', body: { url: editor.image_url } }).catch(() => {});
      }
      setEditor((e) => ({ ...e, image_url: d.url }));
      toast.success('Image uploaded.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    if (editor?.image_url?.startsWith('/uploads/')) {
      api('/admin/uploads', { method: 'DELETE', body: { url: editor.image_url } }).catch(() => {});
    }
    setEditor((e) => ({ ...e, image_url: '' }));
  };

  const save = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        name: editor.name,
        description: editor.description,
        price: Number(editor.price),
        category: editor.category,
        duration: Number(editor.duration),
        image_url: editor.image_url,
        is_active: editor.is_active,
      };
      if (editor.id) {
        await api(`/admin/designs/${editor.id}`, { method: 'PUT', body: payload });
        toast.success('Design updated.');
      } else {
        await api('/admin/designs', { method: 'POST', body: payload });
        toast.success('Design created.');
      }
      setEditor(null);
      load();
    } catch (err) {
      if (err.data?.errors) setErrors(err.data.errors);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (d) => {
    try {
      await api(`/admin/designs/${d.id}`, {
        method: 'PUT',
        body: { ...d, is_active: !d.is_active, price: d.price, duration: d.duration },
      });
      toast.success(d.is_active ? 'Design deactivated (hidden from customers).' : 'Design activated.');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const doDelete = async () => {
    try {
      await api(`/admin/designs/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Design deleted.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message);
      setDeleteTarget(null);
    }
  };

  const visible = filter === 'all' ? designs : filter === 'active' ? designs.filter((d) => d.is_active) : designs.filter((d) => !d.is_active);

  return (
    <>
      <div className="dash-head" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Nail Designs</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>Manage your collection — {designs.length} designs total.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Design</button>
      </div>

      <div className="filter-bar">
        {['all', 'active', 'inactive'].map((f) => (
          <button key={f} className={`status-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={340} />
          ))}
        </div>
      ) : (
        <div className="grid">
          {visible.map((d) => (
            <article className="design-card" key={d.id}>
              <div className="design-card__img" style={{ height: 170 }}>
                {d.image_url ? <img src={d.image_url} alt={d.name} /> : <div className="design-card__placeholder">💅</div>}
                <span className="design-card__cat">{d.category}</span>
                {!d.is_active && <span className="design-card__off">Inactive</span>}
              </div>
              <div className="design-card__body">
                <h3>{d.name}</h3>
                <p className="design-card__desc" style={{ fontSize: 13 }}>{d.description}</p>
                <div className="design-card__meta">
                  <span className="design-card__price">{money(d.price)}</span>
                  <span className="design-card__duration">⏱ {fmtDuration(d.duration)}</span>
                </div>
                <div className="row-actions" style={{ marginTop: 6 }}>
                  <button className="btn btn-ghost btn-xs" onClick={() => openEdit(d)}>Edit</button>
                  <button className="btn btn-outline btn-xs" onClick={() => toggleActive(d)}>
                    {d.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="btn btn-danger btn-xs" onClick={() => setDeleteTarget(d)}>Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* editor modal */}
      <Modal open={Boolean(editor)} onClose={() => setEditor(null)} title={editor?.id ? 'Edit Nail Design' : 'Add Nail Design'} wide
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditor(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || uploading}>
              {saving ? 'Saving…' : editor?.id ? 'Save Changes' : 'Create Design'}
            </button>
          </>
        }
      >
        {editor && (
          <form onSubmit={save}>
            <div className="field">
              <label>Design name</label>
              <input className="input" value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} placeholder="Chrome Mirror Shine" />
              <FieldError>{errors.name}</FieldError>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea className="textarea" rows={3} value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} placeholder="Describe the design…" />
              <FieldError>{errors.description}</FieldError>
            </div>
            <div className="grid grid--2" style={{ gap: 14 }}>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Price (USD)</label>
                <input className="input" type="number" min="0" step="0.01" value={editor.price} onChange={(e) => setEditor({ ...editor, price: e.target.value })} />
                <FieldError>{errors.price}</FieldError>
              </div>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Duration (minutes)</label>
                <input className="input" type="number" min="15" max="480" value={editor.duration} onChange={(e) => setEditor({ ...editor, duration: e.target.value })} />
                <FieldError>{errors.duration}</FieldError>
              </div>
            </div>
            <div className="grid grid--2" style={{ gap: 14 }}>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Category</label>
                <select className="select" value={editor.category} onChange={(e) => setEditor({ ...editor, category: e.target.value })}>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <FieldError>{errors.category}</FieldError>
              </div>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Status</label>
                <select className="select" value={editor.is_active ? '1' : '0'} onChange={(e) => setEditor({ ...editor, is_active: e.target.value === '1' })}>
                  <option value="1">Active (visible to customers)</option>
                  <option value="0">Inactive (hidden)</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label>Image</label>
              {editor.image_url ? (
                <div>
                  <img src={editor.image_url} alt="Preview" className="img-preview" />
                  <div className="row-actions mt-1">
                    <button type="button" className="btn btn-outline btn-xs" onClick={() => fileRef.current?.click()}>
                      Replace image
                    </button>
                    <button type="button" className="btn btn-ghost btn-xs" onClick={removeImage}>
                      Remove image
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="upload-zone" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <span className="up-icon">🖼️</span>
                  {uploading ? 'Uploading…' : 'Click to upload an image (JPG, PNG, WebP, GIF · max 5 MB)'}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(f);
                  e.target.value = '';
                }}
              />
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Are you sure you want to delete this nail design?"
        message={`"${deleteTarget?.name}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete Design"
        danger
      />
    </>
  );
}
