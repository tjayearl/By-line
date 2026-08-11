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

export const INITIAL_ASSIGNMENTS: Assignment[] = [
  {
    id: "ASG-2026-001",
    title: "Nakuru Pyrethrum Farmers Revival Initiative",
    brief: "Cover the county government rollout of subsidised pyrethrum seedlings in Molo. Interview local farmers and county executive officer for agriculture.",
    targetPlatforms: ["tv_national", "website"],
    deadline: "2026-08-15T17:00",
    correspondentId: "corr-101",
    correspondentName: "Jane Wambui",
    assignedBy: "Main Desk Editor",
    createdAt: "2026-08-01T09:00:00Z",
    status: "completed",
  },
  {
    id: "ASG-2026-002",
    title: "Lake Victoria Water Hyacinth Harvesting Machinery Launch",
    brief: "Special report on new automated harvesters deployed at Dunga Beach. Include video package and radio audio clip for Mayienga FM.",
    targetPlatforms: ["tv_national", "radio_vernacular", "social"],
    deadline: "2026-08-18T16:00",
    correspondentId: "corr-102",
    correspondentName: "Omondi Otieno",
    assignedBy: "Senior Desk Editor",
    createdAt: "2026-08-03T10:30:00Z",
    status: "submitted",
  },
  {
    id: "ASG-2026-003",
    title: "Mombasa Port Decongestion & Standard Gauge Railway Connectivity",
    brief: "File text story and high-resolution images on cargo clearance times following new digitalization protocols at Terminal 2.",
    targetPlatforms: ["website", "social"],
    deadline: "2026-08-22T14:00",
    correspondentId: "corr-103",
    correspondentName: "Amina Hassan",
    assignedBy: "Managing Editor",
    createdAt: "2026-08-05T08:15:00Z",
    status: "assigned",
  },
];

export const INITIAL_SUBMISSIONS: Submission[] = [
  {
    id: "SUB-2026-001",
    assignmentId: "ASG-2026-001",
    assignmentTitle: "Nakuru Pyrethrum Farmers Revival Initiative",
    correspondentId: "corr-101",
    correspondentName: "Jane Wambui",
    textContent: "MOLO, KENYA — Over 500 smallholder farmers in Molo sub-county received 200,000 pyrethrum seedlings under the County Agricultural Revival Project. Speaking during the distribution exercise, Governor Susan Kihika highlighted that pyrethrum farming is targeting a revenue boost of KES 500 million annually...",
    mediaFiles: [
      { name: "Molo_Pyrethrum_Package.mp4", url: "#", type: "video", size: "45.2 MB" },
      { name: "Farmer_Interview_Audio.wav", url: "#", type: "audio", size: "12.8 MB" },
      { name: "Seedling_Distribution_Photo1.jpg", url: "#", type: "image", size: "3.4 MB" },
    ],
    submittedAt: "2026-08-02T14:20:00Z",
    status: "approved",
    editorialFeedback: "Excellent coverage with solid audio quality. Approved for Prime Time News.",
    reviewedBy: "Managing Editor",
    reviewedAt: "2026-08-02T16:00:00Z",
    publishedPlatforms: ["tv_national", "website"],
    isPublished: true,
    publishedAt: "2026-08-03T19:00:00Z",
    proofOfUse: {
      url: "https://www.kbc.co.ke/nakuru-pyrethrum-revival-2026",
      youtubeUrl: "https://www.youtube.com/watch?v=kbc_pyrethrum_molo",
      notes: "Aired on KBC Channel 1 News at 7PM & published on website.",
      submittedAt: "2026-08-04T10:00:00Z",
    },
    proofConfirmed: true,
    proofConfirmedBy: "Managing Editor",
    proofConfirmedAt: "2026-08-04T11:00:00Z",
    calculatedAmountKES: 18000,
    claimId: "CLAIM-2026-08-001",
  },
  {
    id: "SUB-2026-002",
    assignmentId: "ASG-2026-002",
    assignmentTitle: "Lake Victoria Water Hyacinth Harvesting Machinery Launch",
    correspondentId: "corr-102",
    correspondentName: "Omondi Otieno",
    textContent: "KISUMU — Kenya Maritime Authority has commissioned two state-of-the-art aquatic weed harvesters to clear 400 hectares of water hyacinth near Dunga Beach. Fishermen have welcomed the move...",
    mediaFiles: [
      { name: "Dunga_Harvester_Video.mp4", url: "#", type: "video", size: "88.1 MB" },
      { name: "Beach_Audio_Luo.wav", url: "#", type: "audio", size: "8.5 MB" },
    ],
    submittedAt: "2026-08-04T11:45:00Z",
    status: "approved",
    editorialFeedback: "Story approved for broadcast. Please upload YouTube broadcast link once aired.",
    reviewedBy: "Desk Editor",
    reviewedAt: "2026-08-04T13:00:00Z",
    publishedPlatforms: ["tv_national", "radio_vernacular"],
    isPublished: true,
    publishedAt: "2026-08-05T13:00:00Z",
    proofOfUse: {
      youtubeUrl: "https://youtube.com/watch?v=kbc_kisumu_hyacinth",
      audioClipUrl: "https://kbc.co.ke/audio/mayienga_hyacinth.mp3",
      notes: "Aired on Channel 1 and Mayienga FM 4PM Bulletin",
      submittedAt: "2026-08-05T15:30:00Z",
    },
    proofConfirmed: true,
    proofConfirmedBy: "Desk Editor",
    proofConfirmedAt: "2026-08-05T16:00:00Z",
    calculatedAmountKES: 18500,
    claimId: undefined,
  },
];

export const INITIAL_CLAIMS: PaymentClaim[] = [
  {
    id: "CLAIM-2026-08-001",
    correspondentId: "corr-101",
    correspondentName: "Jane Wambui",
    correspondentEmail: "jane.wambui@kbc.co.ke",
    correspondentPhone: "+254 712 345 678",
    bankDetails: "KCB Bank - A/C 1184920491 (Nakuru Branch)",
    month: "August 2026",
    submissionIds: ["SUB-2026-001"],
    submissions: [INITIAL_SUBMISSIONS[0]],
    totalAmountKES: 18000,
    status: "pending",
    createdAt: "2026-08-05T12:00:00Z",
  },
];

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
