
-- ============================================
-- GST Invoice System - Complete Database Schema
-- ============================================

-- 1. Role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  gstin TEXT,
  pan TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state_name TEXT NOT NULL,
  state_code TEXT NOT NULL,
  pincode TEXT,
  email TEXT,
  mobile TEXT,
  invoice_prefix TEXT,
  financial_year_start INTEGER NOT NULL DEFAULT 4, -- April
  bank_name TEXT,
  bank_account_no TEXT,
  bank_ifsc TEXT,
  bank_branch TEXT,
  signatory_name TEXT,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 4. User-Company Access table
CREATE TABLE public.user_company_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  can_create_invoice BOOLEAN NOT NULL DEFAULT true,
  can_edit_invoice BOOLEAN NOT NULL DEFAULT false,
  can_cancel_invoice BOOLEAN NOT NULL DEFAULT false,
  can_export BOOLEAN NOT NULL DEFAULT true,
  can_view_reports BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);
ALTER TABLE public.user_company_access ENABLE ROW LEVEL SECURITY;

-- 5. Customers table
CREATE TYPE public.customer_type AS ENUM ('registered', 'unregistered', 'export', 'sez');

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  gstin TEXT,
  trade_name TEXT NOT NULL,
  legal_name TEXT,
  contact_person TEXT,
  billing_address_line1 TEXT,
  billing_address_line2 TEXT,
  billing_city TEXT,
  billing_state_name TEXT,
  billing_state_code TEXT,
  billing_pincode TEXT,
  shipping_address_line1 TEXT,
  shipping_address_line2 TEXT,
  shipping_city TEXT,
  shipping_state_name TEXT,
  shipping_state_code TEXT,
  shipping_pincode TEXT,
  mobile TEXT,
  email TEXT,
  customer_type customer_type NOT NULL DEFAULT 'registered',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, gstin)
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 6. Items table
CREATE TYPE public.item_type AS ENUM ('goods', 'services');

CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  hsn_sac TEXT,
  unit TEXT NOT NULL DEFAULT 'Nos',
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18,
  default_price NUMERIC(12,2),
  item_type item_type NOT NULL DEFAULT 'goods',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- 7. Invoices table
CREATE TYPE public.invoice_status AS ENUM ('draft', 'final', 'cancelled');

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  place_of_supply_state TEXT NOT NULL,
  place_of_supply_code TEXT NOT NULL,
  is_reverse_charge BOOLEAN NOT NULL DEFAULT false,
  eway_bill_number TEXT,
  vehicle_number TEXT,
  lr_number TEXT,
  payment_terms TEXT,
  due_date DATE,
  status invoice_status NOT NULL DEFAULT 'draft',
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  round_off NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_taxable_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_cgst NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_sgst NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_igst NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_in_words TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  cancelled_by UUID REFERENCES auth.users(id),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  financial_year TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, invoice_number, financial_year)
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 8. Invoice Items table
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.items(id),
  description TEXT NOT NULL,
  hsn_sac TEXT,
  quantity NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'Nos',
  rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  taxable_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18,
  cgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  sgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  igst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- 9. Invoice Tax Summary table
CREATE TABLE public.invoice_tax_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  gst_rate NUMERIC(5,2) NOT NULL,
  taxable_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  sgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  igst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_tax_summary ENABLE ROW LEVEL SECURITY;

-- 10. Audit Logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Security Definer Functions
-- ============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is any admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  )
$$;

-- Check if user has access to a company
CREATE OR REPLACE FUNCTION public.has_company_access(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_access
    WHERE user_id = _user_id AND company_id = _company_id
  )
  OR public.is_admin(_user_id)
$$;

-- ============================================
-- Trigger: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  -- Default role: user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Trigger: Update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS Policies
-- ============================================

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "System inserts profiles" ON public.profiles FOR INSERT WITH CHECK (true);

-- User Roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));

-- Companies: admins manage, users see their assigned companies
CREATE POLICY "Admins can manage companies" ON public.companies FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view assigned companies" ON public.companies FOR SELECT USING (
  public.has_company_access(auth.uid(), id)
);

-- User Company Access
CREATE POLICY "Admins can manage access" ON public.user_company_access FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view own access" ON public.user_company_access FOR SELECT USING (auth.uid() = user_id);

-- Customers: scoped to company access
CREATE POLICY "Users can view customers of accessible companies" ON public.customers FOR SELECT USING (
  public.has_company_access(auth.uid(), company_id)
);
CREATE POLICY "Users can manage customers of accessible companies" ON public.customers FOR INSERT WITH CHECK (
  public.has_company_access(auth.uid(), company_id)
);
CREATE POLICY "Users can update customers of accessible companies" ON public.customers FOR UPDATE USING (
  public.has_company_access(auth.uid(), company_id)
);
CREATE POLICY "Users can delete customers of accessible companies" ON public.customers FOR DELETE USING (
  public.has_company_access(auth.uid(), company_id)
);

-- Items: scoped to company access
CREATE POLICY "Users can view items of accessible companies" ON public.items FOR SELECT USING (
  public.has_company_access(auth.uid(), company_id)
);
CREATE POLICY "Users can manage items of accessible companies" ON public.items FOR INSERT WITH CHECK (
  public.has_company_access(auth.uid(), company_id)
);
CREATE POLICY "Users can update items of accessible companies" ON public.items FOR UPDATE USING (
  public.has_company_access(auth.uid(), company_id)
);
CREATE POLICY "Users can delete items of accessible companies" ON public.items FOR DELETE USING (
  public.has_company_access(auth.uid(), company_id)
);

-- Invoices: scoped to company access
CREATE POLICY "Users can view invoices of accessible companies" ON public.invoices FOR SELECT USING (
  public.has_company_access(auth.uid(), company_id)
);
CREATE POLICY "Users can create invoices for accessible companies" ON public.invoices FOR INSERT WITH CHECK (
  public.has_company_access(auth.uid(), company_id)
);
CREATE POLICY "Users can update invoices of accessible companies" ON public.invoices FOR UPDATE USING (
  public.has_company_access(auth.uid(), company_id)
);

-- Invoice Items: access through invoice's company
CREATE POLICY "Users can view invoice items" ON public.invoice_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.has_company_access(auth.uid(), i.company_id))
);
CREATE POLICY "Users can manage invoice items" ON public.invoice_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.has_company_access(auth.uid(), i.company_id))
);
CREATE POLICY "Users can update invoice items" ON public.invoice_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.has_company_access(auth.uid(), i.company_id))
);
CREATE POLICY "Users can delete invoice items" ON public.invoice_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.has_company_access(auth.uid(), i.company_id))
);

-- Invoice Tax Summary: same as invoice items
CREATE POLICY "Users can view tax summary" ON public.invoice_tax_summary FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.has_company_access(auth.uid(), i.company_id))
);
CREATE POLICY "Users can manage tax summary" ON public.invoice_tax_summary FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.has_company_access(auth.uid(), i.company_id))
);
CREATE POLICY "Users can update tax summary" ON public.invoice_tax_summary FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.has_company_access(auth.uid(), i.company_id))
);
CREATE POLICY "Users can delete tax summary" ON public.invoice_tax_summary FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.has_company_access(auth.uid(), i.company_id))
);

-- Audit Logs: admins see all, users see own
CREATE POLICY "Users can view own audit logs" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Authenticated users can create audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- Storage bucket for company logos
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true);

CREATE POLICY "Anyone can view company logos" ON storage.objects FOR SELECT USING (bucket_id = 'company-logos');
CREATE POLICY "Admins can upload company logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'company-logos' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins can update company logos" ON storage.objects FOR UPDATE USING (bucket_id = 'company-logos' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete company logos" ON storage.objects FOR DELETE USING (bucket_id = 'company-logos' AND public.is_admin(auth.uid()));
