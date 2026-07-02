import { z } from 'zod';
import { productSchema } from './products';

const anotherContactSchema = z.object({
  id: z.string().optional(),
  email: z.string().email(),
  phone: z.string(),
  supplier_id: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

const createAnotherContact = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export const supplierSchema = z.object({
  id: z.string(),
  supplier_code: z.string().optional(),
  company_name: z.string(),
  street: z.string(),
  district: z.string(),
  city: z.string(),
  province: z.string(),
  postal_code: z.string(),
  company_phone: z.string(),
  email: z.string().email(),
  accepted_status: z.string(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  another_contact: z.array(anotherContactSchema),
  product: z.array(productSchema),
});

export const CreateSupplierSchema = z.object({
  company_name: z.string().trim().min(5, { message: 'Nama supplier minimal 5 atau lebih karakter' }),
  street: z.string(),
  district: z.string(),
  city: z.string(),
  province: z.string(),
  postal_code: z.string().optional(),
  company_phone: z.string().min(10, { message: 'Nomor telepon minimal 10 digit' }),
  email: z.string().email(),
  accepted_status: z.string(),
  another_contact: z.array(createAnotherContact).optional()
})

export type CreateSupplier = z.infer<typeof CreateSupplierSchema>
export type Supplier = z.infer<typeof supplierSchema>;
export type CreateAnotherContact = z.infer<typeof createAnotherContact>;