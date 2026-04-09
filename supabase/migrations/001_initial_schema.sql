-- Profile table (NIF and home office percentage per AUTH-02)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nif TEXT,
  home_office_pct NUMERIC(5,2) DEFAULT 20.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table per PROJECT.md schema
CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  number TEXT NOT NULL,
  date DATE NOT NULL,
  date_paid DATE,
  client TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  gross_orig NUMERIC(12,2) NOT NULL DEFAULT 0,
  fx_rate NUMERIC(10,6),
  fx_date DATE,
  gross_eur NUMERIC(12,2) NOT NULL DEFAULT 0,
  iva_collected NUMERIC(12,2) NOT NULL DEFAULT 0,
  irpf_retained NUMERIC(12,2) NOT NULL DEFAULT 0,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  year INTEGER NOT NULL,
  filename TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table per PROJECT.md schema
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  gross NUMERIC(12,2) NOT NULL DEFAULT 0,
  iva_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  deduct_pct NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  is_fixed BOOLEAN NOT NULL DEFAULT FALSE,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  year INTEGER NOT NULL,
  filename TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quarterly summaries for Modelo 303/130 carryforward
CREATE TABLE quarterly_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  prior_ingresos NUMERIC(12,2) DEFAULT 0,
  prior_gastos NUMERIC(12,2) DEFAULT 0,
  prior_pagos NUMERIC(12,2) DEFAULT 0,
  prior_retenciones NUMERIC(12,2) DEFAULT 0,
  prior_303 NUMERIC(12,2) DEFAULT 0,
  m130_result NUMERIC(12,2) DEFAULT 0,
  m303_result NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year, quarter)
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_summaries ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own invoices" ON invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own invoices" ON invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own invoices" ON invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own invoices" ON invoices FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expenses FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own summaries" ON quarterly_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own summaries" ON quarterly_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own summaries" ON quarterly_summaries FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup (per D-14)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage buckets for invoices and receipts (per D-12, D-13)
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

CREATE POLICY "Users can upload own invoices" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own invoices" ON storage.objects FOR SELECT USING (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload own receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
