import { z } from "zod";

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const productToCart = z.object({
  id: z.string(),
  product_name: z.string(),
  product_code: z.string(),
  qty: z.number(),
  price: z.number(),
  disc: z.string(),
  sales_unit: z.string(),
  status: z.boolean()
})

export const productSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  code: z.string(),
  qty: z.number(),
  sales_unit: z.string(),
  price: z.number(),
  disc: z.string(),
  total_price: z.number(),
  div_area: z.string(),
  buyer_id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const sellingSchema = z.object({
  id: z.string(),
  code: z.string(),
  buyer_name: z.string(),
  phone: z.string(),
  updatedAt: z.string(),
  buyer_expenditure: z.number(),
  prescription: z.boolean(),
  prescription_id: z.union([z.string(), z.null()]),
  prescription_code: z.string().nullable(),
  payment_method: z.string(),
  tax: z.number(),
  med_util_id: z.array(productSchema),
});

export const ProductInfo = z.object({
  product_id: z.string(),
  product_name: z.string(),
  product_code: z.string(),
  price: z.number(),
  qty: z.number(),
  profit: z.string(),
  price_total: z.number(),
  unit: z.string(),
  purchase_unit: z.string(),
  type: z.string(),
  typical: z.string(),
  supplier_id: z.string(),
})

export const OrderDefectaSchema = z.object({
  sender_admin: z.string(),
  product_info: z.array(ProductInfo),
  status: z.string(),
  origin: z.string(),
  destination: z.string(),
  payment_method: z.string(),
  additional_info: z.string(),
});


export const ProductInfoSchema = z.object({
  id: z.string(),
  product_id: z.number(),
  product_name: z.string(),
  price: z.number(),
  qty: z.number(),
  price_total: z.number(),
  purchase_unit: z.string(),
  order_id: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const OrderSchema = z.object({
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
  createdAt: z.string(),
  updatedAt: z.string(),
  product_info: z.array(z.object({
    id: z.string(),
    product_id: z.string(),
    product_name: z.string(),
    product_code: z.string(),
    typical: z.string(),
    type: z.string(),
    price: z.number(),
    qty: z.number(),
    price_total: z.number(),
    profit: z.string(),
    unit: z.string(),
    purchase_unit: z.string(),
    supplier_id: z.string(),
    order_id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })),
});

export const AcceptProductInfo = z.object({
  product_id: z.string(),
  batch_id: z.string(),
  product_name: z.string(),
  product_code: z.string(),
  price: z.number(),
  qty: z.number(),
  status: z.string(),
  price_total: z.number(),
  unit: z.string(),
  profit: z.string(),
  purchase_unit: z.string(),
  type: z.string(),
  expire_date: z.string(),
  supplier_id: z.string(),
});

export const CreateOrderProductSchema = z.object({
  status: z.string(),
  receiver_admin: z.string(),
  additional_info: z.string(),
  origin: z.string(),
  destination: z.string(),
  product_info: z.array(AcceptProductInfo),
});

export type RetriveOrder = z.infer<typeof OrderSchema>
export type ProductInfo = z.infer<typeof ProductInfo>
export type OrderDefecta = z.infer<typeof OrderDefectaSchema>
export type Selling = z.infer<typeof sellingSchema>
export type ProductToCart = z.infer<typeof productToCart>
export type CreateOrderProduct = z.infer<typeof CreateOrderProductSchema>