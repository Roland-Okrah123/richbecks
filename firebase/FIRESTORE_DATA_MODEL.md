# RICHBECKS Enterprise — Firestore Data Model

Auth: Firebase Authentication (email/password). Each user's role is stored both in
their Firestore `users/{uid}` doc AND as a custom claim (`role`) set by a Cloud
Function, so Firestore Security Rules can check `request.auth.token.role`.

Roles: owner | manager | cashier | store_keeper | accountant

## Collections

### users/{uid}
```
full_name, username, email, phone, role, is_active, branch_id, created_at, last_login
```

### branches/{branchId}
```
name, location, phone, is_main
```

### categories/{categoryId}
```
name   // Ankara, Lace, Kente, Cotton, Silk...
```

### suppliers/{supplierId}
```
name, phone, location, materials_supplied, amount_owed, notes, created_at
```

### customers/{customerId}
```
name, phone, address, total_spent, credit_balance, is_frequent, created_at
```

### Material field conventions
`fabrics` uses yards as the inventory unit. `selling_price_yard` is the current selling price per yard. `material_type` identifies the material (for example Fabric, Lace, Net), while `color_number` is the supplier/store color code and `color` is the human-readable color name. Existing records may omit `color_number`; it is populated when the material is edited or created after this update.

### fabrics/{fabricId}
```
name, category_id, category_name, material_type, color_number, color, design_pattern, width,
supplier_id, purchase_price_yard, selling_price_yard,
total_yards_purchased, remaining_yards, minimum_stock_level,
date_purchased, storage_location, image_url, notes, branch_id,
is_active, created_at, updated_at
```

### fabrics/{fabricId}/stock_movements/{movementId}  (subcollection)
```
movement_type ('purchase_in'|'sale_out'|'return_in'|'damage_out'|'adjustment'),
yards, reference_id, note, created_by, created_at
```

### sales/{saleId}
```
invoice_no, customer_id, customer_name, cashier_id, cashier_name, branch_id,
subtotal, discount, total, amount_paid, balance_due, change_amount,
payment_method, payment_status ('paid'|'partial'|'credit'),
sale_status ('completed'|'held'|'void'), created_at
```

### sales/{saleId}/items/{itemId}  (subcollection)
```
fabric_id, fabric_name, material_type, color_number, color, yards, price_per_yard, amount
```

### purchases/{purchaseId}
```
purchase_no, supplier_id, supplier_name, transport_cost, other_costs,
total_cost, received_by, created_at
```

### purchases/{purchaseId}/items/{itemId}
```
fabric_id, fabric_name, material_type, color_number, color, yards, cost_per_yard, amount
```

### credits/{creditId}
```
customer_id, customer_name, sale_id, amount_owed, date_borrowed, due_date,
status ('on_track'|'due_soon'|'overdue'|'cleared'), created_at
```

### credits/{creditId}/payments/{paymentId}
```
amount, payment_method, received_by, created_at
```

### expenses/{expenseId}
```
category ('Rent'|'Salaries'|'Transport'|'Electricity'|'Maintenance'|'Packaging'|'Other'),
description, amount, branch_id, recorded_by, expense_date, created_at
```

### returns/{returnId}
```
sale_id, fabric_id, fabric_name, yards, reason, refund_amount,
return_type ('refund'|'exchange'), processed_by, created_at
```

### audit_logs/{logId}
```
user_id, user_name, action, table_name, record_id, details (map), created_at
```

### settings/general  (single doc)
```
company_name, tagline, phone_1, phone_2, address, logo_url,
primary_color, accent_color, currency, owner_whatsapp
```
`owner_whatsapp` (country code + number, no "+", no leading 0 — e.g.
`233243262888`) is read by the `notifyOwnerOnSale` Cloud Function to send a
WhatsApp alert on every completed sale. Leave blank to disable alerts.

### dashboard_stats/summary  (single doc, maintained by Cloud Functions)
```
today_sales, monthly_revenue, net_profit, expenses_this_month,
inventory_value, customer_credit_total, supplier_balance_total,
low_stock_count, total_fabrics_count, last_updated
```
Kept up to date by Firestore triggers (onCreate for sales/expenses/purchases)
so the dashboard reads one cheap document instead of aggregating on the client.

## Why Cloud Functions (not pure client writes) for sales
A sale must, atomically: validate stock, decrement `fabrics.remaining_yards`,
write `sale_items`, write a `stock_movement`, optionally create a `credits`
record, and update `customers.total_spent`/`credit_balance`. This is done in
a Firestore transaction inside the `createSale` callable function so it can
never leave inventory in a half-updated state, and so client code (and
Firestore Rules) never need direct write access to `remaining_yards`.
