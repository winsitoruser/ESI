import { z } from 'zod';
import { batchSchema } from './products';

const dateTime = {
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
}

const newBatchSchema = z.object({
  qty: z.number(),
  unit: z.string(),
  batch_id: z.string(),
  expire_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const batchReturnSchema = z.object({
  batch_id: z.string(),
  available: z.number(),
  unit_retur: z.string(),
  expire_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});


const detailSchema = z.object({
  code_retur: z.string(),
  product_id: z.string(),
  product_code: z.string(),
  product_name: z.string(),
  new_product: newBatchSchema,
  product_return: batchReturnSchema,
});

export const newProductInfoSchema = z.object({
  product_id: z.string(),
  product_code: z.string(),
  product_name: z.string(),
  new_product: newBatchSchema,
  product_return: batchReturnSchema,
});

export const returNewSchema = z.object({
  company_name: z.string(),
  maker: z.string(),
  additional_info: z.string(),
  product_info: z.array(newProductInfoSchema)
})


export const returSchema = z.object({
  id: z.string(),
  maker: z.string().optional(),
  company_name: z.string(),
  code_retur: z.string(),
  batch: z.array(batchSchema),
  ...dateTime,
});

export const returRetriveSchema = z.object({
  id: z.string(),
  maker: z.string(),
  company_name: z.string(),
  code_retur: z.string(),
  detail: detailSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});


export type BatchOld = z.infer<typeof batchReturnSchema>
export type NewBatch = z.infer<typeof newBatchSchema>
export type ReturNew = z.infer<typeof returNewSchema>
export type ProductRetur = z.infer<typeof returRetriveSchema>