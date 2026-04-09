# Requirements — Autonomo Tax Prep

## v1 Requirements

### Authentication
- [x] **AUTH-01**: User can sign up/log in with email+password via Supabase Auth
- [x] **AUTH-02**: User profile stores NIF and home office percentage (default 20%)

### Invoice Management
- [ ] **INV-01**: Upload PDF/image invoices → Claude AI extracts: number, date, client, gross, IVA, IRPF, currency
- [ ] **INV-02**: Manual invoice entry with all fields (number, date, date_paid, client, currency, gross, IVA, IRPF)
- [ ] **INV-03**: Date Paid field determines which quarter the invoice counts toward
- [ ] **INV-04**: USD invoices: auto-fetch ECB rate for invoice date, allow manual override
- [ ] **INV-05**: Inline FX rate editing per invoice with Supabase persistence
- [ ] **INV-06**: Sort and filter invoices by quarter/year

### Expense Management
- [ ] **EXP-01**: Upload receipts → Claude AI extracts: description, gross, IVA amount, category
- [ ] **EXP-02**: Manual expense entry with category selector (rent, electricity, water, internet, phone, cuota, software, hardware, other)
- [ ] **EXP-03**: "Fixed monthly" flag for recurring expenses (cuota autónomos, rent, etc.)
- [ ] **EXP-04**: Home office percentage dynamically affects rent/electricity/water deduction %

### Modelo 303 (IVA)
- [ ] **M303-01**: IVA devengado (output): Casilla 01 (num operations), 02 (base imponible), 03 (cuota repercotido)
- [ ] **M303-02**: IVA deducible (input): Casilla 28 (base), 29 (cuota soportado)
- [ ] **M303-03**: Result calculation: Casilla 40, 41, 45 (difference), 64 (prior 303), 69 (final result)
- [ ] **M303-04**: Prior 303 entries can be manually entered per quarter
- [ ] **M303-05**: Net positive = amount to pay; negative = refund/carryforward

### Modelo 130 (IRPF Pago Fraccionado)
- [ ] **M130-01**: Cumulative YTD calculation with all required casillas
- [ ] **M130-02**: Prior quarter fields: priorIngresos, priorGastos, priorPagos, priorRetenciones
- [ ] **M130-03**: Casilla 01 (ingresos YTD), 02 (gastos YTD), 03 (rendimiento neto), 04 (20%), 05 (prior pagos), 06 (retenciones), 07 (prior pagos + retenciones), 12 (final result)
- [ ] **M130-04**: If result negative → display €0.00 (retentions already exceeded liability)

### Dashboard / Summary
- [ ] **DASH-01**: Currency conversion table for all USD invoices showing original amount, FX rate, EUR amount
- [ ] **DASH-02**: Side-by-side Modelo 303 and 130 results
- [ ] **DASH-03**: Total liability (303 + 130) with filing deadline displayed
- [ ] **DASH-04**: Quarter selector + year selector in header
- [ ] **DASH-05**: NIF display in header

### File Management
- [x] **FILE-01**: File upload to Supabase Storage (invoices + receipts)
- [ ] **FILE-02**: AI parsing via direct Claude API calls from client (not edge function)

### Profile
- [x] **PROF-01**: User can view/edit NIF (tax ID)
- [x] **PROF-02**: User can view/edit home office percentage (default 20%)

## Out of Scope

- [Exclusion: Auto-filing to Agencia Tributaria] — Manual entry only, no API integration
- [Exclusion: Modelo 100 (annual IRPF declaration)] — Only quarterly Modelo 130
- [Exclusion: Multi-currency beyond USD→EUR] — Only USD to EUR conversion supported
- [Exclusion: Invoice PDF generation] — No PDF output functionality

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| AUTH-01 | 1 | — |
| AUTH-02 | 1 | — |
| INV-01 | 2 | — |
| INV-02 | 2 | — |
| INV-03 | 2 | — |
| INV-04 | 2 | — |
| INV-05 | 2 | — |
| INV-06 | 2 | — |
| EXP-01 | 2 | — |
| EXP-02 | 2 | — |
| EXP-03 | 2 | — |
| EXP-04 | 2 | — |
| M303-01 | 3 | — |
| M303-02 | 3 | — |
| M303-03 | 3 | — |
| M303-04 | 3 | — |
| M303-05 | 3 | — |
| M130-01 | 3 | — |
| M130-02 | 3 | — |
| M130-03 | 3 | — |
| M130-04 | 3 | — |
| DASH-01 | 4 | — |
| DASH-02 | 4 | — |
| DASH-03 | 4 | — |
| DASH-04 | 4 | — |
| DASH-05 | 4 | — |
| FILE-01 | 1 | — |
| FILE-02 | 2 | — |
| PROF-01 | 1 | — |
| PROF-02 | 1 | — |
