# **Database Requirements Document**

## **Product Name**: P-Chart System

---

## **1. Overview**
The P-Chart System uses a centralized database deployed on-premises within the client's network infrastructure. The database is designed to support defect monitoring, production tracking, operation steps management, and comprehensive audit logging. It ensures efficient read/write operations, data integrity, scalability, and concurrent access for manufacturing operations across the organization's local network.

---

## **2. Database Type**
- **Database Management System**: MySQL/PostgreSQL (Enterprise-grade RDBMS)
- **Storage Mode**: On-premises centralized database
- **Access Mode**: Internal web-based with real-time synchronization
- **Deployment**: On-premises within client's network infrastructure
- **Platform Support**: Access via modern web browsers within internal network

---

## **3. Key Database Entities and Tables**

### **3.1 Users**
- **Description**: Stores user credentials, roles, and account information
- **Fields**:
  - `id` (Primary Key, Auto-increment)
  - `username` (Unique, Not Null)
  - `password` (Hashed, Not Null)
  - `name`
  - `email`
  - `role` (Default: 'Encoder')
  - `is_active` (Boolean, Default: true)
  - `created_at` (Timestamp)
  - `last_login` (Timestamp)
  - `department` (For organizational tracking)

### **3.2 Production Orders**
- **Description**: Tracks Production Order (P.O.) information and status
- **Fields**:
  - `id` (Primary Key, Auto-increment)
  - `po_number` (Unique, Not Null)
  - `lot_number`
  - `po_quantity` (Not Null)
  - `item_name`
  - `status` (Not Null)
  - `current_operation`
  - `current_operation_start_time` (Timestamp)
  - `current_operation_end_time` (Timestamp)
  - `created_at` (Timestamp)
  - `updated_at` (Timestamp)

### **3.3 Operations**
- **Description**: Records detailed operation data for each production step
- **Fields**:
  - `id` (Primary Key, Auto-increment)
  - `production_order_id` (Foreign Key → production_orders.id)
  - `operation` (Not Null)
  - `operator_id` (Foreign Key → users.id)
  - `start_time` (Timestamp)
  - `end_time` (Timestamp)
  - `input_quantity` (Not Null)
  - `output_quantity`
  - `production_hours` (Decimal)
  - `accumulated_man_hours` (Decimal)
  - `rf` (Integer)
  - `encoded_by_id` (Foreign Key → users.id)
  - `encoded_time` (Timestamp)

### **3.4 Defects**
- **Description**: Maintains master list of current possible defects (reference table)
- **Fields**:
  - `id` (Primary Key, Auto-increment)
  - `name` (Not Null)
  - `description` (Text)
  - `category`
  - `applicable_operation`
  - `reworkable` (Boolean)
  - `machine`
  - `is_active` (Boolean, Default: true)
  - `deactivated_at` (Timestamp)
  - `deactivated_by` (Foreign Key → users.id)

### **3.5 Operation Defects**
- **Description**: Records defects found during operations with complete defect information preserved at the time of recording
- **Fields**:
  - `id` (Primary Key, Auto-increment)
  - `operation_id` (Foreign Key → operations.id)
  - `defect_name` (Not Null)
  - `defect_category` (Not Null)
  - `defect_machine`
  - `defect_reworkable` (Boolean, Not Null)
  - `quantity` (Default: 0)
  - `quantity_rework` (Default: 0)
  - `quantity_nogood` (Default: 0)
  - `recorded_at` (Timestamp, Not Null)
  - `recorded_by` (Foreign Key → users.id)
  - Unique constraint on (operation_id, defect_name, recorded_at)

### **3.6 Operation Steps**
- **Description**: Defines the sequential manufacturing process steps
- **Fields**:
  - `id` (Primary Key, Auto-increment)
  - `label` (Not Null)
  - `operation_number` (Unique, Not Null)
  - `step_order` (Not Null)

### **3.7 Audit Logs**
- **Description**: Tracks all data changes for auditing purposes
- **Fields**:
  - `id` (Primary Key, Auto-increment)
  - `table_name` (Not Null)
  - `record_id` (Not Null)
  - `action` (Not Null)
  - `old_values` (Text)
  - `new_values` (Text)
  - `user_id` (Foreign Key → users.id)
  - `timestamp` (Not Null)
  - `ip_address` (For access tracking)
  - `user_agent` (For client identification)

### **3.8 Sessions**
- **Description**: Manages user sessions and access control
- **Fields**:
  - `id` (Primary Key, Auto-increment)
  - `user_id` (Foreign Key → users.id)
  - `token` (Unique session identifier)
  - `ip_address`
  - `user_agent`
  - `created_at` (Timestamp)
  - `expires_at` (Timestamp)
  - `last_activity` (Timestamp)

---

## **4. Key Features and Functionality**

### **4.1 Operation Flow**
- Sequential operation steps (OP10 → OP15 → OP20 → OP30 → OP40)
- Automatic input/output quantity tracking between operations
- Real-time defect recording and analysis
- Production hours and man-hours calculation
- Concurrent operation tracking across multiple workstations

### **4.2 Defect Management**
- Comprehensive defect tracking per operation
- Support for reworkable vs non-reworkable defects
- Machine-specific defect analysis
- Defect quantity tracking with rework status
- Real-time defect reporting and analytics

### **4.3 Audit Trail**
- Complete change history tracking
- Record-level auditing for all major entities
- User action accountability
- Before/after state comparison
- IP address and access logging
- Session tracking

### **4.4 Multi-user Support**
- Concurrent access management
- Real-time data synchronization
- Conflict resolution
- Session management
- Department-level access control

---

## **5. Data Integrity and Constraints**

### **5.1 Referential Integrity**
- Foreign key constraints between related tables
- Cascading updates/deletes where appropriate
- Unique constraints on business keys
- Transaction management for concurrent operations

### **5.2 Business Rules**
- Operation sequence enforcement
- Quantity validation (input/output/defect relationships)
- Status transitions validation
- User role-based access control
- Concurrent access control
- Data validation at both application and database levels
- Defect deactivation rules:
  - Soft deletion of defects (using is_active flag)
  - Preservation of historical defect data in operation_defects
  - Tracking of when and who deactivated defects
  - Prevention of using deactivated defects in new operations

---

## **6. Performance Considerations**

### **6.1 Indexing**
- Primary keys are automatically indexed
- Foreign key columns are indexed
- Business key columns (po_number, operation_number) are indexed
- Composite indexes for frequently joined queries
- Full-text search indexes for text fields
- Partitioning for large tables

### **6.2 Query Optimization**
- Prepared statements for frequent operations
- Efficient joins for related data retrieval
- Pagination for large result sets
- Query caching
- Connection pooling
- Internal load balancing if needed

### **6.3 Scalability**
- Vertical scaling capabilities
- Connection pooling
- Query optimization
- Table partitioning
- Local caching strategies

---

## **7. Security**

### **7.1 Authentication**
- Secure password hashing
- Windows/LDAP authentication integration
- Session management
- Internal IP-based access control
- Failed login attempt monitoring
- Password policies enforcement

### **7.2 Authorization**
- Role-based access control (RBAC)
- Department-level permissions
- Feature-level access control
- Data-level security
- Internal API authentication

### **7.3 Audit Trail**
- Comprehensive change logging
- User action tracking
- Session tracking
- Internal IP address logging
- Access attempt logging
- Security event monitoring

### **7.4 Network Security**
- Internal SSL/TLS encryption
- Network segmentation
- VLAN configuration
- Internal firewall rules
- Regular internal security audits

---

## **8. Backup and Recovery**

### **8.1 Backup Strategy**
- Automated daily backups to local storage
- Point-in-time recovery capability
- Transaction log backups
- Local redundant storage
- Backup encryption

### **8.2 Disaster Recovery**
- Local failover configuration
- High availability setup within local network
- Recovery time objectives (RTO)
- Recovery point objectives (RPO)
- Regular recovery testing

---

## **9. Monitoring and Maintenance**

### **9.1 Performance Monitoring**
- Query performance tracking
- Resource utilization monitoring
- Connection pool monitoring
- Lock monitoring
- Slow query logging
- Network latency monitoring

### **9.2 Regular Maintenance**
- Index optimization
- Statistics updates
- Data archiving
- Log rotation
- Database vacuuming
- Storage management

### **9.3 Data Lifecycle Management**
- **Defects Cleanup**:
  - Regular review and cleanup of deactivated defects
  - Permanent deletion of defects that have been deactivated for more than 1 year
  - Verification that no active operations reference the defect before deletion
  - Automated cleanup jobs run during off-peak hours
  - Audit logging of all defect deletions

- **Historical Data Preservation**:
  - Operation Defects records are preserved indefinitely
  - Complete defect information is stored directly in Operation Defects
  - No dependency on Defects reference table for historical records
  - Historical reporting remains accurate regardless of defect deletions
  - Archived data remains queryable for long-term analysis

- **Cleanup Procedures**:
  - Monthly identification of deletion candidates
  - Notification to administrators of pending deletions
  - Manual review and approval process
  - Backup of deletion candidates before removal
  - Transaction-safe deletion process
  - Post-deletion verification and reporting

---

## **10. Future Considerations**
- Advanced analytics and reporting
- Business intelligence integration
- Mobile app support
- API expansion
- Machine learning integration
- IoT device integration
- Real-time dashboards
- Geographic expansion support

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