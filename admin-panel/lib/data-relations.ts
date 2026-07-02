/**
 * FARMAX Data Relations and Schema Documentation
 * 
 * This file documents the data relations between different modules
 * in the FARMAX Pharmacy Management System.
 * 
 * Overview of modules and their relationships:
 * - Inventory: Central management of pharmaceutical products
 * - POS: Point of Sale functionality for transactions
 * - Purchasing: Management of supplier orders and stock replenishment
 * - Finance: Financial tracking and reporting
 * - Staff/HR: Employee management and scheduling
 * - Customer: Customer information and loyalty management
 * - Scheduler: Staff scheduling and availability management
 */

// Main Table Relations and Connections

/**
 * INVENTORY MODULE
 * 
 * Central tables:
 * - Products: Main products catalog
 * - Stock: Current stock levels
 * - Batch: Batch management for expiration tracking
 * - StockOpname: Inventory auditing
 * - Category: Product categorization
 * 
 * Relations:
 * - Products -> Category (M:1)
 * - Products -> Supplier (M:1)
 * - Products -> Stock (1:1)
 * - Stock -> Batch (1:M)
 * - Products -> StockOpname (1:M)
 */

/**
 * POS MODULE
 * 
 * Central tables:
 * - Transaction: Sales transactions
 * - TransactionItem: Individual items in a transaction
 * - Payment: Payment information for transactions
 * - Customer: Customer information
 * - Prescription: Prescription details for medical sales
 * 
 * Relations:
 * - Transaction -> Customer (M:1)
 * - Transaction -> TransactionItem (1:M)
 * - Transaction -> Payment (1:1)
 * - Transaction -> Staff (M:1) [cashier]
 * - Transaction -> Prescription (M:1) [if applicable]
 * - TransactionItem -> Products (M:1)
 */

/**
 * PURCHASING MODULE
 * 
 * Central tables:
 * - PurchaseOrder: Orders to suppliers
 * - PurchaseOrderItem: Individual items in an order
 * - Supplier: Supplier information
 * - GoodsReceipt: Receipt of delivered goods
 * - GoodsReceiptItem: Individual items in a receipt
 * 
 * Relations:
 * - PurchaseOrder -> Supplier (M:1)
 * - PurchaseOrder -> PurchaseOrderItem (1:M)
 * - PurchaseOrderItem -> Products (M:1)
 * - PurchaseOrder -> GoodsReceipt (1:M)
 * - GoodsReceipt -> GoodsReceiptItem (1:M)
 * - GoodsReceiptItem -> Products (M:1)
 * - GoodsReceiptItem -> Batch (1:1) [creates new batch]
 */

/**
 * FINANCE MODULE
 * 
 * Central tables:
 * - Invoice: Invoices for purchases or sales
 * - InvoiceItem: Individual items in an invoice
 * - Payment: Payment records
 * - Expense: Business expenses
 * - FinancialReport: Financial reporting data
 * 
 * Relations:
 * - Invoice -> Transaction (1:1) [for sales]
 * - Invoice -> PurchaseOrder (1:1) [for purchases]
 * - Invoice -> InvoiceItem (1:M)
 * - Invoice -> Payment (1:M)
 * - Payment -> Staff (M:1) [cashier]
 * - Expense -> Staff (M:1) [reporter]
 */

/**
 * STAFF MODULE
 * 
 * Central tables:
 * - Staff: Employee information
 * - StaffRole: Role definitions and permissions
 * - StaffCertificate: Professional certifications
 * - StaffSchedule: Work schedules
 * 
 * Relations:
 * - Staff -> StaffRole (M:1)
 * - Staff -> StaffCertificate (1:M)
 * - Staff -> StaffSchedule (1:M)
 * - Staff -> Transaction (1:M) [as cashier]
 * - Staff -> Prescription (1:M) [as pharmacist]
 */

/**
 * CUSTOMER MODULE
 * 
 * Central tables:
 * - Customer: Customer information
 * - CustomerGroup: Customer categorization
 * - CustomerLoyalty: Loyalty program details
 * 
 * Relations:
 * - Customer -> CustomerGroup (M:1)
 * - Customer -> CustomerLoyalty (1:1)
 * - Customer -> Transaction (1:M)
 * - Customer -> Prescription (1:M)
 */

/**
 * SCHEDULER MODULE
 * 
 * Central tables:
 * - Schedule: Overall schedule management
 * - Shift: Shift definitions
 * - StaffSchedule: Individual staff assignments
 * - ShiftTemplate: Reusable schedule templates
 * 
 * Relations:
 * - Schedule -> Shift (1:M)
 * - Shift -> StaffSchedule (1:M)
 * - StaffSchedule -> Staff (M:1)
 * - Schedule -> ShiftTemplate (M:1) [if using template]
 */

// Cross-Module Integration Points

/**
 * POS <-> INVENTORY
 * 
 * - TransactionItem updates Stock quantities
 * - Low stock levels trigger purchasing alerts
 * - Stock availability affects POS product visibility
 */

/**
 * INVENTORY <-> PURCHASING
 * 
 * - Low stock triggers purchase recommendations
 * - GoodsReceipt updates Stock and Batch information
 * - Stock forecasting affects purchasing decisions
 */

/**
 * POS <-> FINANCE
 * 
 * - Transactions generate financial records
 * - Payments update financial status
 * - Daily sales closing updates financial reporting
 */

/**
 * PURCHASING <-> FINANCE
 * 
 * - Purchase Orders generate payable invoices
 * - Payments to suppliers update PO status
 * - Accounts payable tracking for suppliers
 */

/**
 * STAFF <-> SCHEDULER
 * 
 * - Staff availability affects scheduling
 * - Schedule assignments update staff work hours
 * - Staff certifications affect eligible assignments
 */

/**
 * POS <-> CUSTOMER
 * 
 * - Customer lookup during transactions
 * - Transaction history for customer profiles
 * - Loyalty points accumulation and redemption
 */

/**
 * SCHEDULER <-> POS
 * 
 * - Staff schedules determine POS operator availability
 * - POS productivity metrics influence scheduling
 */

// Data Flow Examples

/**
 * Example: Complete Sales Flow
 * 
 * 1. Customer identified in POS (Customer module)
 * 2. Products scanned and added to transaction (POS module)
 * 3. Stock checked and reserved (Inventory module)
 * 4. Payment processed (POS module)
 * 5. Stock levels updated (Inventory module)
 * 6. Sales recorded in financial data (Finance module)
 * 7. Customer loyalty updated (Customer module)
 * 8. Sales commission tracked for staff (Staff module)
 */

/**
 * Example: Purchase and Receiving Flow
 * 
 * 1. Low stock identified (Inventory module)
 * 2. Purchase order created (Purchasing module)
 * 3. Order sent to supplier (Purchasing module)
 * 4. Goods received and checked (Purchasing module)
 * 5. Batch information recorded (Inventory module)
 * 6. Stock levels updated (Inventory module)
 * 7. Payment scheduled (Finance module)
 * 8. Staff member who received goods recorded (Staff module)
 */

/**
 * Example: Staff Scheduling Flow
 * 
 * 1. Schedule template created (Scheduler module)
 * 2. Staff availability checked (Staff module)
 * 3. Shifts assigned to staff (Scheduler module)
 * 4. Staff notifications sent (Staff module)
 * 5. POS access roles updated based on schedule (POS module)
 * 6. Staff attendance recorded (Staff module)
 * 7. Payroll information updated (Finance module)
 */

// Key Database Identifiers and Foreign Keys

/**
 * Products
 * - id: Primary key
 * - category_id: Foreign key to Category
 * - supplier_id: Foreign key to Supplier
 */

/**
 * Stock
 * - id: Primary key
 * - product_id: Foreign key to Products
 */

/**
 * Batch
 * - id: Primary key
 * - stock_id: Foreign key to Stock
 */

/**
 * Transaction
 * - id: Primary key
 * - customer_id: Foreign key to Customer
 * - staff_id: Foreign key to Staff (cashier)
 * - prescription_id: Foreign key to Prescription (if applicable)
 */

/**
 * TransactionItem
 * - id: Primary key
 * - transaction_id: Foreign key to Transaction
 * - product_id: Foreign key to Products
 */

/**
 * PurchaseOrder
 * - id: Primary key
 * - supplier_id: Foreign key to Supplier
 * - staff_id: Foreign key to Staff (creator)
 */

/**
 * StaffSchedule
 * - id: Primary key
 * - staff_id: Foreign key to Staff
 * - shift_id: Foreign key to Shift
 */
