-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('student', 'coe');

-- Create enum for certification request status
CREATE TYPE public.request_status AS ENUM ('Pending', 'Approved', 'Rejected');

-- Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  usn TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  major TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table (CRITICAL: separate table for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create students table
CREATE TABLE public.students (
  usn TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  major TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create academic_records table
CREATE TABLE public.academic_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_usn TEXT REFERENCES public.students(usn) ON DELETE CASCADE NOT NULL,
  semester INTEGER NOT NULL,
  sgpa DECIMAL(3,2) NOT NULL CHECK (sgpa >= 0 AND sgpa <= 10),
  cgpa DECIMAL(3,2) NOT NULL CHECK (cgpa >= 0 AND cgpa <= 10),
  sub1_name TEXT,
  sub1_marks INTEGER CHECK (sub1_marks >= 0 AND sub1_marks <= 100),
  sub2_name TEXT,
  sub2_marks INTEGER CHECK (sub2_marks >= 0 AND sub2_marks <= 100),
  sub3_name TEXT,
  sub3_marks INTEGER CHECK (sub3_marks >= 0 AND sub3_marks <= 100),
  sub4_name TEXT,
  sub4_marks INTEGER CHECK (sub4_marks >= 0 AND sub4_marks <= 100),
  sub5_name TEXT,
  sub5_marks INTEGER CHECK (sub5_marks >= 0 AND sub5_marks <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_usn, semester)
);

-- Create certification_requests table
CREATE TABLE public.certification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_usn TEXT REFERENCES public.students(usn) ON DELETE CASCADE NOT NULL,
  status request_status DEFAULT 'Pending' NOT NULL,
  request_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  approval_date TIMESTAMPTZ,
  signed_pdf_url TEXT,
  verification_hash TEXT UNIQUE,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit_logs table for security tracking
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get user's USN
CREATE OR REPLACE FUNCTION public.get_user_usn(_user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT usn FROM public.students WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "COE can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'coe'));

-- RLS Policies for students
CREATE POLICY "Students can view own record"
  ON public.students FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "COE can view all students"
  ON public.students FOR SELECT
  USING (public.has_role(auth.uid(), 'coe'));

CREATE POLICY "Students can update own record"
  ON public.students FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for academic_records
CREATE POLICY "Students can view own academic records"
  ON public.academic_records FOR SELECT
  USING (student_usn = public.get_user_usn(auth.uid()));

CREATE POLICY "COE can view all academic records"
  ON public.academic_records FOR SELECT
  USING (public.has_role(auth.uid(), 'coe'));

CREATE POLICY "COE can insert academic records"
  ON public.academic_records FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'coe'));

CREATE POLICY "COE can update academic records"
  ON public.academic_records FOR UPDATE
  USING (public.has_role(auth.uid(), 'coe'));

-- RLS Policies for certification_requests
CREATE POLICY "Students can view own requests"
  ON public.certification_requests FOR SELECT
  USING (student_usn = public.get_user_usn(auth.uid()));

CREATE POLICY "Students can create own requests"
  ON public.certification_requests FOR INSERT
  WITH CHECK (student_usn = public.get_user_usn(auth.uid()));

CREATE POLICY "COE can view all requests"
  ON public.certification_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'coe'));

CREATE POLICY "COE can update requests"
  ON public.certification_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'coe'));

-- RLS Policies for audit_logs (COE only)
CREATE POLICY "COE can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'coe'));

CREATE POLICY "Anyone authenticated can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_academic_records_updated_at
  BEFORE UPDATE ON public.academic_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_certification_requests_updated_at
  BEFORE UPDATE ON public.certification_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup (creates profile and student record)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, name, email, usn)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    NEW.email,
    NEW.raw_user_meta_data->>'usn'
  );
  
  -- Insert into students if USN is provided
  IF NEW.raw_user_meta_data->>'usn' IS NOT NULL THEN
    INSERT INTO public.students (usn, name, email, major, user_id)
    VALUES (
      NEW.raw_user_meta_data->>'usn',
      COALESCE(NEW.raw_user_meta_data->>'name', 'New Student'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'major', 'Not Specified'),
      NEW.id
    );
    
    -- Assign student role by default
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_students_user_id ON public.students(user_id);
CREATE INDEX idx_academic_records_student_usn ON public.academic_records(student_usn);
CREATE INDEX idx_certification_requests_student_usn ON public.certification_requests(student_usn);
CREATE INDEX idx_certification_requests_status ON public.certification_requests(status);
CREATE INDEX idx_certification_requests_verification_hash ON public.certification_requests(verification_hash);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);