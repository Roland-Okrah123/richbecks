import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  listFabrics,
  listCategories,
  createFabric,
  updateFabric,
  listSuppliers,
} from '../api/firestore';
import { Fabric } from '../types';
import { Plus, X, Search, Pencil } from 'lucide-react';

const fmt = (n: number) =>
  `GH₵ ${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const emptyForm = {
  name: '',
  category_id: '',
  material_type: '',
  color_number: '',
  color: '',
  design_pattern: '',
  width: '',
  supplier_id: '',

  // IMPORTANT:
  // Numeric form values start empty so the user can type freely.
  purchase_price_yard: '',
  selling_price_yard: '',
  total_yards_purchased: '',
  minimum_stock_level: '',

  storage_location: '',
  notes: '',
};

export default function Inventory() {
  const [params] = useSearchParams();

  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const [search, setSearch] = useState(
    params.get('q') || ''
  );

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Fabric | null>(null);
  const [form, setForm] = useState<any>({
    ...emptyForm,
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function refresh() {
    setLoading(true);

    listFabrics()
      .then((r) => setFabrics(r as Fabric[]))
      .catch(() =>
        setError(
          'Could not load inventory. Check your connection and try again.'
        )
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();

    listCategories()
      .then((r) => setCategories(r))
      .catch(() => setCategories([]));

    listSuppliers()
      .then((r) => setSuppliers(r))
      .catch(() => setSuppliers([]));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return fabrics;

    return fabrics.filter((f) =>
      [
        f.name,
        f.material_type,
        f.color_number,
        f.color,
        f.category_name,
      ].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(q)
      )
    );
  }, [fabrics, search]);

  function openNew() {
    setError('');
    setEditing(null);

    setForm({
      ...emptyForm,
      minimum_stock_level: 20,
    });

    setShowForm(true);
  }

  function openEdit(f: Fabric) {
    setError('');
    setEditing(f);

    /*
     * Convert existing database numeric values into numbers,
     * but never force a missing value to 0.01.
     */
    setForm({
      ...f,

      purchase_price_yard:
        f.purchase_price_yard ?? '',

      selling_price_yard:
        f.selling_price_yard ?? '',

      total_yards_purchased:
        f.total_yards_purchased ?? '',

      minimum_stock_level:
        f.minimum_stock_level ?? '',
    });

    setShowForm(true);
  }

  async function save() {
    setError('');

    if (!form.name?.trim()) {
      setError('Fabric name is required.');
      return;
    }

    /*
     * Convert only when saving.
     * During editing the fields are allowed to be empty.
     */
    const purchasePrice =
      form.purchase_price_yard === ''
        ? NaN
        : Number(form.purchase_price_yard);

    const sellingPrice =
      form.selling_price_yard === ''
        ? NaN
        : Number(form.selling_price_yard);

    const totalYards =
      form.total_yards_purchased === ''
        ? NaN
        : Number(form.total_yards_purchased);

    const minimumStock =
      form.minimum_stock_level === ''
        ? NaN
        : Number(form.minimum_stock_level);

    /*
     * Validate purchase price.
     */
    if (
      !Number.isFinite(purchasePrice) ||
      purchasePrice < 0
    ) {
      setError(
        'Enter a valid purchase price per yard.'
      );
      return;
    }

    /*
     * Validate selling price.
     */
    if (
      !Number.isFinite(sellingPrice) ||
      sellingPrice <= 0
    ) {
      setError(
        'Selling price per yard must be greater than zero.'
      );
      return;
    }

    /*
     * Validate minimum stock.
     */
    if (
      !Number.isFinite(minimumStock) ||
      minimumStock < 0
    ) {
      setError(
        'Enter a valid minimum stock level.'
      );
      return;
    }

    /*
     * New fabrics must have an opening stock quantity.
     */
    if (
      !editing &&
      (!Number.isFinite(totalYards) ||
        totalYards <= 0)
    ) {
      setError(
        'Total yards purchased must be greater than zero.'
      );
      return;
    }

    setSaving(true);

    /*
     * Convert values to proper numbers ONLY here,
     * immediately before sending them to Firestore.
     */
    const clean = {
      ...form,

      name: String(form.name).trim(),

      material_type: String(
        form.material_type || ''
      ).trim(),

      color_number: String(
        form.color_number || ''
      ).trim(),

      color: String(
        form.color || ''
      ).trim(),

      design_pattern: String(
        form.design_pattern || ''
      ).trim(),

      width: String(
        form.width || ''
      ).trim(),

      storage_location: String(
        form.storage_location || ''
      ).trim(),

      notes: String(
        form.notes || ''
      ).trim(),

      purchase_price_yard: purchasePrice,

      selling_price_yard: sellingPrice,

      minimum_stock_level: minimumStock,

      ...(editing
        ? {}
        : {
            total_yards_purchased: totalYards,
          }),
    };

    try {
      if (editing) {
        await updateFabric(
          editing.id,
          clean
        );
      } else {
        await createFabric(clean);
      }

      setShowForm(false);
      setError('');
      refresh();
    } catch (err: any) {
      setError(
        err?.message ||
          'Could not save fabric'
      );
    } finally {
      setSaving(false);
    }
  }

  function StatusBadge({
    f,
  }: {
    f: Fabric;
  }) {
    const low =
      f.remaining_yards <=
      f.minimum_stock_level;

    return (
      <span
        className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
          low
            ? 'bg-red-50 text-red-500'
            : 'bg-emerald-50 text-emerald-600'
        }`}
      >
        {low ? 'Low Stock' : 'In Stock'}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2.5 border w-full sm:w-80">
          <Search
            size={16}
            className="text-gray-400 shrink-0"
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search name, type, color or color number..."
            className="outline-none text-sm flex-1 min-w-0"
          />
        </div>

        <button
          onClick={openNew}
          className="flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg px-4 py-2.5 text-sm active:scale-95 transition-transform shrink-0"
        >
          <Plus size={16} />
          Add Fabric
        </button>
      </div>

      {error && (
        <p className="text-red-500 text-sm">
          {error}
        </p>
      )}

      {loading && (
        <p className="text-gray-400 text-sm">
          Loading inventory…
        </p>
      )}

      {/* Mobile: card list */}
      <div className="sm:hidden space-y-3">
        {!loading &&
          filtered.map((f) => (
            <button
              key={f.id}
              onClick={() => openEdit(f)}
              className="w-full text-left rb-card flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-semibold text-charcoal truncate">
                  {f.name}
                </div>

                <div className="text-xs text-gray-400">
                  {f.material_type ||
                    f.category_name ||
                    '—'}{' '}
                  · {f.color || 'No color'}{' '}
                  {f.color_number
                    ? `· #${f.color_number}`
                    : ''}
                </div>

                <div className="text-xs text-gray-400">
                  {f.remaining_yards} yds ·{' '}
                  {fmt(
                    f.selling_price_yard
                  )}
                  /yd
                </div>
              </div>

              <StatusBadge f={f} />
            </button>
          ))}

        {!loading &&
          filtered.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">
              No fabrics yet — add your first one.
            </p>
          )}
      </div>

      {/* Desktop/tablet: table */}
      <div className="hidden sm:block rb-card overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-gray-400 text-xs uppercase border-b">
              <th className="pb-3">
                Fabric
              </th>
              <th className="pb-3">
                Type
              </th>
              <th className="pb-3">
                Color / No.
              </th>
              <th className="pb-3">
                Available (yds)
              </th>
              <th className="pb-3">
                Cost/yd
              </th>
              <th className="pb-3">
                Sell/yd
              </th>
              <th className="pb-3">
                Status
              </th>
              <th className="pb-3"></th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((f) => (
              <tr
                key={f.id}
                className="border-b last:border-0"
              >
                <td className="py-3 font-medium text-charcoal">
                  {f.name}
                </td>

                <td className="py-3 text-gray-500">
                  {f.material_type ||
                    f.category_name ||
                    '—'}
                </td>

                <td className="py-3 text-gray-500">
                  {f.color || '—'}
                  {f.color_number
                    ? ` · #${f.color_number}`
                    : ''}
                </td>

                <td className="py-3">
                  {f.remaining_yards}
                </td>

                <td className="py-3">
                  {fmt(
                    f.purchase_price_yard
                  )}
                </td>

                <td className="py-3">
                  {fmt(
                    f.selling_price_yard
                  )}
                </td>

                <td className="py-3">
                  <StatusBadge f={f} />
                </td>

                <td className="py-3 text-right">
                  <button
                    onClick={() =>
                      openEdit(f)
                    }
                    className="text-gray-400 hover:text-gold-dark p-1"
                  >
                    <Pencil size={15} />
                  </button>
                </td>
              </tr>
            ))}

            {!loading &&
              filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center text-gray-400 py-8"
                  >
                    No fabrics yet — add your first one.
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-6 w-full sm:max-w-lg max-h-[92vh] overflow-y-auto relative">
            <button
              onClick={() =>
                setShowForm(false)
              }
              className="absolute top-4 right-4 text-gray-400 p-1"
            >
              <X size={18} />
            </button>

            <h3 className="font-display font-bold text-charcoal mb-4">
              {editing
                ? 'Edit Fabric'
                : 'Add Fabric'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Fabric name"
                value={form.name}
                onChange={(v) =>
                  setForm({
                    ...form,
                    name: v,
                  })
                }
                full
              />

              <Field
                label="Category"
                as="select"
                value={form.category_id}
                onChange={(v) =>
                  setForm({
                    ...form,
                    category_id: v,
                  })
                }
                options={[
                  {
                    value: '',
                    label: 'Select...',
                  },
                  ...categories.map(
                    (c) => ({
                      value: c.id,
                      label: c.name,
                    })
                  ),
                ]}
              />

              <Field
                label="Material type"
                value={form.material_type}
                onChange={(v) =>
                  setForm({
                    ...form,
                    material_type: v,
                  })
                }
              />

              <Field
                label="Color number / code"
                value={form.color_number}
                onChange={(v) =>
                  setForm({
                    ...form,
                    color_number: v,
                  })
                }
              />

              <Field
                label="Color"
                value={form.color}
                onChange={(v) =>
                  setForm({
                    ...form,
                    color: v,
                  })
                }
              />

              <Field
                label="Design/pattern"
                value={form.design_pattern}
                onChange={(v) =>
                  setForm({
                    ...form,
                    design_pattern: v,
                  })
                }
              />

              <Field
                label="Width"
                value={form.width}
                onChange={(v) =>
                  setForm({
                    ...form,
                    width: v,
                  })
                }
              />

              <Field
                label="Supplier"
                as="select"
                value={form.supplier_id}
                onChange={(v) =>
                  setForm({
                    ...form,
                    supplier_id: v,
                  })
                }
                options={[
                  {
                    value: '',
                    label: 'Select...',
                  },
                  ...suppliers.map(
                    (s) => ({
                      value: s.id,
                      label: s.name,
                    })
                  ),
                ]}
              />

              <Field
                label="Storage location"
                value={form.storage_location}
                onChange={(v) =>
                  setForm({
                    ...form,
                    storage_location: v,
                  })
                }
              />

              {/* FIXED NUMERIC INPUTS */}

              <Field
                label="Purchase price/yd"
                type="number"
                value={form.purchase_price_yard}
                onChange={(v) =>
                  setForm({
                    ...form,
                    purchase_price_yard:
                      v === ''
                        ? ''
                        : Number(v),
                  })
                }
              />

              <Field
                label="Selling price / yard"
                type="number"
                value={form.selling_price_yard}
                onChange={(v) =>
                  setForm({
                    ...form,
                    selling_price_yard:
                      v === ''
                        ? ''
                        : Number(v),
                  })
                }
              />

              {!editing && (
                <Field
                  label="Total yards purchased"
                  type="number"
                  value={
                    form.total_yards_purchased
                  }
                  onChange={(v) =>
                    setForm({
                      ...form,
                      total_yards_purchased:
                        v === ''
                          ? ''
                          : Number(v),
                    })
                  }
                />
              )}

              <Field
                label="Minimum stock level"
                type="number"
                value={
                  form.minimum_stock_level
                }
                onChange={(v) =>
                  setForm({
                    ...form,
                    minimum_stock_level:
                      v === ''
                        ? ''
                        : Number(v),
                  })
                }
              />

              <Field
                label="Notes"
                value={form.notes}
                onChange={(v) =>
                  setForm({
                    ...form,
                    notes: v,
                  })
                }
                full
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs mt-3">
                {error}
              </p>
            )}

            <button
              onClick={save}
              disabled={
                saving || !form.name
              }
              className="w-full mt-5 bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg py-3 sm:py-2.5 disabled:opacity-50 active:scale-95 transition-transform"
            >
              {saving
                ? 'Saving…'
                : editing
                ? 'Save Changes'
                : 'Add Fabric'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  full = false,
  as = 'input',
  options = [],
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
  full?: boolean;
  as?: string;
  options?: any[];
}) {
  return (
    <div
      className={
        full ? 'sm:col-span-2' : ''
      }
    >
      <label className="text-xs font-medium text-gray-500">
        {label}
      </label>

      {as === 'select' ? (
        <select
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm mt-1"
        >
          {options.map((o: any) => (
            <option
              key={o.value}
              value={o.value}
            >
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm mt-1"
        />
      )}
    </div>
  );
}