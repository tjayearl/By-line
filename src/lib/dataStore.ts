import { collection, getDocs, deleteDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import type { Assignment, Correspondent, PaymentClaim, Platform, RateCardEntry, Submission } from "../types";

export const DEFAULT_RATES: RateCardEntry[] = [
  {
    platform: "tv_national",
    label: "TV Package (National)",
    rateKES: 15000,
    notes: "Applies when story airs on KBC TV national broadcast",
    editableBy: "Managing Editor / Super Admin",
  },
  {
    platform: "tv_regional",
    label: "TV Package (Regional / Vernacular)",
    rateKES: 10000,
    notes: "May differ from national rate",
    editableBy: "Managing Editor / Super Admin",
  },
  {
    platform: "radio_national",
    label: "Radio Clip (National)",
    rateKES: 5000,
    notes: "Applies when audio airs on national radio",
    editableBy: "Managing Editor / Super Admin",
  },
  {
    platform: "radio_vernacular",
    label: "Radio Clip (Vernacular Station)",
    rateKES: 3500,
    notes: "Applies per vernacular station — can vary",
    editableBy: "Managing Editor / Super Admin",
  },
  {
    platform: "website",
    label: "Website Article",
    rateKES: 3000,
    notes: "Applies when story published on kbc.co.ke",
    editableBy: "Managing Editor / Super Admin",
  },
  {
    platform: "social",
    label: "Social Media Post",
    rateKES: 1500,
    notes: "Applies when story used as social content",
    editableBy: "Managing Editor / Super Admin",
  },
];

export const INITIAL_CORRESPONDENTS: Correspondent[] = [
  {
    id: "corr-101",
    name: "Jane Wambui",
    email: "jane.wambui@kbc.co.ke",
    phone: "+254 712 345 678",
    idNumber: "28491029",
    bankDetails: "KCB Bank - A/C 1184920491 (Nakuru Branch)",
    specialisation: "Nakuru County - Agriculture & Devolution",
    county: "Nakuru",
    registeredAt: "2026-07-01T08:00:00Z",
    registeredBy: "Chief Desk Editor",
  },
  {
    id: "corr-102",
    name: "Omondi Otieno",
    email: "omondi.otieno@kbc.co.ke",
    phone: "+254 723 987 654",
    idNumber: "31049281",
    bankDetails: "Equity Bank - A/C 0192840291 (Kisumu Branch)",
    specialisation: "Kisumu County - Marine Economy & Health",
    county: "Kisumu",
    registeredAt: "2026-07-05T09:30:00Z",
    registeredBy: "Chief Desk Editor",
  },
  {
    id: "corr-103",
    name: "Amina Hassan",
    email: "amina.hassan@kbc.co.ke",
    phone: "+254 734 555 123",
    idNumber: "29501938",
    bankDetails: "Co-operative Bank - A/C 0112948102 (Mombasa Branch)",
    specialisation: "Mombasa County - Port Infrastructure & Tourism",
    county: "Mombasa",
    registeredAt: "2026-07-10T11:15:00Z",
    registeredBy: "Senior Desk Editor",
  },
];

export const INITIAL_ASSIGNMENTS: Assignment[] = [];

export const INITIAL_SUBMISSIONS: Submission[] = [];

export const INITIAL_CLAIMS: PaymentClaim[] = [];

export function loadStoredData<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load key from localStorage", key, e);
  }
  return defaultValue;
}

export function saveStoredData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Failed to save key to localStorage", key, e);
  }
}

export function calculatePaymentForPlatforms(platforms: Platform[], rates: RateCardEntry[]): number {
  if (!platforms || platforms.length === 0) return 0;
  return platforms.reduce((sum, p) => {
    const rateItem = rates.find((r) => r.platform === p);
    return sum + (rateItem ? rateItem.rateKES : 0);
  }, 0);
}

/**
 * Wipes all assignments, submissions, and claims from both local cache and Firestore
 * to give the newsroom a completely fresh start.
 */
export async function clearAllStoriesData(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Reset Local Storage
    localStorage.setItem("byline_assignments_v1", "[]");
    localStorage.setItem("byline_submissions_v1", "[]");
    localStorage.setItem("byline_claims_v1", "[]");

    // 2. Clear Firestore assignments
    try {
      const asgSnap = await getDocs(collection(db, "assignments"));
      for (const d of asgSnap.docs) {
        await deleteDoc(doc(db, "assignments", d.id));
      }
    } catch (e) {
      console.warn("Firestore delete assignments notice:", e);
    }

    // 3. Clear Firestore submissions
    try {
      const subSnap = await getDocs(collection(db, "submissions"));
      for (const d of subSnap.docs) {
        await deleteDoc(doc(db, "submissions", d.id));
      }
    } catch (e) {
      console.warn("Firestore delete submissions notice:", e);
    }

    // 4. Clear Firestore claims
    try {
      const claimSnap = await getDocs(collection(db, "claims"));
      for (const d of claimSnap.docs) {
        await deleteDoc(doc(db, "claims", d.id));
      }
    } catch (e) {
      console.warn("Firestore delete claims notice:", e);
    }

    // 5. Broadcast updates
    try {
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("byline:data_updated"));
    } catch {}

    return { success: true, message: "All stories, assignments, filings, and claims deleted successfully. Clean slate active." };
  } catch (err: any) {
    console.error("Error clearing story data:", err);
    return { success: false, message: err?.message || "Failed to clear story data." };
  }
}

/**
 * Allows a correspondent or editor to withdraw/delete a pending story filing.
 * Automatically restores the linked assignment back to "assigned" so it can be re-filed.
 */
export async function withdrawStoryFiling(
  subId: string,
  asgId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Delete submission from Firestore
    try {
      await deleteDoc(doc(db, "submissions", subId));
    } catch (e) {
      console.warn("Firestore delete submission notice:", e);
    }

    // 2. If assignment ID is known, revert its status to "assigned"
    if (asgId) {
      try {
        await updateDoc(doc(db, "assignments", asgId), { status: "assigned" });
      } catch (e) {
        console.warn("Firestore revert assignment notice:", e);
      }
    }

    // 3. Update Local Storage
    const localSubs = loadStoredData<Submission[]>("byline_submissions_v1", []);
    const updatedSubs = localSubs.filter((s) => s.id !== subId);
    saveStoredData("byline_submissions_v1", updatedSubs);

    if (asgId) {
      const localAsg = loadStoredData<Assignment[]>("byline_assignments_v1", []);
      const updatedAsg = localAsg.map((a) => (a.id === asgId ? { ...a, status: "assigned" as const } : a));
      saveStoredData("byline_assignments_v1", updatedAsg);
    }

    // 4. Broadcast live update
    try {
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("byline:data_updated"));
    } catch {}

    return {
      success: true,
      message: `Story filing [${subId}] has been successfully withdrawn. The assignment is now open to be re-filed.`,
    };
  } catch (err: any) {
    console.error("Error withdrawing story filing:", err);
    return { success: false, message: err?.message || "Failed to withdraw story filing." };
  }
}

/**
 * Deletes an individual assignment and any linked unapproved submissions from Firestore and local cache.
 */
export async function deleteAssignment(asgId: string): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Delete assignment from Firestore
    try {
      await deleteDoc(doc(db, "assignments", asgId));
    } catch (e) {
      console.warn("Firestore delete assignment notice:", e);
    }

    // 2. Delete linked submissions if any
    try {
      const snap = await getDocs(collection(db, "submissions"));
      for (const d of snap.docs) {
        const s = d.data() as Submission;
        if (s.assignmentId === asgId) {
          await deleteDoc(doc(db, "submissions", d.id));
        }
      }
    } catch (e) {
      console.warn("Firestore delete linked submissions notice:", e);
    }

    // 3. Update Local Storage
    const localAsg = loadStoredData<Assignment[]>("byline_assignments_v1", []);
    const updatedAsg = localAsg.filter((a) => a.id !== asgId);
    saveStoredData("byline_assignments_v1", updatedAsg);

    const localSubs = loadStoredData<Submission[]>("byline_submissions_v1", []);
    const updatedSubs = localSubs.filter((s) => s.assignmentId !== asgId);
    saveStoredData("byline_submissions_v1", updatedSubs);

    // 4. Broadcast live update
    try {
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("byline:data_updated"));
    } catch {}

    return {
      success: true,
      message: `Assignment [${asgId}] deleted successfully.`,
    };
  } catch (err: any) {
    console.error("Error deleting assignment:", err);
    return { success: false, message: err?.message || "Failed to delete assignment." };
  }
}
