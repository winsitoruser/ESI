import { z } from "zod";

const supplierSchema = z.object({
  id: z.string(),
  supplier_code: z.string(),
  company_name: z.string(),
  street: z.string(),
  district: z.string(),
  city: z.string(),
  province: z.string(),
  postal_code: z.string(),
  company_phone: z.string(),
  email: z.string(),
  accepted_status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  another_contact: z.array(
    z.object({
      id: z.string(),
      email: z.string(),
      phone: z.string(),
      supplier_id: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
  ),
  product: z.array(
    z.object({
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
      typical: z.string().nullable(),
      composition: z.array(
        z.object({
          name: z.string(),
          value: z.string(),
        })
      ),
      side_effect: z.string(),
      indication: z.string().nullable(),
      how_to_use: z.string().nullable(),
      drug_interactions: z.string(),
      dose: z.string(),
      attention: z.string().nullable(),
      contraindication: z.string().nullable(),
      buffer_stock: z.number(),
      manufacturer: z.string(),
      supplier_id: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
  ),
});

const batchSchema = z.object({
  id: z.string(),
  batch_id: z.string(),
  qty: z.number(),
  expire_date: z.string(),
  unit: z.string(),
  return_status: z.boolean(),
  ph_stock_id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const stockSchema = z.array(
  z.object({
    id: z.string(),
    product_id: z.string(),
    product_name: z.string(),
    product_code: z.string(),
    price: z.number(),
    price_total: z.number(),
    qty: z.number(),
    comp_stock: z.nullable(z.number()),
    profit: z.string(),
    unit: z.string(),
    purchase_unit: z.string(),
    type: z.string(),
    typical: z.string().nullable(),
    supplier_id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    batch: z.array(batchSchema),
  })
);

export const RetrivePharmacy = z.object({
  ...supplierSchema.shape,
  product: stockSchema,
})
