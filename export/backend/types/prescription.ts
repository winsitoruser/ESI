import { z } from "zod";

export const MedListSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  code: z.string(),
  unit: z.string(),
  qty: z.number(),
  price: z.number(),
  total_price: z.number(),
  rules: z.string(),
  prescription_id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string(),
});

export const PrescriptionSchema = z.object({
  id: z.string(),
  code: z.string(),
  patient_name: z.string(),
  patient_id: z.string(),
  history_id: z.string(),
  doctor_id: z.string(),
  doctor_name: z.string(),
  div_area: z.string(),
  pres_filled: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  med_list: z.array(MedListSchema),
});


export type Prescription = z.infer<typeof PrescriptionSchema>;