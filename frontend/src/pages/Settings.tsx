import { useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import RBLogo from '../components/RBLogo';
import { Upload } from 'lucide-react';

const DEFAULTS = {
  company_name: 'RICHBECKS Enterprise',
  tagline: 'Managing Fabrics. Growing Business.',
  phone_1: '0243262888',
  phone_2: '0202442373',
  address: 'Poly/Stu Roundabout to VRA Road, Opp. Social Welfare School Main Gate',
  currency: 'GHC',
  owner_whatsapp: '',
};

export default function Settings() {
  const [form, setForm] = useState<any>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'general'))
      .then((snap) => {
        if (snap.exists()) setForm({ ...DEFAULTS, ...snap.data() });
      })
      .catch(() => {
        // If the read fails (offline, rules issue, etc.) just keep defaults —
        // never let this page crash the app.
      });
  }, []);

  async function save() {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), form, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setUploadError(err.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file (PNG, JPG, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be smaller than 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileRef = ref(storage, `branding/logo-${Date.now()}.${file.name.split('.').pop()}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      const updated = { ...form, logo_url: url };
      setForm(updated);
      await setDoc(doc(db, 'settings', 'general'), updated, { merge: true });
    } catch (err: any) {
      setUploadError(
        err.code === 'storage/unauthorized'
          ? 'Only the Owner account can upload the logo.'
          : err.message || 'Upload failed — please try again.'
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="rb-card flex flex-col items-center text-center">
        <RBLogo size={80} />
        <h3 className="font-display font-bold text-charcoal mt-4">{form.company_name}</h3>
        <p className="text-xs text-gray-400">{form.tagline}</p>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
        <label
          htmlFor="logo-upload"
          className="mt-5 flex items-center gap-2 border border-gold text-gold-dark rounded-lg px-4 py-2 text-sm font-medium cursor-pointer hover:bg-gold/5 active:scale-95 transition-transform"
        >
          <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload Real Logo'}
        </label>
        {uploadError && <p className="text-red-500 text-xs mt-2">{uploadError}</p>}
        <p className="text-xs text-gray-400 mt-4">
          Upload the actual Richbecks Enterprise logo (PNG/JPG, under 5MB). It will replace the
          placeholder badge everywhere — login, dashboard, receipts, and reports.
        </p>
      </div>

      <div className="rb-card lg:col-span-2 space-y-3">
        <h3 className="font-display font-bold text-charcoal mb-2">Company Information</h3>
        <Field label="Company name" value={form.company_name} onChange={(v: string) => setForm({ ...form, company_name: v })} />
        <Field label="Tagline" value={form.tagline} onChange={(v: string) => setForm({ ...form, tagline: v })} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Phone 1" value={form.phone_1} onChange={(v: string) => setForm({ ...form, phone_1: v })} />
          <Field label="Phone 2" value={form.phone_2} onChange={(v: string) => setForm({ ...form, phone_2: v })} />
        </div>
        <Field label="Address" value={form.address} onChange={(v: string) => setForm({ ...form, address: v })} />
        <Field label="Currency label" value={form.currency} onChange={(v: string) => setForm({ ...form, currency: v })} />

        <div>
          <label className="text-xs font-medium text-gray-500">Owner WhatsApp Number (for sale alerts)</label>
          <input
            value={form.owner_whatsapp}
            onChange={(e) => setForm({ ...form, owner_whatsapp: e.target.value })}
            placeholder="233243262888"
            className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
          />
          <p className="text-xs text-gray-400 mt-1">
            Country code + number, no spaces, no "+" and no leading 0 — e.g. a Ghana number
            0243 262 888 becomes <span className="font-mono">233243262888</span>. Leave blank to
            turn off WhatsApp sale alerts.
          </p>
        </div>

        <button onClick={save} disabled={saving} className="bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg px-5 py-2.5 text-sm disabled:opacity-50 active:scale-95 transition-transform">
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
    </div>
  );
}
