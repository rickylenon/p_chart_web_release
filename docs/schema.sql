-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    email VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'Encoder',
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL
);

-- Create production_orders table
CREATE TABLE IF NOT EXISTS production_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    lot_number VARCHAR(50),
    po_quantity INT NOT NULL,
    item_name VARCHAR(100),
    status VARCHAR(20) NOT NULL,
    current_operation VARCHAR(20),
    current_operation_start_time TIMESTAMP,
    current_operation_end_time TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Create defects table
CREATE TABLE IF NOT EXISTS defects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    applicable_operation VARCHAR(50),
    reworkable BOOLEAN,
    machine VARCHAR(50)
);

-- Create operations table
CREATE TABLE IF NOT EXISTS operations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    production_order_id INT NOT NULL,
    operation VARCHAR(50) NOT NULL,
    operator_id INT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    input_quantity INT NOT NULL,
    output_quantity INT,
    production_hours DECIMAL(10,2),
    accumulated_man_hours DECIMAL(10,2),
    rf INT,
    encoded_by_id INT,
    encoded_time TIMESTAMP,
    FOREIGN KEY (production_order_id) REFERENCES production_orders(id),
    FOREIGN KEY (operator_id) REFERENCES users(id),
    FOREIGN KEY (encoded_by_id) REFERENCES users(id)
);

-- Create operation_defects table
CREATE TABLE IF NOT EXISTS operation_defects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operation_id INT NOT NULL,
    defect_id INT NOT NULL,
    quantity INT DEFAULT 0,
    quantity_rework INT DEFAULT 0,
    quantity_nogood INT DEFAULT 0,
    FOREIGN KEY (operation_id) REFERENCES operations(id),
    FOREIGN KEY (defect_id) REFERENCES defects(id),
    UNIQUE(operation_id, defect_id)
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values TEXT,
    new_values TEXT,
    user_id INT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create operation_steps table
CREATE TABLE IF NOT EXISTS operation_steps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    operation_number VARCHAR(20) NOT NULL UNIQUE,
    step_order INT NOT NULL
);

-- Insert default admin user (password: 1234)
INSERT INTO users (username, password, name, email, role, is_active, created_at) 
VALUES ('admin', '1234', 'Administrator', 'admin@example.com', 'Admin', 1, NOW());

-- Insert default encoder user (password: 1234)
INSERT INTO users (username, password, name, email, role, is_active, created_at) 
VALUES ('encoder', '1234', 'Encoder', 'admin@example.com', 'Encoder', 1, NOW()); 