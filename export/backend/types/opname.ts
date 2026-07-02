import { z } from "zod";

const opnameHalf = z.object({
  id: z.string(),
  updatedAt: z.string().datetime(),
  product_name: z.string(),
  qty: z.number(),
  accept: z.boolean(),
  reject: z.boolean(),
})

export const OpnameBatchSchema = z.object({
  batch: z.string(),
  qty: z.number(),
  real_qty: z.number(),
  expire_date: z.string()
})

export const CreateStockOpnameSchema = z.object({
  Create_Date: z.string(),
  Officer_name: z.string(),
  product_id: z.string(),
  product_code: z.string(),
  product_name: z.string(),
  purchase_unit: z.string(),
  qty: z.number(),
  real_qty: z.number(),
  total_price_difference: z.number(),
  difference: z.number(),
  report_type: z.string(),
  reason: z.string(),
  officer_sign: z.custom<File>((v) => v instanceof File, {
    message: 'Tanda Tangan Petugas Wajib',
  }),
  head_name: z.string(),
  head_sign: z.custom<File>((v) => v instanceof File, {
    message: 'Tanda Tangan Kepala Wajib',
  }),
  batch: z.array(OpnameBatchSchema)
})


const RetriveOpnameSchema = z.object({
  id: z.string(),
  Create_Date: z.string(),
  Officer_name: z.string(),
  head_name: z.nullable(z.string()),
  manager_name: z.nullable(z.string()),
  product_code: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  purchase_unit: z.string(),
  qty: z.number(),
  real_qty: z.number(),
  total_price_difference: z.number(),
  difference: z.number(),
  report_type: z.string(),
  reason: z.string(),
  accept: z.boolean(),
  reject: z.boolean(),
  officer_sign: z.string(),
  head_sign: z.string(),
  manager_sign: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const RetriveOpnameSchemaId = z.object({
  id: z.string(),
  Create_Date: z.string(),
  Officer_name: z.string(),
  head_name: z.nullable(z.string()),
  manager_name: z.nullable(z.string()),
  product_code: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  purchase_unit: z.string(),
  qty: z.number(),
  real_qty: z.number(),
  total_price_difference: z.number(),
  difference: z.number(),
  report_type: z.string(),
  reason: z.string(),
  accept: z.boolean(),
  reject: z.boolean(),
  officer_sign: z.string(),
  head_sign: z.string(),
  manager_sign: z.string(),
  batch: z.array(OpnameBatchSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RetriveOpname = z.infer<typeof RetriveOpnameSchema>
export type RetriveOpnameId = z.infer<typeof RetriveOpnameSchemaId>
export type OpnameHalf = z.infer<typeof opnameHalf>
export type CreateStockOpname = z.infer<typeof CreateStockOpnameSchema>
export type OpnameBatch = z.infer<typeof OpnameBatchSchema>