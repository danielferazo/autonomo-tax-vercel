-- Relax RLS policies for password-protected single-user mode
-- The app uses a hard-coded USER_ID with a password gate instead of Supabase Auth.
-- These policies allow the anon key to read/write all data (access is gated by the password gate UI).

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON invoices;

DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

DROP POLICY IF EXISTS "Users can view own summaries" ON quarterly_summaries;
DROP POLICY IF EXISTS "Users can insert own summaries" ON quarterly_summaries;
DROP POLICY IF EXISTS "Users can update own summaries" ON quarterly_summaries;

DROP POLICY IF EXISTS "Users can upload own invoices" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own invoices" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own receipts" ON storage.objects;

-- Permissive policies for anon access (password gate handles auth)
CREATE POLICY "Allow read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow insert profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update profiles" ON profiles FOR UPDATE USING (true);

CREATE POLICY "Allow read invoices" ON invoices FOR SELECT USING (true);
CREATE POLICY "Allow insert invoices" ON invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update invoices" ON invoices FOR UPDATE USING (true);
CREATE POLICY "Allow delete invoices" ON invoices FOR DELETE USING (true);

CREATE POLICY "Allow read expenses" ON expenses FOR SELECT USING (true);
CREATE POLICY "Allow insert expenses" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update expenses" ON expenses FOR UPDATE USING (true);
CREATE POLICY "Allow delete expenses" ON expenses FOR DELETE USING (true);

CREATE POLICY "Allow read summaries" ON quarterly_summaries FOR SELECT USING (true);
CREATE POLICY "Allow insert summaries" ON quarterly_summaries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update summaries" ON quarterly_summaries FOR UPDATE USING (true);

-- Storage: allow uploads to invoices and receipts buckets
CREATE POLICY "Allow upload invoices" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'invoices');
CREATE POLICY "Allow read invoices" ON storage.objects FOR SELECT USING (bucket_id = 'invoices');
CREATE POLICY "Allow upload receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "Allow read receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
