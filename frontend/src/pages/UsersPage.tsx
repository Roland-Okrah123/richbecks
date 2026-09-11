import { useEffect, useState } from 'react';
import { getAll, createStaffUserFn, setUserStatusFn } from '../api/firestore';
import { Plus, X } from 'lucide-react';

const ROLES = ['owner', 'manager', 'cashier', 'store_keeper', 'accountant'];

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', username: '', email: '', phone: '', password: '', role: 'cashier' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function refresh() { getAll('users').then(setUsers).catch(() => {}); }
  useEffect(refresh, []);

  async function save() {
    setSaving(true); setError('');
    try {
      await createStaffUserFn(form);
      setShowForm(false);
      setForm({ full_name: '', username: '', email: '', phone: '', password: '', role: 'cashier' });
      refresh();
    } catch (err: any) {
      setError(err.message || 'Could not create user');
    } finally { setSaving(false); }
  }

  async function toggleStatus(uid: string, current: boolean) {
    await setUserStatusFn({ uid, is_active: !current });
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg px-4 py-2.5 text-sm">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      <div className="rb-card overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="text-left text-gray-400 text-xs uppercase border-b">
              <th className="pb-3">Name</th>
              <th className="pb-3">Username</th>
              <th className="pb-3">Role</th>
              <th className="pb-3">Status</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="py-3 font-medium text-charcoal">{u.full_name}</td>
                <td className="py-3 text-gray-500">{u.username}</td>
                <td className="py-3 capitalize">{u.role?.replace('_', ' ')}</td>
                <td className="py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${u.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                    {u.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <button onClick={() => toggleStatus(u.id, u.is_active)} className="text-xs text-gold-dark font-medium">
                    {u.is_active ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-8">No staff accounts yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-6 w-full sm:max-w-sm max-h-[92vh] overflow-y-auto relative">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-gray-400"><X size={18} /></button>
            <h3 className="font-display font-bold text-charcoal mb-4">Add Staff Account</h3>
            <input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
            <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
            <input placeholder="Temporary password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mb-4">
              {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
            {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
            <button onClick={save} disabled={saving || !form.full_name || !form.email || !form.password} className="w-full bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg py-2.5 disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Account'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
