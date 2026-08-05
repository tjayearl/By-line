export type Role = "super_admin" | "managing_editor" | "editor" | "correspondent";

export type Platform = "tv_national" | "tv_regional" | "radio_national" | "radio_vernacular" | "website" | "social";

export type SubmissionStatus = "pending_review" | "approved" | "revision_needed" | "declined";

export type PaymentStatus = "pending" | "paid";

export interface AppUser {
  uid: string;
  email: string;
  role: Role;
  name: string;
}

export interface Correspondent {
  id: string;
  name: string;
  email: string;
  phone: string;
  idNumber: string;
  bankDetails: string;
  specialisation: string;
}

export interface Assignment {
  id: string;
  title: string;
  brief: string;
  targetPlatform: Platform;
  deadline: string;
  correspondentId: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  correspondentId: string;
  textContent?: string;
  fileUrls: string[];
  status: SubmissionStatus;
  platformsAired: Platform[];
  proofOfUseUrl?: string;
  proofConfirmed: boolean;
  submittedAt: string;
}

export interface RateCardEntry {
  platform: Platform;
  label: string;
  rateKES: number;
}

export interface PaymentClaim {
  id: string;
  correspondentId: string;
  submissionIds: string[];
  totalAmount: number;
  status: PaymentStatus;
  month: string;
}
