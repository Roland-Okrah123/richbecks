import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const GOLD = [212, 165, 55] as [number, number, number];
const CHARCOAL = [26, 29, 36] as [number, number, number];

const fmt = (n: number) => `GHC ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function letterhead(doc: jsPDF, subtitle: string, company?: ReceiptData['company']) {
  doc.setFillColor(...CHARCOAL);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.circle(18, 14, 8, 'S');
  doc.setTextColor(...GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('RB', 18, 16.5, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text(company?.company_name || 'Business Management System', 32, 13);
  doc.setFontSize(8.5);
  doc.setTextColor(...GOLD);
  doc.setFont('helvetica', 'normal');
  doc.text(company?.tagline || 'Business Management System', 32, 19);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(subtitle, 200, 13, { align: 'right' });
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD);
  const phones = [company?.phone_1, company?.phone_2].filter(Boolean).join(' / ');
  if (phones) doc.text(phones, 200, 19, { align: 'right' });

  doc.setTextColor(0, 0, 0);
}

export interface ReceiptItem {
  fabric?: {
    name: string;
    material_type?: string;
    color_number?: string;
    color?: string;
    selling_price_yard?: number;
  };
  fabric_name?: string;
  material_type?: string;
  color_number?: string;
  color?: string;
  yards: number;
  price_per_yard: number;
  amount: number;
}

export interface ReceiptData {
  invoice_no: string;
  created_at?: string | Date;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  amount_paid?: number;
  paid?: number;
  balance_due?: number;
  balanceDue?: number;
  change?: number;
  customer?: { name: string; phone?: string } | null;
  payment_method?: string;
  paymentMethod?: string;
  company?: {
    company_name: string;
    tagline: string;
    phone_1: string;
    phone_2: string;
    address: string;
    currency: string;
    logo_url?: string;
  };
}

const paymentLabel = (value?: string) => ({
  cash: 'Cash',
  mtn_momo: 'MTN Mobile Money',
  vodafone_cash: 'Vodafone Cash',
  airteltigo_money: 'AirtelTigo Money',
  bank: 'Bank Payment',
}[value || ''] || value || '—');

const receiptItemName = (item: ReceiptItem) => item.fabric?.name || item.fabric_name || 'Material';
const receiptType = (item: ReceiptItem) => item.fabric?.material_type || item.material_type || 'Material';
const receiptColor = (item: ReceiptItem) => item.fabric?.color || item.color || '—';
const receiptColorNumber = (item: ReceiptItem) => item.fabric?.color_number || item.color_number || '';
const receiptPrice = (item: ReceiptItem) => Number(item.price_per_yard ?? item.fabric?.selling_price_yard ?? 0);
const receiptAmount = (item: ReceiptItem) => Number(item.amount ?? item.yards * receiptPrice(item));

export function receiptPDF(receipt: ReceiptData) {
  const company = receipt.company;
  const doc = new jsPDF({ unit: 'mm', format: [80, 215 + receipt.items.length * 14] });
  const companyName = company?.company_name || 'Business Management System';
  const tagline = company?.tagline || 'Wholesale & Retail Fabrics';
  const phones = [company?.phone_1, company?.phone_2].filter(Boolean).join(' / ');
  const paid = Number(receipt.amount_paid ?? receipt.paid ?? 0);
  const balance = Number(receipt.balance_due ?? receipt.balanceDue ?? 0);
  const change = Number(receipt.change ?? Math.max(0, paid - Number(receipt.total)));
  const created = receipt.created_at ? new Date(receipt.created_at) : new Date();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(companyName, 40, 9, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(tagline, 40, 13, { align: 'center' });
  if (company?.address) doc.text(company.address, 40, 17, { align: 'center', maxWidth: 70 });
  if (phones) doc.text(phones, 40, 21, { align: 'center' });
  doc.line(4, 24, 76, 24);

  let y = 29;
  doc.setFontSize(7.5);
  doc.text(`Receipt: ${receipt.invoice_no}`, 4, y);
  doc.text(created.toLocaleDateString('en-GB'), 76, y, { align: 'right' });
  y += 4;
  doc.text(created.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), 76, y, { align: 'right' });
  if (receipt.customer) {
    doc.text(`Customer: ${receipt.customer.name}`, 4, y);
    y += 4;
    if (receipt.customer.phone) doc.text(`Phone: ${receipt.customer.phone}`, 4, y);
  }
  y += 5;
  doc.line(4, y, 76, y);
  y += 4;

  receipt.items.forEach((item) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(receiptItemName(item), 4, y, { maxWidth: 45 });
    doc.text(fmt(receiptAmount(item)), 76, y, { align: 'right' });
    y += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.7);
    const colorCode = receiptColorNumber(item) ? ` · #${receiptColorNumber(item)}` : '';
    doc.text(`${receiptType(item)} · ${receiptColor(item)}${colorCode}`, 4, y, { maxWidth: 70 });
    y += 3.5;
    doc.text(`${item.yards.toLocaleString(undefined, { maximumFractionDigits: 2 })} yd × ${fmt(receiptPrice(item))}/yd`, 4, y);
    y += 5;
  });

  doc.line(4, y, 76, y);
  y += 5;
  doc.setFontSize(7.5);
  doc.text('Subtotal', 4, y); doc.text(fmt(Number(receipt.subtotal)), 76, y, { align: 'right' }); y += 4;
  if (Number(receipt.discount) > 0) {
    doc.text('Discount', 4, y); doc.text(`-${fmt(Number(receipt.discount))}`, 76, y, { align: 'right' }); y += 4;
  }
  doc.setFont('helvetica', 'bold');
  doc.text('Total', 4, y); doc.text(fmt(Number(receipt.total)), 76, y, { align: 'right' }); y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text('Amount paid', 4, y); doc.text(fmt(paid), 76, y, { align: 'right' }); y += 4;
  if (change > 0) { doc.text('Change', 4, y); doc.text(fmt(change), 76, y, { align: 'right' }); y += 4; }
  if (balance > 0) { doc.text('Balance', 4, y); doc.text(fmt(balance), 76, y, { align: 'right' }); y += 4; }
  doc.text('Payment', 4, y); doc.text(paymentLabel(receipt.payment_method || receipt.paymentMethod), 76, y, { align: 'right', maxWidth: 55 }); y += 7;
  doc.setFontSize(7);
  doc.text('Thank you for your patronage!', 40, y, { align: 'center' });

  doc.save(`${receipt.invoice_no}.pdf`);
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function printReceipt(receipt: ReceiptData) {
  const company = receipt.company;
  const paid = Number(receipt.amount_paid ?? receipt.paid ?? 0);
  const total = Number(receipt.total || 0);
  const balance = Number(receipt.balance_due ?? receipt.balanceDue ?? Math.max(0, total - paid));
  const change = Number(receipt.change ?? Math.max(0, paid - total));
  const created = receipt.created_at ? new Date(receipt.created_at) : new Date();
  const companyName = company?.company_name || 'Business Management System';
  const itemsHtml = receipt.items.map((item) => {
    const code = receiptColorNumber(item) ? ` · #${escapeHtml(receiptColorNumber(item))}` : '';
    return `<div class="item">
      <div class="item-main"><strong>${escapeHtml(receiptItemName(item))}</strong><strong>${escapeHtml(fmt(receiptAmount(item)))}</strong></div>
      <div class="muted">${escapeHtml(receiptType(item))} · ${escapeHtml(receiptColor(item))}${code}</div>
      <div class="muted">${escapeHtml(item.yards.toLocaleString(undefined, { maximumFractionDigits: 2 }))} yd × ${escapeHtml(fmt(receiptPrice(item)))} / yd</div>
    </div>`;
  }).join('');

  const printWindow = window.open('', '_blank', 'width=420,height=760');
  if (!printWindow) {
    window.alert('Printing was blocked by the browser. Please allow pop-ups for this site and try again.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(receipt.invoice_no)}</title>
    <style>
      @page { size: 80mm auto; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body { width: 80mm; padding: 5mm; color: #111827; font: 12px/1.35 Arial, Helvetica, sans-serif; }
      .center { text-align: center; } .logo { max-width: 36mm; max-height: 16mm; object-fit: contain; margin: 0 auto 2mm; display: block; }
      h1 { margin: 0; font-size: 16px; } .tagline { margin: 1mm 0; color: #6b7280; font-size: 10px; }
      .muted { color: #6b7280; font-size: 9px; } .meta { margin-top: 3mm; }
      .rule { border-top: 1px dashed #9ca3af; margin: 3mm 0; } .item { padding: 2mm 0; border-bottom: 1px dotted #d1d5db; }
      .item-main { display: flex; justify-content: space-between; gap: 4mm; } .item-main strong:last-child { white-space: nowrap; }
      .totals { margin-top: 3mm; } .row { display: flex; justify-content: space-between; gap: 4mm; margin: 1.2mm 0; }
      .grand { font-size: 14px; font-weight: 700; margin-top: 2mm; } .footer { margin-top: 5mm; text-align: center; color: #6b7280; font-size: 9px; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>
    ${company?.logo_url ? `<img class="logo" src="${escapeHtml(company.logo_url)}" alt="Logo">` : ''}
    <div class="center"><h1>${escapeHtml(companyName)}</h1><div class="tagline">${escapeHtml(company?.tagline || 'Wholesale & Retail Fabrics')}</div>
    ${company?.address ? `<div class="muted">${escapeHtml(company.address)}</div>` : ''}
    ${[company?.phone_1, company?.phone_2].filter(Boolean).map(escapeHtml).join(' · ') ? `<div class="muted">${[company?.phone_1, company?.phone_2].filter(Boolean).map(escapeHtml).join(' · ')}</div>` : ''}</div>
    <div class="rule"></div>
    <div class="muted">Receipt: <strong>${escapeHtml(receipt.invoice_no)}</strong><br>${escapeHtml(created.toLocaleString('en-GB'))}</div>
    ${receipt.customer ? `<div class="meta">Customer: <strong>${escapeHtml(receipt.customer.name)}</strong>${receipt.customer.phone ? ` · ${escapeHtml(receipt.customer.phone)}` : ''}</div>` : ''}
    <div class="rule"></div>${itemsHtml}
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${escapeHtml(fmt(Number(receipt.subtotal)))}</span></div>
      ${Number(receipt.discount) > 0 ? `<div class="row"><span>Discount</span><span>-${escapeHtml(fmt(Number(receipt.discount)))}</span></div>` : ''}
      <div class="row grand"><span>Total</span><span>${escapeHtml(fmt(total))}</span></div>
      <div class="row"><span>Amount paid</span><span>${escapeHtml(fmt(paid))}</span></div>
      ${change > 0 ? `<div class="row"><span>Change</span><span>${escapeHtml(fmt(change))}</span></div>` : ''}
      ${balance > 0 ? `<div class="row"><span>Balance</span><span>${escapeHtml(fmt(balance))}</span></div>` : ''}
      <div class="row"><span>Payment</span><span>${escapeHtml(paymentLabel(receipt.payment_method || receipt.paymentMethod))}</span></div>
    </div>
    <div class="footer">Thank you for your patronage!</div>
    <script>window.addEventListener('load', function(){ setTimeout(function(){ window.focus(); window.print(); }, 250); });</script>
  </body></html>`);
  printWindow.document.close();
}

export function tableReportPDF(opts: {
  title: string;
  subtitle: string;
  columns: string[];
  rows: (string | number)[][];
  summary?: { label: string; value: string }[];
  filename: string;
  company?: ReceiptData['company'];
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  letterhead(doc, opts.title, opts.company);

  let y = 38;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(opts.subtitle, 14, y);
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 196, y, { align: 'right' });
  y += 4;

  if (opts.summary && opts.summary.length > 0) {
    y += 4;
    const boxWidth = 182 / opts.summary.length;
    opts.summary.forEach((s, i) => {
      const x = 14 + i * boxWidth;
      doc.setDrawColor(230);
      doc.rect(x, y, boxWidth - 3, 16);
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(s.label, x + 3, y + 6);
      doc.setFontSize(10);
      doc.setTextColor(...CHARCOAL);
      doc.setFont('helvetica', 'bold');
      doc.text(s.value, x + 3, y + 12);
      doc.setFont('helvetica', 'normal');
    });
    y += 22;
  }

  autoTable(doc, {
    startY: y,
    head: [opts.columns],
    body: opts.rows,
    headStyles: { fillColor: CHARCOAL, textColor: GOLD, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    margin: { left: 14, right: 14 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(150);
    doc.text(`Richbecks Enterprise — Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
  }

  doc.save(`${opts.filename}.pdf`);
}
