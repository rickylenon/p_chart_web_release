# **Product Requirement Document**

## **Product Name**: P-Chart System (Web Application)

## **Version**: 2.0

---

## **Introduction**
The P-Chart System is a web-based application designed for real-time defect monitoring and production process tracking. Built with modern web technologies, it provides centralized access to production data through a responsive and intuitive interface within the organization's network. Its primary goal is to enhance production efficiency through streamlined defect tracking, real-time reporting, and multi-user collaboration.

---

## **Key Features and Functional Requirements**

### **1. User Authentication and Access Control**
- **Login System**:
  - Role-based access (Encoder, Admin)
  - Secure password authentication
  - Session management
  - Activity tracking and audit logging
  - Department-based access control

### **2. Production Order Management**
- **Dashboard View**:
  - Active production orders overview
  - Production status indicators
  - Real-time defect metrics
  - Performance indicators

- **Production Order Operations**:
  - Create new production orders
  - Track order status and progress
  - View order history and details
  - Real-time order updates

### **3. Operation Workflow**
- **Sequential Operations**:
  - OP10: Cable Cutting
  - OP15: 1st Side Process
  - OP20: 2nd Side Process
  - OP30: Taping Process
  - OP40: QC Sampling

- **Operation Controls**:
  - Start/End operation tracking
  - Input/Output quantity management
  - Real-time validation
  - Operator assignment
  - Time tracking
  - Production hours calculation
  - Man-hours computation (Production Hours × RF)

### **4. Defect Management**
- **Defect Recording**:
  - Operation-specific defect selection
  - Machine identification through defect categories
  - Quantity tracking for:
    - Regular defects
    - Rework quantities
    - No-good quantities
  - Real-time defect data entry

- **Defect Analysis**:
  - Defect trends and patterns by:
    - Operation step
    - Specific machines (based on defect categories)
    - Time periods
  - Machine performance analysis through defect patterns
  - Multi-machine operation analysis
  - Root cause identification through machine-specific defects
  - Historical defect data by machine and operation

### **5. Real-time Analytics and Reporting**
- **Dashboard Charts**:
  - Daily defect ratios
  - Top defects by specific machines
  - Machine-specific defect patterns within operations
  - Most frequent defects with machine correlation
  - Production efficiency metrics by operation and machine
  - Real-time yield calculations

- **Custom Reports**:
  - Production order reports
  - Machine-specific defect analysis
  - Operation-machine correlation reports
  - Defect pattern analysis by machine
  - Historical trend analysis with machine breakdown
  - Machine efficiency reports based on defect data

### **6. Data Validation and Quality**
- **Input Validation**:
  - Quantity reconciliation (Input = Output + Defects)
  - Operation sequence enforcement
  - Time entry validation
  - Required field validation

- **Quality Controls**:
  - Prevent duplicate operations
  - Enforce workflow sequence
  - Data consistency checks
  - Real-time error feedback

### **7. User Interface**
- **Modern Web Interface**:
  - Responsive design for all screen sizes
  - Intuitive navigation
  - Role-specific views
  - Real-time updates
  - Interactive charts and graphs
  - Global search functionality for production orders

- **Key Screens**:
  - Production Order List
  - Operation Details
  - Defect Recording
  - Analytics Dashboard
  - User Management
  - System Configuration

- **Global Search**:
  - Persistent search bar in navigation
  - Quick access to production orders by PO number
  - Smart redirection:
    - Direct to details page for existing orders
    - Auto-fill create form for new orders
  - Accessible from any page in the application
  - Real-time validation of PO existence

### **8. System Administration**
- **User Management**:
  - Create and manage user accounts
  - Role assignment
  - Department management
  - Access control configuration

- **System Configuration**:
  - Defect master list management with machine associations
  - Operation step configuration
  - Defect-machine mapping maintenance
  - System parameters setup
  - Machine-specific defect category management

---

## **Technical Requirements**

### **Platform**
- **Web Application**:
  - Modern web browsers (Chrome, Firefox, Safari, Edge)
  - Responsive design for desktop and tablet access
  - Minimum screen resolution: 1024x768
  - Internal network access only

### **Architecture**
- **Frontend**: Modern web framework (React/Angular/Vue)
- **Backend**: RESTful API architecture
- **Database**: Enterprise RDBMS (MySQL/PostgreSQL)
- **Server Environment**:
  - Windows Server or Linux
  - Application server (e.g., IIS, Apache, Nginx)
  - Database server
  - Internal DNS configuration

### **Infrastructure**
- **Deployment Type**: On-premises within client's network
- **Network Requirements**:
  - Internal network accessibility only
  - Network segmentation support
  - VLAN configuration if required
  - Internal SSL/TLS certificates
  - Local DNS resolution
  - Proxy server configuration (if needed)

### **Hardware Requirements**
- **Application Server**:
  - Minimum 8GB RAM
  - 4+ CPU cores
  - 100GB+ storage
  - RAID configuration for data safety
  - UPS backup power

- **Database Server**:
  - Minimum 16GB RAM
  - 8+ CPU cores
  - 500GB+ storage (SSD preferred)
  - RAID configuration
  - UPS backup power

### **Performance**
- Page load time < 2 seconds on local network
- Real-time updates < 200ms within LAN
- Support for 50+ concurrent users
- 99.9% uptime during production hours
- Automatic local backup system

### **Security**
- Internal network security protocols
- Windows/LDAP authentication integration
- Network-level access control
- Regular internal security audits
- Local backup and recovery procedures

---

## **User Roles**

### **Encoder**
- Record production data
- Start/end operations
- Input defect information
- View reports and analytics
- Track production orders

### **Admin**
- All Encoder permissions
- User management
- System configuration
- Master data management
- Advanced reporting access
- Audit trail access

---

## **Development Phases**

### **Phase 1: Core Features**
- User authentication with network integration
- Production order management
- Basic operation workflow
- Essential defect tracking
- Local server setup and configuration

### **Phase 2: Advanced Features**
- Advanced analytics
- Custom reporting
- Real-time dashboards
- System optimization
- Backup and recovery procedures

### **Phase 3: Integration & Enhancement**
- Internal system integration
- Network performance optimization
- Security hardening
- Disaster recovery implementation

### **Phase 4: Production Deployment**
- Server installation and setup
- Network configuration
- User training and documentation
- Go-live support and monitoring
- System handover to IT team