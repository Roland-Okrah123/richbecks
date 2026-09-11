import { useEffect, useMemo, useState } from 'react';
import { listFabrics, listCustomers, createSaleFn, createCustomer } from '../api/firestore';
import { receiptPDF, printReceipt } from '../utils/pdf';
import { Fabric, Customer } from '../types';
import { Search, Trash2, Plus, X, Printer, FileDown } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface CartLine {
  fabric: Fabric;
  yards: number | '';
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'mtn_momo', label: 'MTN Mobile Money' },
  { value: 'vodafone_cash', label: 'Vodafone Cash' },
  { value: 'airteltigo_money', label: 'AirtelTigo Money' },
  { value: 'bank', label: 'Bank Payment' },
];

const fmt = (n: number) =>
  `GH₵ ${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const qty = (n: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export default function POS() {
  const settings = useSettings();

  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);

  // Keep numeric inputs as strings/numbers while editing.
  // This allows the user to completely clear an input.
  const [discount, setDiscount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerId, setCustomerId] = useState('');
  const [amountPaid, setAmountPaid] = useState<string>('');

  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listFabrics()
      .then((rows) => setFabrics(rows as Fabric[]))
      .catch(() => setError('Could not load fabrics.'));

    listCustomers()
      .then((rows) => setCustomers(rows as Customer[]))
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return fabrics.filter((f) => {
      if (f.remaining_yards <= 0) return false;

      if (!q) return true;

      return [
        f.name,
        f.material_type,
        f.color_number,
        f.color,
        f.category_name,
      ].some((value) =>
        String(value || '').toLowerCase().includes(q)
      );
    });
  }, [fabrics, search]);

  /*
   * Empty yard fields are treated as zero ONLY for calculations.
   * The actual input remains empty so the user can type freely.
   */
  const subtotal = cart.reduce(
    (sum, line) =>
      sum +
      (line.yards === '' ? 0 : line.yards) *
        line.fabric.selling_price_yard,
    0
  );

  const discountValue = discount === '' ? 0 : discount;

  const safeDiscount = Math.min(
    Math.max(0, discountValue),
    subtotal
  );

  const total = Math.max(0, subtotal - safeDiscount);

  const parsedPaid =
    amountPaid === '' ? total : Number(amountPaid);

  const paid = Number.isFinite(parsedPaid)
    ? Math.max(0, parsedPaid)
    : 0;

  const balanceDue = Math.max(0, total - paid);
  const change = Math.max(0, paid - total);

  function addToCart(fabric: Fabric) {
    setError('');

    setCart((current) => {
      const existing = current.find(
        (line) => line.fabric.id === fabric.id
      );

      if (existing) {
        const currentYards =
          existing.yards === '' ? 0 : existing.yards;

        const next = Math.min(
          fabric.remaining_yards,
          currentYards + 1
        );

        return current.map((line) =>
          line.fabric.id === fabric.id
            ? { ...line, yards: next }
            : line
        );
      }

      return [
        ...current,
        {
          fabric,
          yards: Math.min(1, fabric.remaining_yards),
        },
      ];
    });
  }

  /*
   * IMPORTANT:
   * When the input is cleared, we store ''.
   * We do NOT force 0.01 back into the field.
   */
  function updateYards(
    fabricId: string,
    yards: number | ''
  ) {
    const fabric = fabrics.find(
      (f) => f.id === fabricId
    );

    if (!fabric) return;

    setCart((current) =>
      current.map((line) => {
        if (line.fabric.id !== fabricId) {
          return line;
        }

        if (yards === '') {
          return {
            ...line,
            yards: '',
          };
        }

        return {
          ...line,
          yards: Math.min(
            fabric.remaining_yards,
            yards
          ),
        };
      })
    );
  }

  function removeLine(fabricId: string) {
    setCart((current) =>
      current.filter(
        (line) => line.fabric.id !== fabricId
      )
    );
  }

  async function handleCreateCustomer() {
    if (!newCustomerName.trim()) return;

    try {
      setError('');

      const ref = await createCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
      });

      const newCust = {
        id: ref.id,
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
        total_spent: 0,
        credit_balance: 0,
      };

      setCustomers((current) => [
        newCust,
        ...current,
      ]);

      setCustomerId(ref.id);
      setShowNewCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } catch (err: any) {
      setError(
        err?.message || 'Could not create customer'
      );
    }
  }

  async function completeSale() {
    if (cart.length === 0 || busy) return;

    setError('');

    /*
     * Do not allow an empty yard field to be submitted.
     */
    const invalidYards = cart.some(
      (line) =>
        line.yards === '' ||
        !Number.isFinite(Number(line.yards)) ||
        Number(line.yards) <= 0
    );

    if (invalidYards) {
      setError(
        'Enter a valid number of yards for every item.'
      );
      return;
    }

    if (discountValue > subtotal) {
      setError(
        'Discount cannot be greater than the subtotal.'
      );
      return;
    }

    if (
      amountPaid !== '' &&
      (!Number.isFinite(Number(amountPaid)) ||
        Number(amountPaid) < 0)
    ) {
      setError('Enter a valid amount paid.');
      return;
    }

    if (balanceDue > 0 && !customerId) {
      setError(
        'Select a customer before completing a sale with an outstanding balance.'
      );
      return;
    }

    setBusy(true);

    try {
      const result = await createSaleFn({
        customer_id: customerId || null,

        items: cart.map((line) => ({
          fabric_id: line.fabric.id,
          yards: Number(line.yards),
        })),

        discount: safeDiscount,
        amount_paid: paid,
        payment_method: paymentMethod,
      });

      const data = result.data as any;

      const selectedCustomer =
        customers.find(
          (customer) => customer.id === customerId
        ) || null;

      const receiptData = {
        ...data,

        items: (
          data.items ||
          cart.map((line) => ({
            fabric: line.fabric,
            yards: Number(line.yards),
            price_per_yard:
              line.fabric.selling_price_yard,
            amount:
              Number(line.yards) *
              line.fabric.selling_price_yard,
          }))
        ).map((item: any) => ({
          ...item,

          fabric:
            item.fabric || {
              name: item.fabric_name,
              material_type: item.material_type,
              color_number: item.color_number,
              color: item.color,
              selling_price_yard:
                item.price_per_yard,
            },
        })),

        customer: selectedCustomer,
        paymentMethod,
        company: settings,
      };

      setReceipt(receiptData);

      setCart([]);
      setDiscount('');
      setAmountPaid('');
      setCustomerId('');

      listFabrics()
        .then((rows) =>
          setFabrics(rows as Fabric[])
        )
        .catch(() => {});
    } catch (err: any) {
      setError(
        err?.message || 'Could not complete sale'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 rb-card">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2.5 mb-4">
          <Search
            size={16}
            className="text-gray-400"
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search name, type, color or color number..."
            className="bg-transparent outline-none text-sm flex-1"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
          {filtered.map((f) => (
            <button
              key={f.id}
              onClick={() => addToCart(f)}
              className="text-left border rounded-lg p-3 hover:border-gold hover:shadow-goldGlow transition-all"
            >
              <div className="w-full h-20 rounded-md bg-gray-100 mb-2 flex items-center justify-center overflow-hidden">
                {f.image_url ? (
                  <img
                    src={f.image_url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-400">
                    No image
                  </span>
                )}
              </div>

              <div className="text-sm font-semibold text-charcoal truncate">
                {f.name}
              </div>

              <div className="text-xs text-gray-500 truncate">
                {f.material_type ||
                  f.category_name ||
                  'Material'}
                {f.color
                  ? ` · ${f.color}`
                  : ''}
                {f.color_number
                  ? ` · #${f.color_number}`
                  : ''}
              </div>

              <div className="text-xs text-gray-500 mt-1">
                {fmt(f.selling_price_yard)}/yd ·{' '}
                {qty(f.remaining_yards)} yds left
              </div>
            </button>
          ))}

          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 col-span-full py-8 text-center">
              No materials found.
            </p>
          )}
        </div>
      </div>

      <div className="rb-card flex flex-col">
        <h3 className="font-display font-bold text-charcoal mb-3">
          Current Order
        </h3>

        <div className="flex-1 space-y-2 max-h-64 overflow-y-auto mb-3">
          {cart.length === 0 && (
            <p className="text-sm text-gray-400 py-6 text-center">
              Cart is empty — tap a material to add it.
            </p>
          )}

          {cart.map((line) => {
            const lineYards =
              line.yards === '' ? 0 : line.yards;

            const lineAmount =
              lineYards *
              line.fabric.selling_price_yard;

            return (
              <div
                key={line.fabric.id}
                className="text-sm border-b pb-2"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-charcoal truncate">
                      {line.fabric.name}
                    </div>

                    <div className="text-xs text-gray-400 truncate">
                      {line.fabric.material_type ||
                        line.fabric.category_name ||
                        'Material'}{' '}
                      ·{' '}
                      {line.fabric.color ||
                        'No color'}
                      {line.fabric.color_number
                        ? ` · #${line.fabric.color_number}`
                        : ''}
                    </div>

                    <div className="text-xs text-gray-400">
                      {fmt(
                        line.fabric
                          .selling_price_yard
                      )}
                      /yd
                    </div>
                  </div>

                  <input
                    aria-label={`Yards of ${line.fabric.name}`}
                    type="number"
                    min={0}
                    max={line.fabric.remaining_yards}
                    step={0.01}
                    value={line.yards}
                    onChange={(e) =>
                      updateYards(
                        line.fabric.id,
                        e.target.value === ''
                          ? ''
                          : Number(e.target.value)
                      )
                    }
                    className="w-20 border rounded px-2 py-1 text-xs"
                  />

                  <span className="w-20 text-right font-semibold text-charcoal text-xs">
                    {fmt(lineAmount)}
                  </span>

                  <button
                    onClick={() =>
                      removeLine(line.fabric.id)
                    }
                    className="text-gray-300 hover:text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-500">
              Customer (optional for fully paid sales)
            </label>

            <button
              onClick={() =>
                setShowNewCustomer(true)
              }
              className="text-xs text-gold-dark flex items-center gap-1"
            >
              <Plus size={12} /> New
            </button>
          </div>

          <select
            value={customerId}
            onChange={(e) =>
              setCustomerId(e.target.value)
            }
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">
              Walk-in customer
            </option>

            {customers.map((c) => (
              <option
                key={c.id}
                value={c.id}
              >
                {c.name}{' '}
                {c.phone
                  ? `· ${c.phone}`
                  : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="text-xs font-medium text-gray-500">
              Discount (GH₵)
            </label>

            <input
              type="number"
              min={0}
              max={subtotal}
              step={0.01}
              value={discount}
              onChange={(e) =>
                setDiscount(
                  e.target.value === ''
                    ? ''
                    : Number(e.target.value)
                )
              }
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">
              Amount Paid
            </label>

            <input
              type="number"
              min={0}
              step={0.01}
              placeholder={total.toFixed(2)}
              value={amountPaid}
              onChange={(e) =>
                setAmountPaid(e.target.value)
              }
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="text-xs font-medium text-gray-500">
            Payment Method
          </label>

          <select
            value={paymentMethod}
            onChange={(e) =>
              setPaymentMethod(e.target.value)
            }
            className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
          >
            {PAYMENT_METHODS.map((method) => (
              <option
                key={method.value}
                value={method.value}
              >
                {method.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1 text-sm border-t pt-3">
          <div className="flex justify-between">
            <span className="text-gray-500">
              Subtotal
            </span>
            <span>{fmt(subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">
              Discount
            </span>
            <span>
              -{fmt(safeDiscount)}
            </span>
          </div>

          <div className="flex justify-between font-bold text-charcoal text-base">
            <span>Total</span>
            <span>{fmt(total)}</span>
          </div>

          {change > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Change</span>
              <span>{fmt(change)}</span>
            </div>
          )}

          {balanceDue > 0 && (
            <div className="flex justify-between text-red-500 text-xs">
              <span>Balance (credit)</span>
              <span>{fmt(balanceDue)}</span>
            </div>
          )}
        </div>

        {error && (
          <p className="text-red-500 text-xs mt-2">
            {error}
          </p>
        )}

        <button
          onClick={completeSale}
          disabled={
            busy || cart.length === 0
          }
          className="w-full mt-4 bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg py-3 disabled:opacity-50"
        >
          {busy
            ? 'Processing…'
            : 'Complete Sale'}
        </button>
      </div>

      {showNewCustomer && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-6 w-full sm:max-w-sm relative">
            <button
              onClick={() =>
                setShowNewCustomer(false)
              }
              className="absolute top-4 right-4 text-gray-400 p-1"
            >
              <X size={18} />
            </button>

            <h3 className="font-display font-bold text-charcoal mb-4">
              New Customer
            </h3>

            <input
              placeholder="Full name"
              value={newCustomerName}
              onChange={(e) =>
                setNewCustomerName(
                  e.target.value
                )
              }
              className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm mb-3"
            />

            <input
              placeholder="Phone number"
              value={newCustomerPhone}
              onChange={(e) =>
                setNewCustomerPhone(
                  e.target.value
                )
              }
              className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm mb-4"
            />

            <button
              onClick={handleCreateCustomer}
              className="w-full bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg py-3 sm:py-2.5 active:scale-95 transition-transform"
            >
              Add Customer
            </button>
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-6 w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="text-center mb-4">
              {settings.logo_url && (
                <img
                  src={settings.logo_url}
                  alt="Business logo"
                  className="mx-auto h-12 max-w-36 object-contain mb-2"
                />
              )}

              <h3 className="font-display font-bold text-lg text-charcoal">
                {settings.company_name}
              </h3>

              <p className="text-xs text-gray-500">
                {settings.tagline}
              </p>

              <p className="text-xs text-gray-400 mt-1">
                Receipt: {receipt.invoice_no}
              </p>

              <p className="text-xs text-gray-400">
                {receipt.created_at
                  ? new Date(
                      receipt.created_at
                    ).toLocaleString('en-GB')
                  : new Date().toLocaleString(
                      'en-GB'
                    )}
              </p>
            </div>

            {receipt.customer && (
              <div className="text-xs text-gray-500 mb-3">
                Customer:{' '}
                <span className="font-medium text-charcoal">
                  {receipt.customer.name}
                </span>

                {receipt.customer.phone
                  ? ` · ${receipt.customer.phone}`
                  : ''}
              </div>
            )}

            <div className="space-y-2 text-sm mb-3">
              {receipt.items.map(
                (item: any, index: number) => (
                  <div
                    key={`${item.fabric?.id || item.fabric_id}-${index}`}
                    className="border-b pb-2"
                  >
                    <div className="flex justify-between gap-3">
                      <span className="font-medium">
                        {item.fabric?.name ||
                          item.fabric_name}
                      </span>

                      <span>
                        {fmt(
                          Number(
                            item.amount ??
                              item.yards *
                                item.price_per_yard
                          )
                        )}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500">
                      {item.fabric
                        ?.material_type ||
                        item.material_type ||
                        'Material'}{' '}
                      ·{' '}
                      {item.fabric?.color ||
                        item.color ||
                        'No color'}
                      {(
                        item.fabric
                          ?.color_number ||
                        item.color_number
                      )
                        ? ` · #${
                            item.fabric
                              ?.color_number ||
                            item.color_number
                          }`
                        : ''}
                    </div>

                    <div className="text-xs text-gray-400">
                      {qty(Number(item.yards))} yd ×{' '}
                      {fmt(
                        Number(
                          item.price_per_yard ??
                            item.fabric
                              ?.selling_price_yard
                        )
                      )}
                      /yd
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="border-t pt-2 text-sm space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>
                  {fmt(
                    Number(receipt.subtotal)
                  )}
                </span>
              </div>

              {Number(receipt.discount) > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>
                    -{fmt(
                      Number(receipt.discount)
                    )}
                  </span>
                </div>
              )}

              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>
                  {fmt(Number(receipt.total))}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Amount paid</span>
                <span>
                  {fmt(
                    Number(
                      receipt.amount_paid ??
                        receipt.paid
                    )
                  )}
                </span>
              </div>

              {Number(receipt.change || 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Change</span>
                  <span>
                    {fmt(
                      Number(receipt.change)
                    )}
                  </span>
                </div>
              )}

              {Number(
                receipt.balance_due ||
                  receipt.balanceDue ||
                  0
              ) > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Balance</span>
                  <span>
                    {fmt(
                      Number(
                        receipt.balance_due ??
                          receipt.balanceDue
                      )
                    )}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Payment</span>
                <span>
                  {PAYMENT_METHODS.find(
                    (method) =>
                      method.value ===
                      receipt.paymentMethod
                  )?.label ||
                    receipt.payment_method ||
                    receipt.paymentMethod}
                </span>
              </div>
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
              Thank you for your patronage!
            </p>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() =>
                  printReceipt(receipt)
                }
                className="flex items-center justify-center gap-2 border rounded-lg py-2.5 text-sm font-medium"
              >
                <Printer size={15} />
                Print Receipt
              </button>

              <button
                onClick={() =>
                  receiptPDF(receipt)
                }
                className="flex items-center justify-center gap-2 border rounded-lg py-2.5 text-sm font-medium"
              >
                <FileDown size={15} />
                Save PDF
              </button>

              <button
                onClick={() => setReceipt(null)}
                className="col-span-2 bg-gold text-charcoal font-semibold rounded-lg py-2.5 text-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
