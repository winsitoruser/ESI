/**
 * Type definitions for schedule-related data structures
 */

export interface DoctorInfo {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  specialty?: string;
  phone?: string;
}

export interface Appointment {
  id: string;
  scheduleId: string;
  customerId?: string;
  doctorId: string;
  status: string;
  notes?: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  customer?: any;
  doctor?: any;
}

export interface Schedule {
  id: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  title?: string;
  description?: string;
  location?: string;
  capacity: number;
  type: string;
  isRecurring: boolean;
  recurringPattern?: string;
  tenantId: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  appointment?: Appointment[];
  participants?: any[];
  creator?: any;
  user?: any;
}

export interface ScheduleWithDoctor extends Schedule {
  doctorInfo: DoctorInfo;
}

export interface ScheduleStatistics {
  totalSchedules: number;
  upcomingSchedules: number;
  upcomingAppointments: number;
  doctorsWithSchedule: number;
}

export interface ScheduleFilters {
  startDate?: string | Date;
  endDate?: string | Date;
  doctorId?: string;
  status?: string;
  search?: string;
  type?: string;
  limit?: number;
  offset?: number;
}
