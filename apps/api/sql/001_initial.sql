CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'marketer', 'viewer')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY,
  record_type VARCHAR(20) NOT NULL CHECK (record_type IN ('contact', 'lead')),
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  company VARCHAR(160),
  job_title VARCHAR(120),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (lifecycle_status IN ('active', 'customer', 'prospect', 'inactive')),
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  unsubscribed_at TIMESTAMPTZ,
  source VARCHAR(60) NOT NULL DEFAULT 'manual',
  owner_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY,
  name VARCHAR(180) NOT NULL UNIQUE,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused')),
  subject_line VARCHAR(220),
  from_name VARCHAR(120),
  from_email VARCHAR(254),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER NOT NULL DEFAULT 0 CHECK (total_recipients >= 0),
  delivered_count INTEGER NOT NULL DEFAULT 0 CHECK (delivered_count >= 0),
  bounced_count INTEGER NOT NULL DEFAULT 0 CHECK (bounced_count >= 0),
  open_count INTEGER NOT NULL DEFAULT 0 CHECK (open_count >= 0),
  click_count INTEGER NOT NULL DEFAULT 0 CHECK (click_count >= 0),
  unsubscribe_count INTEGER NOT NULL DEFAULT 0 CHECK (unsubscribe_count >= 0),
  created_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(140) NOT NULL UNIQUE,
  category VARCHAR(60) NOT NULL,
  subject_line VARCHAR(220) NOT NULL,
  preview_text VARCHAR(240),
  html_body TEXT NOT NULL,
  created_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80),
  entity_id VARCHAR(120),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_consent ON contacts (marketing_consent, unsubscribed_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_category ON email_templates (category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
