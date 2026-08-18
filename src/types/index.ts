export type Role =
  | "super_admin"
  | "managing_editor"
  | "editor"
  | "correspondent"
  | "adManager"
  | "finance"
  | "digitalOps";

export type Platform =
  | "tv_national"
  | "tv_regional"
  | "radio_national"
  | "radio_vernacular"
  | "website"
  | "social";

export type SubmissionStatus = "pending_review" | "approved" | "revision_needed" | "declined";

export type PaymentStatus = "pending" | "paid";

export interface AppUser {
  uid: string;
  email: string;
  role: Role;
  name: string;
  phone?: string;
  department?: string;
}

export interface SystemUser {
  id: string;
  uid?: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  phone?: string;
  idNumber?: string;
  bankDetails?: string;
  specialisation?: string;
  county?: string;
  registeredAt?: string;
  registeredBy?: string;
  status?: "active" | "inactive";
}

export interface Correspondent {
  id: string;
  name: string;
  email: string;
  phone: string;
  idNumber: string;
  bankDetails: string;
  specialisation: string;
  county?: string;
  registeredAt: string;
  registeredBy?: string;
}

export interface Assignment {
  id: string;
  title: string;
  brief: string;
  targetPlatforms: Platform[];
  deadline: string;
  correspondentId: string;
  correspondentName?: string;
  assignedBy: string;
  createdAt: string;
  status: "assigned" | "submitted" | "completed";
}

export interface MediaFile {
  name: string;
  url: string;
  type: "audio" | "video" | "image" | "document" | "text";
  size?: string;
}

export interface ProofOfUse {
  url?: string;
  youtubeUrl?: string;
  audioClipUrl?: string;
  notes?: string;
  submittedAt?: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  correspondentId: string;
  correspondentName: string;
  textContent?: string;
  mediaFiles: MediaFile[];
  submittedAt: string;
  status: SubmissionStatus;
  editorialFeedback?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  // Publication & Airing details
  publishedPlatforms: Platform[];
  isPublished: boolean;
  publishedAt?: string;
  // Proof of use
  proofOfUse?: ProofOfUse;
  proofConfirmed: boolean;
  proofConfirmedBy?: string;
  proofConfirmedAt?: string;
  // Payment calculation
  calculatedAmountKES: number;
  claimId?: string;
}

export interface RateCardEntry {
  platform: Platform;
  label: string;
  rateKES: number;
  notes: string;
  editableBy: string;
}

export interface PaymentClaim {
  id: string;
  correspondentId: string;
  correspondentName: string;
  correspondentEmail: string;
  correspondentPhone: string;
  bankDetails: string;
  month: string;
  submissionIds: string[];
  submissions: Submission[];
  totalAmountKES: number;
  status: PaymentStatus;
  createdAt: string;
  paidAt?: string;
}
