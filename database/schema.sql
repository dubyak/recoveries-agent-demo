-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  previous_loans INTEGER DEFAULT 0,
  payment_history TEXT
);

-- Loans table
CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  original_amount DECIMAL(10, 2) NOT NULL,
  current_balance DECIMAL(10, 2) NOT NULL,
  fees DECIMAL(10, 2) DEFAULT 0,
  interest DECIMAL(10, 2) DEFAULT 0,
  days_overdue INTEGER DEFAULT 0,
  disbursement_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promise to Pay (PTP) table
CREATE TABLE IF NOT EXISTS ptps (
  id SERIAL PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  loan_id TEXT REFERENCES loans(id),
  session_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation history table (optional, for tracking)
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loans_customer_id ON loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_ptps_customer_id ON ptps(customer_id);
CREATE INDEX IF NOT EXISTS idx_ptps_session_id ON ptps(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
