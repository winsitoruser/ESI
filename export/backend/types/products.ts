import { z } from 'zod';


const compositionSchema = z.object({
  name: z.string(),
  value: z.string(),
});

const batch = z.object({
  id: z.string(),
  qty: z.number(),
  expire_date: z.string()
})

export const batchSchema = z.object({
  id: z.string(),
  batch_id: z.string(),
  qty: z.number(),
  expire_date: z.string(),
  unit: z.string(),
  return_status: z.boolean(),
  ph_stock_id: z.string(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});
export const batchProducts = z.object({
  id: z.string(),
  batch_id: z.string(),
  qty: z.number(),
  expire_date: z.string(),
  unit: z.string(),
  return_status: z.boolean(),
  ph_stock_id: z.string(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

export const expired = z.object({
  id: z.string(),
  code: z.string(),
  date: z.string(),
  batch: z.string(),
  product_name: z.string(),
  category: z.string(),
  unit: z.string(),
  total: z.number()
})



export const stokOpname = z.object({
  id: z.string(),
  date: z.string(),
  reporter: z.string(),
  product_name: z.string(),
  reason: z.string(),
  status: z.string(),
  first_name: z.string(),
  last_name: z.string(),

})

const product = {
  id: z.string(),
  admin: z.string(),
  product_name: z.string(),
  product_code: z.string(),
  retail: z.boolean(),
  price_input: z.number(),
  price_output: z.number(),
  profit: z.string(),
  sales_unit: z.string(),
  purchase_unit: z.string(),
  type: z.string(),
  form: z.string(),
  typical: z.string(),
  posologi: z.string(),
  composition: z.array(compositionSchema),
  side_effect: z.string(),
  indication: z.string(),
  how_to_use: z.union([z.string(), z.null()]),
  drug_interactions: z.string(),
  dose: z.string(),
  attention: z.string(),
  contraindication: z.union([z.string(), z.null()]),
  buffer_stock: z.number(),
  manufacturer: z.string(),
  supplier_id: z.string(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
}

export const productInfoSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  product_code: z.string(),
  typical: z.string(),
  type: z.string(),
  price: z.string(),
  qty: z.number(),
  price_total: z.string(),
  profit: z.string(),
  unit: z.string(),
  purchase_unit: z.string(),
  supplier_id: z.string(),
  order_id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const productAcceptance = z.object({
  id: z.string(),
  code: z.string(),
  sender_admin: z.string(),
  receiver_admin: z.string().nullable(),
  status: z.string(),
  origin: z.string(),
  destination: z.string(),
  payment_method: z.string(),
  additional_info: z.string(),
  request: z.boolean(),
  set_payment_status: z.boolean().nullable(),
  received: z.boolean(),
  image: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  product_info: z.array(productInfoSchema),
});


export const productSchema = z.object({ ...product });

export const newProductSchema = z.object({
  product_name: z.string(),
  category: z.string(),
  admin: z.string(),
  price_input: z.number(),
  price_output: z.number(),
  profit: z.string(),
  type: z.string(),
  typical: z.string(),
  sales_unit: z.string(),
  form: z.string(),
  purchase_unit: z.string(),
  buffer_stock: z.number(),
  posology: z.string().optional(),
  composition: z.array(compositionSchema).optional(),
  side_effect: z.string().optional(),
  indication: z.string().optional(),
  how_to_use: z.string().optional(),
  drug_interactions: z.string().optional(),
  dose: z.string().optional(),
  attention: z.string().optional(),
  benefit: z.string().optional(),
  usedBy: z.string().optional(),
  manufacturer: z.string().optional()
})

export const products = z.object({
  ...product,
  qty: z.number(),
  batch: z.array(batchProducts)
})

export type CompositionSchema = z.infer<typeof compositionSchema>
export type ProductWithoutBatch = z.infer<typeof productSchema>
export type CreateProduct = z.infer<typeof newProductSchema>
export type Products = z.infer<typeof products>
export type Batch = z.infer<typeof batchSchema>
export type Expired = z.infer<typeof expired>
export type StokOpname = z.infer<typeof stokOpname>
export type ProductAcceptance = z.infer<typeof productAcceptance>
