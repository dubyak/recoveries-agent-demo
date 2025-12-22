-- Demo customer data
INSERT INTO customers (id, name, phone, email, previous_loans, payment_history) VALUES
('CUST001', 'Sarah Omondi', '+254712345678', 'sarah.omondi@example.com', 3, '2 on-time, 1 late'),
('CUST002', 'James Mwangi', '+254723456789', 'james.mwangi@example.com', 5, '4 on-time, 1 late'),
('CUST003', 'Grace Wambui', '+254734567890', 'grace.wambui@example.com', 2, '2 on-time')
ON CONFLICT (id) DO NOTHING;

-- Demo loan data
INSERT INTO loans (id, customer_id, original_amount, current_balance, fees, interest, days_overdue, disbursement_date, due_date, status) VALUES
('LOAN12345', 'CUST001', 500.00, 562.50, 37.50, 25.00, 45, '2024-10-15', '2024-11-15', 'overdue'),
('LOAN12346', 'CUST002', 1200.00, 1290.00, 60.00, 30.00, 30, '2024-11-01', '2024-12-01', 'overdue'),
('LOAN12347', 'CUST003', 750.00, 847.50, 52.50, 45.00, 60, '2024-09-30', '2024-10-30', 'overdue')
ON CONFLICT (id) DO NOTHING;
