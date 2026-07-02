// Types for Referral System - Outpatient to Inpatient
export interface OutpatientReferral {
  id: string;
  referralNumber: string;
  patientId: string;
  patientVisitId: string; // From RME visit
  referringDoctorId: string;
  referringDoctorName: string;
  referralDate: string;
  urgency: 'emergency' | 'urgent' | 'routine' | 'elective';
  
  // Medical Information
  diagnosis: {
    primary: string;
    secondary?: string[];
    icdCode: string;
  };
  clinicalSummary: string;
  reasonForAdmission: string;
  recommendedTreatment?: string;
  
  // Admission Request Details
  requestedRoomType: 'standard' | 'vip' | 'icu' | 'isolation';
  estimatedLengthOfStay?: number; // in days
  specialRequirements?: string[];
  
  // Status and Workflow
  status: 'pending' | 'approved' | 'rejected' | 'admitted' | 'cancelled';
  approvedBy?: string;
  approvedDate?: string;
  rejectionReason?: string;
  
  // Bed Assignment
  assignedRoomId?: string;
  assignedBedId?: string;
  assignedDate?: string;
  
  // Follow-up
  admissionId?: string; // Links to InpatientAdmission when admitted
  notes?: ReferralNote[];
  
  createdAt: string;
  updatedAt: string;
}

export interface ReferralNote {
  id: string;
  referralId: string;
  timestamp: string;
  type: 'medical' | 'administrative' | 'approval' | 'assignment';
  note: string;
  createdBy: string;
  createdByRole: string;
}

export interface ReferralApproval {
  id: string;
  referralId: string;
  reviewedBy: string;
  reviewedByRole: 'head_nurse' | 'attending_doctor' | 'medical_director';
  reviewDate: string;
  decision: 'approved' | 'rejected' | 'needs_review';
  comments: string;
  conditions?: string[]; // Any conditions for approval
}

export interface BedAvailabilityRequest {
  roomType: string;
  urgency: string;
  specialRequirements?: string[];
  preferredFloor?: number;
  genderPreference?: 'male' | 'female' | 'mixed';
}

export interface BedAvailabilityResponse {
  availableBeds: {
    roomId: string;
    roomName: string;
    bedId: string;
    bedNumber: string;
    roomType: string;
    facilities: string[];
    estimatedCost: number;
  }[];
  waitingList?: {
    position: number;
    estimatedWaitTime: string;
  };
}

export interface ReferralStatistics {
  totalReferrals: number;
  pendingReferrals: number;
  approvedReferrals: number;
  rejectedReferrals: number;
  admittedReferrals: number;
  averageProcessingTime: number; // in hours
  bedUtilizationRate: number;
}

export interface ReferralFilter {
  status?: string;
  urgency?: string;
  roomType?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  doctorId?: string;
  patientId?: string;
}
