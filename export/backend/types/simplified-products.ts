import { z } from 'zod';

// Simplified product schema for mock data
export const simplifiedProductSchema = z.object({
  id: z.string(),
  product_code: z.string(),
  product_name: z.string(),
  price_input: z.number(),
  qty: z.number(),
  sales_unit: z.string()
});

export interface SimplifiedProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  description?: string;
  location?: string;
  unit?: string;
  discountPrice?: number;
  price_input?: number;
  qty?: number;
  sales_unit?: string;
  product_name?: string;
  product_code?: string;
}
