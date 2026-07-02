import { z } from "zod";


const staff = {
  first_name: z.string(),
  last_name: z.string(),
  nik: z.string(),
  dob: z.string(),
  gender: z.string(),
  email: z.string().email(),

  image_id: z.string(),
  phone: z.string(),
  npwp: z.string(),
  street: z.string(),
  province: z.string(),
  city: z.string(),
  district: z.string(),
  postalCode: z.string(),
  job: z.string(),
  latest_education: z.string(),
  department: z.string(),
  str_image: z.string(),
  area_info: z.string(),
  active_status: z.boolean(),
}

export const staffSchema = z.object({
  ...staff
});

export const RetriveStaff = z.object({
  id: z.string(),
  ...staff,
  role: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  staff_data: z.object({
    area_info: z.string(),
    department: z.string(),
    employessId: z.string(),
    id: z.string(),
    job: z.string(),
    staff_id: z.string(),
    str_code: z.string(),
    str_image: z.string()
  })
})

export const SchedulingSchema = z.object({
  id: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  title: z.string(),
  className: z.string(),
  editable: z.boolean(),
  doctor_id: z.string().nullable(),
  staff_id: z.string(),
  employessId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const StaffDataSchema = z.object({
  id: z.string(),
  job: z.string(),
  staff_id: z.string(),
  department: z.string(),
  str_code: z.string(),
  str_image: z.string(),
  area_info: z.string(),
  employessId: z.string(),
  scheduling: z.array(SchedulingSchema),
});

export const RetriveStaffDetail = z.object({
  id: z.string(),
  latest_education: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  nik: z.string(),
  dob: z.string(),
  gender: z.string(),
  email: z.string(),
  age: z.number(),
  image_id: z.string(),
  phone: z.string(),
  npwp: z.string(),
  role: z.string(),
  street: z.string(),
  province: z.string(),
  city: z.string(),
  district: z.string(),
  postalCode: z.string(),
  active_status: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  staff_data: StaffDataSchema,
})

export const createStaffSchema = z.object({
  first_name: z.string().min(2).max(20),
  last_name: z.string().min(2).max(50),
  nik: z.string().min(16),
  dob: z.string(),
  gender: z.string(),
  email: z.string().email(),
  image_id: z.custom<File>((v) => v instanceof File, {
    message: 'Image is required',
  }),
  str_code: z.string(),
  str_image: z.custom<File>((v) => v instanceof File, {
    message: 'Image is required',
  }),
  phone: z.string(),
  npwp: z.string(),
  street: z.string(),
  province: z.string(),
  city: z.string(),
  district: z.string(),
  postalCode: z.string(),
  role: z.string(),
  area_info: z.string(),
  job: z.string(),
  latest_education: z.string(),
  department: z.string(),
  active_status: z.boolean(),
})

export const createCertificateSchema = z.object({
  title: z.string(),
  code: z.string(),
  type: z.string(),
  issued_by: z.string(),
  issued_to: z.string(),
  issued_at: z.string(),
  expires_at: z.string(),
  url: z.custom<File>((v) => v instanceof File, {
    message: 'Image is required',
  }),
})

const CertificateSchema = z.object({
  id: z.number(),
  title: z.string(),
  code: z.string(),
  type: z.string(),
  issued_by: z.string(),
  issued_to: z.string(),
  issued_at: z.string(),
  expires_at: z.string(),
  url: z.string(),
  doctor_id: z.number().nullable(),
  staff_id: z.number(),
  employeeId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.string(),
});

export const scheduleStaffSchema = z.object({
  title: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  className: z.string(),
  editable: z.boolean()
})


const appointmentSchema = z.object({
  id: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  title: z.string(),
  className: z.string(),
  editable: z.boolean(),
  doctor_id: z.union([z.string(), z.null()]),
  staff_id: z.string(),
  employessId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  image_id: z.string(),
  full_name: z.string(),
  job: z.string()
});

export type TypeAppoimentStaff = z.infer<typeof appointmentSchema>
export type TypeStaff = z.infer<typeof RetriveStaff>
export type TypeScheduleStaff = z.infer<typeof scheduleStaffSchema>
export type TypeCreateCertificate = z.infer<typeof createCertificateSchema>
export type TypeCertificate = z.infer<typeof CertificateSchema>