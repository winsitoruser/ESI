import { z } from "zod";

const retriveCategory = z.object({
  id: z.string(),
  category: z.string(),
  image: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})
const retriveProductType = z.object({
  id: z.string(),
  type: z.string(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
})
const retrivePurchase = z.object({
  id: z.string(),
  unit: z.string(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
})
const retriveSalesUnit = z.object({
  id: z.string(),
  unit: z.string(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
})

export type RetriveCategory = z.infer<typeof retriveCategory>
export type RetriveProductType = z.infer<typeof retriveProductType>
export type RetrivePurchase = z.infer<typeof retrivePurchase>
export type RetriveSalesUnit = z.infer<typeof retriveSalesUnit>