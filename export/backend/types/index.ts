import { type FileWithPath } from "react-dropzone";
import { z } from "zod";
export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}
export interface DataTableSearchableColumn<TData> {
  id: keyof TData;
  title: string;
}
export interface DataTableFilterableColumn<TData>
  extends DataTableSearchableColumn<TData> {
  options: Option[];
}

export type Province = {
  id: string,
  provinsi: string
}

export type City = {
  id: string,
  provinsi_id: string,
  kabupaten: string
}

export type District = {
  id: string,
  kabupten_id: string,
  kecamatan: string,
  kodepos: string
}

export const ProductTypeSchema = z.object({
  type: z.string()
})

export const CategorySchema = z.object({
  id: z.string().optional(),
  category: z.string().nonempty('Category is required'),
  // image: z.string().optional()
})

export const PurchaseSchema = z.object({
  unit: z.string()
})

export const SalesUnitSchema = z.object({
  unit: z.string()
})

export type ApiResponse<T> = {
  data: T;
};

export type FileWithPreview = FileWithPath & {
  preview: string;
};
export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}