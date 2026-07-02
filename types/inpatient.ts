// Types for Inpatient Ward Management System

export interface Room {
  id: string;
  number: string;
  name: string;
  type: 'vip' | 'kelas_1' | 'kelas_2' | 'kelas_3' | 'icu' | 'nicu' | 'isolasi';
  floor: number;
  wing: string; // Sayap gedung
  capacity: number;
  availableBeds: number;
  occupiedBeds: number;
  status: 'available' | 'full' | 'maintenance' | 'closed';
  facilities: string[];
  tariff: {
    daily: number;
    nursing: number;
    doctor: number;
    facilities: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Bed {
  id: string;
  roomId: string;
  number: string;
  position: 'window' | 'door' | 'middle';
  type: 'standard' | 'electric' | 'icu' | 'isolation';
  status: 'occupied' | 'available' | 'maintenance' | 'cleaning' | 'reserved';
  patientId?: string;
  admissionId?: string;
  lastCleaned?: string;
  equipment: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InpatientAdmission {
  id: string;
  patientId: string;
  roomId: string;
  bedId: string;
  admissionNumber: string;
  admissionDate: string;
  expectedDischargeDate?: string;
  actualDischargeDate?: string;
  status: 'active' | 'discharged' | 'transferred' | 'deceased';
  admissionType: 'emergency' | 'elective' | 'transfer' | 'referral';
  diagnosis: {
    primary: string;
    secondary?: string[];
    icdCode: string;
  };
  attendingDoctor: {
    id: string;
    name: string;
    specialization: string;
  };
  nursingTeam: {
    headNurse: string;
    assignedNurses: string[];
  };
  insurance: {
    type: 'bpjs' | 'private' | 'self_pay' | 'company';
    number?: string;
    coverage: number; // percentage
  };
  billing: {
    totalCost: number;
    paidAmount: number;
    outstandingAmount: number;
    dailyRate: number;
  };
  vitalSigns: VitalSignRecord[];
  medications: MedicationRecord[];
  procedures: ProcedureRecord[];
  notes: NursingNote[];
  createdAt: string;
  updatedAt: string;
}

export interface VitalSignRecord {
  id: string;
  admissionId: string;
  timestamp: string;
  bloodPressure: string;
  heartRate: number;
  temperature: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  consciousness: string;
  pain: number; // 0-10 scale
  recordedBy: string;
  notes?: string;
}

export interface VitalSigns {
  id: string;
  patientId: string;
  timestamp: string;
  heartRate: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  temperature: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  recordedBy: string;
  notes?: string;
}

export interface MedicationRecord {
  id: string;
  admissionId: string;
  medicationName: string;
  dosage: string;
  route: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  administeredBy?: string;
  administrationTime?: string;
  status: 'prescribed' | 'administered' | 'missed' | 'discontinued';
  notes?: string;
}

export interface MedicationOrder {
  id: string;
  patientId: string;
  medication: {
    id: string;
    name: string;
    strength: string;
    form: string;
  };
  dosage: string;
  route: string;
  frequency: {
    timesPerDay: number;
    interval: number;
    asNeeded: boolean;
    indication?: string;
  };
  orderDate: string;
  endDate?: string;
  prescribedBy: string;
  status: 'active' | 'completed' | 'discontinued' | 'pending';
  instructions?: string;
}

export interface MedicationAdministration {
  id: string;
  patientId: string;
  medicationOrderId: string;
  dosageGiven: string;
  route: string;
  administeredAt: string;
  administeredBy: string;
  notes?: string;
}

export interface ProcedureRecord {
  id: string;
  admissionId: string;
  procedureName: string;
  procedureCode: string;
  performedDate: string;
  performedBy: string;
  assistedBy?: string[];
  results: string;
  complications?: string;
  notes?: string;
}

export interface NursingNote {
  id: string;
  patientId: string;
  timestamp: string;
  type: 'assessment' | 'intervention' | 'observation' | 'medication' | 'general';
  note: string;
  nurse: string;
}

export interface WardStatistics {
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
  averageLengthOfStay: number;
  admissionsToday: number;
  dischargesToday: number;
  transfersToday: number;
  criticalPatients: number;
}

export interface Patient {
  id: string;
  mrNumber: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  dateOfBirth: string;
  phone: string;
  address: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  insurance: {
    type: 'bpjs' | 'private' | 'self_pay' | 'company';
    number?: string;
  };
  allergies?: string[];
  bloodType?: string;
}

export interface RoomFilter {
  type?: string;
  floor?: number;
  status?: string;
  availability?: 'available' | 'full';
}

export interface AdmissionFilter {
  status?: string;
  admissionType?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  doctorId?: string;
}
