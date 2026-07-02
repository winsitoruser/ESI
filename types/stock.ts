import { z } from 'zod';


const ProductStock = z.object({
  id: z.number(),
  product_id: z.number(),
  product_name: z.string(),
  product_code: z.string(),
  price: z.number(),
  price_total: z.number(),
  qty: z.number(),
  comp_stock: z.string().nullable(),
  profit: z.string(),
  unit: z.string(),
  purchase_unit: z.string(),
  type: z.string(),
  typical: z.string().nullable(),
  supplier_id: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Define a schema for the main object
const StockExpired = z.object({
  id: z.number(),
  batch_id: z.string(),
  qty: z.number(),
  expire_date: z.string(),
  unit: z.string(),
  return_status: z.boolean(),
  ph_stock_id: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  product: ProductStock,
});

export type StockExpired = z.infer<typeof StockExpired>
