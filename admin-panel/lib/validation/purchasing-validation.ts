import * as z from 'zod';

// Supplier validation schemas
export const supplierSchema = z.object({
  supplier_code: z.string().min(1, 'Supplier code is required').max(20, 'Supplier code too long'),
  name: z.string().min(1, 'Supplier name is required').max(100, 'Name too long'),
  company_name: z.string().min(1, 'Company name is required').max(100, 'Company name too long'),
  tax_id: z.string().optional(),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email format'),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  payment_terms: z.number().min(0, 'Payment terms must be positive'),
  credit_limit: z.number().min(0, 'Credit limit must be positive').optional(),
  currency: z.enum(['IDR', 'USD', 'EUR', 'SGD']),
  status: z.enum(['active', 'inactive', 'suspended']),
  rating: z.number().min(1).max(5),
  notes: z.string().optional()
});

export const supplierContactSchema = z.object({
  name: z.string().min(1, 'Contact name is required'),
  position: z.string().min(1, 'Position is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email format'),
  is_primary: z.boolean()
});

// Purchase Order validation schemas
export const purchaseOrderItemSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  quantity_ordered: z.number().min(1, 'Quantity must be at least 1'),
  unit_cost: z.number().min(0, 'Unit cost must be positive'),
  discount_percentage: z.number().min(0).max(100, 'Discount must be between 0-100%').optional(),
  discount_amount: z.number().min(0, 'Discount amount must be positive').optional(),
  tax_percentage: z.number().min(0).max(100, 'Tax must be between 0-100%').optional(),
  tax_amount: z.number().min(0, 'Tax amount must be positive').optional(),
  notes: z.string().optional()
});

export const purchaseOrderSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier is required'),
  order_date: z.string().min(1, 'Order date is required'),
  expected_delivery_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  payment_terms: z.number().min(0, 'Payment terms must be positive').optional(),
  shipping_address: z.string().optional(),
  shipping_cost: z.number().min(0, 'Shipping cost must be positive').optional(),
  discount_amount: z.number().min(0, 'Discount amount must be positive').optional(),
  tax_amount: z.number().min(0, 'Tax amount must be positive').optional(),
  notes: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required')
});

// Purchase Receipt validation schemas
export const purchaseReceiptItemSchema = z.object({
  purchase_order_item_id: z.string().min(1, 'Purchase order item is required'),
  product_id: z.string().min(1, 'Product is required'),
  quantity_received: z.number().min(0, 'Quantity received must be positive'),
  quantity_accepted: z.number().min(0, 'Quantity accepted must be positive'),
  quantity_rejected: z.number().min(0, 'Quantity rejected must be positive'),
  batch_number: z.string().optional(),
  expiry_date: z.string().optional(),
  quality_status: z.enum(['good', 'damaged', 'expired', 'rejected']),
  notes: z.string().optional()
}).refine(
  (data) => data.quantity_accepted + data.quantity_rejected <= data.quantity_received,
  {
    message: 'Accepted + rejected quantities cannot exceed received quantity',
    path: ['quantity_accepted']
  }
);

export const purchaseReceiptSchema = z.object({
  purchase_order_id: z.string().min(1, 'Purchase order is required'),
  received_date: z.string().min(1, 'Received date is required'),
  delivery_note_number: z.string().optional(),
  carrier_name: z.string().optional(),
  received_by: z.string().min(1, 'Received by is required'),
  notes: z.string().optional(),
  items: z.array(purchaseReceiptItemSchema).min(1, 'At least one item must be received')
});

// API query validation schemas
export const purchaseOrderQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  search: z.string().optional(),
  status: z.enum(['draft', 'pending', 'approved', 'sent', 'partial_received', 'received', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  supplier_id: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  sort: z.enum(['po_number', 'supplier_name', 'order_date', 'total_amount', 'status']).optional(),
  order: z.enum(['asc', 'desc']).optional()
});

export const supplierQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  country: z.string().optional(),
  sort: z.enum(['name', 'supplier_code', 'rating', 'created_at']).optional(),
  order: z.enum(['asc', 'desc']).optional()
});

// Status update validation
export const purchaseOrderStatusUpdateSchema = z.object({
  status: z.enum(['draft', 'pending', 'approved', 'sent', 'partial_received', 'received', 'cancelled']),
  notes: z.string().optional()
});

// Validation helper functions
export const validateSupplier = (data: any) => {
  try {
    return {
      success: true,
      data: supplierSchema.parse(data),
      errors: null
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.reduce((acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        }, {} as Record<string, string>)
      };
    }
    return {
      success: false,
      data: null,
      errors: { general: 'Validation failed' }
    };
  }
};

export const validatePurchaseOrder = (data: any) => {
  try {
    return {
      success: true,
      data: purchaseOrderSchema.parse(data),
      errors: null
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.reduce((acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        }, {} as Record<string, string>)
      };
    }
    return {
      success: false,
      data: null,
      errors: { general: 'Validation failed' }
    };
  }
};

export const validatePurchaseReceipt = (data: any) => {
  try {
    return {
      success: true,
      data: purchaseReceiptSchema.parse(data),
      errors: null
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.reduce((acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        }, {} as Record<string, string>)
      };
    }
    return {
      success: false,
      data: null,
      errors: { general: 'Validation failed' }
    };
  }
};

export const validatePurchaseOrderQuery = (data: any) => {
  try {
    return {
      success: true,
      data: purchaseOrderQuerySchema.parse(data),
      errors: null
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.reduce((acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        }, {} as Record<string, string>)
      };
    }
    return {
      success: false,
      data: null,
      errors: { general: 'Validation failed' }
    };
  }
};

// Business logic validation
export const validatePurchaseOrderBusinessRules = (data: any) => {
  const errors: Record<string, string> = {};

  // Check if delivery date is after order date
  if (data.order_date && data.expected_delivery_date) {
    const orderDate = new Date(data.order_date);
    const deliveryDate = new Date(data.expected_delivery_date);
    
    if (deliveryDate <= orderDate) {
      errors.expected_delivery_date = 'Delivery date must be after order date';
    }
  }

  // Validate item totals
  if (data.items && Array.isArray(data.items)) {
    data.items.forEach((item: any, index: number) => {
      if (item.discount_amount && item.discount_percentage) {
        errors[`items.${index}.discount`] = 'Cannot specify both discount amount and percentage';
      }
      
      if (item.tax_amount && item.tax_percentage) {
        errors[`items.${index}.tax`] = 'Cannot specify both tax amount and percentage';
      }
    });
  }

  return {
    success: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : null
  };
};

export const validateReceiptBusinessRules = (data: any) => {
  const errors: Record<string, string> = {};

  // Check if received date is not in the future
  if (data.received_date) {
    const receivedDate = new Date(data.received_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    if (receivedDate > today) {
      errors.received_date = 'Received date cannot be in the future';
    }
  }

  // Validate expiry dates
  if (data.items && Array.isArray(data.items)) {
    data.items.forEach((item: any, index: number) => {
      if (item.expiry_date) {
        const expiryDate = new Date(item.expiry_date);
        const receivedDate = new Date(data.received_date);
        
        if (expiryDate <= receivedDate) {
          errors[`items.${index}.expiry_date`] = 'Expiry date must be after received date';
        }
      }
      
      // Validate quality status vs quantities
      if (item.quality_status === 'rejected' && item.quantity_accepted > 0) {
        errors[`items.${index}.quality_status`] = 'Rejected items cannot have accepted quantity';
      }
    });
  }

  return {
    success: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : null
  };
};
