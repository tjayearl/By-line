import { jsPDF } from "jspdf";
import type { PaymentClaim, Submission } from "../types";
import { parseBankDetails } from "./dataStore";
import { richTextToPlain } from "./richText";

export function generateStoriesReportPDF(claim: PaymentClaim) {
  const doc = new jsPDF();

  // Color Palette Constants
  const NAVY = [26, 62, 111];    // #1A3E6F
  const GOLD = [200, 151, 43];   // #C8972B
  const TEAL = [15, 110, 86];    // #0F6E56
  const OFFWHITE = [247, 247, 247]; // #F7F7F7
  const DARK = [30, 41, 59];

  // Header Banner (Navy #1A3E6F)
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, 210, 36, "F");

  // Gold Accent Line
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(0, 36, 210, 3, "F");

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("KBC BYLINE — STORIES REPORT", 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Official Payment Claim Request | Kenya Broadcasting Corporation", 14, 26);

  doc.setFontSize(9);
  doc.text(`Ref: ${claim.id} | Month: ${claim.month}`, 140, 26);

  // Correspondent Information Block
  let y = 46;
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Correspondent Information & Bank Profile", 14, y);

  const parsed = parseBankDetails(claim.bankDetails);
  const bankName = claim.bankName || parsed.bankName || "—";
  const branch = claim.branch || parsed.branch;
  const accountNumber = claim.accountNumber || parsed.accountNumber || "—";

  y += 5.5;
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${claim.correspondentName}`, 14, y);
  doc.text(`Bank Name: ${bankName}${branch ? ` (${branch})` : ""}`, 110, y);

  y += 4.5;
  doc.text(`Email: ${claim.correspondentEmail}`, 14, y);
  doc.text(`Account No: ${accountNumber}`, 110, y);

  y += 4.5;
  doc.text(`Phone: ${claim.correspondentPhone}`, 14, y);
  doc.text(`Claim Status: ${claim.status.toUpperCase()}`, 110, y);

  y += 4.5;
  doc.text(`Generated Date: ${new Date(claim.createdAt).toLocaleDateString()}`, 14, y);

  y += 8;
  // Section Header (Navy #1A3E6F)
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(14, y, 182, 8, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Approved Filings & Platform Rate Breakdown", 18, y + 5.5);

  y += 12;

  // Table Headers
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Assignment Title / Filing", 16, y);
  doc.text("Platforms Aired", 115, y);
  doc.text("Verified", 155, y);
  doc.text("Rate (KES)", 182, y);

  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y, 196, y);
  y += 4;

  let totalCalculated = 0;

  // Submissions Rows with Alternating Off-White #F7F7F7
  claim.submissions.forEach((sub: Submission, index: number) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(OFFWHITE[0], OFFWHITE[1], OFFWHITE[2]);
      doc.rect(14, y - 4, 182, 12, "F");
    }

    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);

    // Truncate long titles
    const titleText = sub.assignmentTitle.length > 50 ? sub.assignmentTitle.substring(0, 47) + "..." : sub.assignmentTitle;
    doc.text(titleText, 16, y);

    doc.setFont("helvetica", "normal");
    const platformsFormatted = sub.publishedPlatforms.map((p) => p.replace("_", " ").toUpperCase()).join(", ") || "TV/Radio";
    doc.text(platformsFormatted.substring(0, 25), 115, y);

    // Proof confirmed tag in Teal
    if (sub.proofConfirmed) {
      doc.setTextColor(TEAL[0], TEAL[1], TEAL[2]);
      doc.setFont("helvetica", "bold");
      doc.text("VERIFIED", 155, y);
    } else {
      doc.setTextColor(200, 0, 0);
      doc.text("PENDING", 155, y);
    }

    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.setFont("helvetica", "bold");
    const amountStr = `KES ${sub.calculatedAmountKES.toLocaleString()}`;
    doc.text(amountStr, 196 - doc.getTextWidth(amountStr), y);

    totalCalculated += sub.calculatedAmountKES;
    y += 12;

    if (y > 260) {
      doc.addPage();
      y = 20;
    }
  });

  y += 4;
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setLineWidth(0.8);
  doc.line(14, y, 196, y);

  y += 8;

  // Total Payment Box in Gold #C8972B
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(110, y, 86, 18, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL AMOUNT DUE:", 114, y + 7);

  doc.setFontSize(14);
  const grandTotalStr = `KES ${claim.totalAmountKES.toLocaleString()}`;
  doc.text(grandTotalStr, 192 - doc.getTextWidth(grandTotalStr), y + 13);

  // Footer notes & signatures
  y += 30;
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("This Stories Report is auto-generated by KBC Byline Contributor Portal. Attach this PDF to your claim lodged with Finance.", 14, y);

  y += 15;
  doc.setFont("helvetica", "bold");
  doc.text("Correspondent Signature: _______________________", 14, y);
  doc.text("Managing Editor Sign-off: _______________________", 110, y);

  // Save the PDF
  doc.save(`KBC_Byline_StoriesReport_${claim.month.replace(" ", "_")}_${claim.correspondentName.replace(" ", "_")}.pdf`);
}

export interface DurationPaymentReportParams {
  title?: string;
  startDate: string;
  endDate: string;
  periodLabel: string;
  correspondentFilterName?: string;
  bankName?: string;
  branch?: string;
  accountNumber?: string;
  bankDetails?: string;
  submissions: Submission[];
  totalAmountKES: number;
  paidAmountKES?: number;
  pendingAmountKES?: number;
  generatedBy?: string;
  userRole?: string;
}

export function generateDurationPaymentReportPDF(params: DurationPaymentReportParams) {
  const doc = new jsPDF();

  const NAVY = [26, 62, 111];    // #1A3E6F
  const GOLD = [200, 151, 43];   // #C8972B
  const TEAL = [15, 110, 86];    // #0F6E56
  const OFFWHITE = [247, 247, 247]; // #F7F7F7
  const DARK = [30, 41, 59];

  // Header Banner (Navy #1A3E6F)
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, 210, 36, "F");

  // Gold Accent Line
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(0, 36, 210, 3, "F");

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("KBC BYLINE — PAYMENT DISBURSEMENT REPORT", 14, 18);

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text("Official Periodic Remittance & Claims Statement | Kenya Broadcasting Corporation", 14, 26);

  doc.setFontSize(9);
  doc.text(`Duration: ${params.periodLabel}`, 125, 26);

  // Metadata & Filters Block
  let y = 46;
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Report Parameters & Summary", 14, y);

  y += 5.5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Target Scope: ${params.correspondentFilterName || "All Correspondents"}`, 14, y);
  doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 120, y);

  y += 4.5;
  doc.text(`Date Range: ${params.startDate} to ${params.endDate}`, 14, y);
  doc.text(`Generated By: ${params.generatedBy || "Finance Desk"}${params.userRole ? ` (${params.userRole})` : ""}`, 120, y);

  if (params.bankName || params.accountNumber || params.bankDetails) {
    const parsed = parseBankDetails(params.bankDetails);
    const bName = params.bankName || parsed.bankName || "—";
    const bBranch = params.branch || parsed.branch;
    const bAcc = params.accountNumber || parsed.accountNumber || "—";
    y += 4.5;
    doc.text(`Bank Account: ${bName}${bBranch ? ` (${bBranch})` : ""} | A/C: ${bAcc}`, 14, y);
  }

  y += 5;
  // Summary Metrics Banner Box
  doc.setFillColor(OFFWHITE[0], OFFWHITE[1], OFFWHITE[2]);
  doc.setDrawColor(220, 220, 220);
  doc.rect(14, y, 182, 13, "FD");

  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`Total Stories: ${params.submissions.length}`, 20, y + 8);
  doc.text(`Total Period Amount: KES ${params.totalAmountKES.toLocaleString()}`, 75, y + 8);
  if (params.paidAmountKES !== undefined) {
    doc.setTextColor(TEAL[0], TEAL[1], TEAL[2]);
    doc.text(`Paid: KES ${params.paidAmountKES.toLocaleString()}`, 150, y + 8);
  }

  y += 18;

  // Section Header (Navy #1A3E6F)
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(14, y, 182, 7.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Itemized Story Filings & Disbursement Breakdown", 18, y + 5);

  y += 11;

  // Table Headers
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("Date", 16, y);
  doc.text("Filing Title / Ref ID", 40, y);
  doc.text("Correspondent", 108, y);
  doc.text("Platforms", 146, y);
  doc.text("Rate (KES)", 182, y);

  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y, 196, y);
  y += 4;

  let totalCalculated = 0;

  if (params.submissions.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("No story filings found matching the selected duration and filters.", 16, y + 6);
    y += 16;
  } else {
    params.submissions.forEach((sub: Submission, index: number) => {
      const isEven = index % 2 === 0;
      if (isEven) {
        doc.setFillColor(OFFWHITE[0], OFFWHITE[1], OFFWHITE[2]);
        doc.rect(14, y - 3.5, 182, 10, "F");
      }

      doc.setTextColor(DARK[0], DARK[1], DARK[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      // Date
      const dateStr = new Date(sub.submittedAt).toLocaleDateString();
      doc.text(dateStr, 16, y + 2);

      // Title & Ref
      doc.setFont("helvetica", "bold");
      const titleShort = sub.assignmentTitle.length > 36 ? sub.assignmentTitle.substring(0, 33) + "..." : sub.assignmentTitle;
      doc.text(titleShort, 40, y + 2);

      // Correspondent
      doc.setFont("helvetica", "normal");
      const corrShort = (sub.correspondentName || "Correspondent").substring(0, 20);
      doc.text(corrShort, 108, y + 2);

      // Platforms
      const platformsStr = sub.publishedPlatforms.map((p) => p.replace("_", " ")).join(", ") || "Aired";
      doc.text(platformsStr.substring(0, 18), 146, y + 2);

      // Amount
      doc.setFont("helvetica", "bold");
      const amtStr = `KES ${sub.calculatedAmountKES.toLocaleString()}`;
      doc.text(amtStr, 196 - doc.getTextWidth(amtStr), y + 2);

      totalCalculated += sub.calculatedAmountKES;
      y += 10;

      if (y > 265) {
        doc.addPage();
        y = 20;
      }
    });
  }

  y += 4;
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setLineWidth(0.8);
  doc.line(14, y, 196, y);

  y += 6;

  // Total Payment Box in Gold #C8972B
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(110, y, 86, 16, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("TOTAL PERIOD PAYOUT:", 114, y + 6);

  doc.setFontSize(13);
  const grandTotalStr = `KES ${params.totalAmountKES.toLocaleString()}`;
  doc.text(grandTotalStr, 192 - doc.getTextWidth(grandTotalStr), y + 12);

  // Footer notes & signatures
  y += 24;
  if (y > 265) {
    doc.addPage();
    y = 25;
  }
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("This Payment Report was generated from KBC Byline Contributor Portal. Certified for Finance audit & reconciliation.", 14, y);

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.text("Prepared By (Central News Desk): __________________", 14, y);
  doc.text("Managing Editor Sign-off: __________________", 110, y);

  y += 8;
  doc.text("Finance Officer Sign-off: __________________________", 14, y);
  doc.text("Internal Audit Verification: ________________", 110, y);

  const filenameSafePeriod = `${params.startDate}_to_${params.endDate}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filenameScope = (params.correspondentFilterName || "All").replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`KBC_Byline_Payment_Report_${filenameScope}_${filenameSafePeriod}.pdf`);
}

export function exportDurationPaymentReportCSV(params: DurationPaymentReportParams) {
  const headers = [
    "Filing ID",
    "Assignment Title",
    "Correspondent Name",
    "Correspondent ID",
    "Submitted Date",
    "Status",
    "Published Platforms",
    "Proof Confirmed",
    "Calculated Amount (KES)",
    "Period Start",
    "Period End",
  ];

  const rows = params.submissions.map((s) => [
    `"${s.id}"`,
    `"${s.assignmentTitle.replace(/"/g, '""')}"`,
    `"${(s.correspondentName || '').replace(/"/g, '""')}"`,
    `"${s.correspondentId}"`,
    `"${new Date(s.submittedAt).toLocaleDateString()}"`,
    `"${s.status}"`,
    `"${s.publishedPlatforms.join(', ')}"`,
    `"${s.proofConfirmed ? 'Yes' : 'No'}"`,
    s.calculatedAmountKES,
    `"${params.startDate}"`,
    `"${params.endDate}"`,
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  const filename = `KBC_Byline_Payment_Report_${params.startDate}_to_${params.endDate}.csv`;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export interface StoriesPublicationReportParams {
  correspondentName?: string;
  correspondentEmail?: string;
  county?: string;
  periodLabel?: string;
  submissions: Submission[];
  generatedBy?: string;
}

export function generateStoriesPublicationReportPDF(params: StoriesPublicationReportParams) {
  const doc = new jsPDF();

  const NAVY = [26, 62, 111];    // #1A3E6F
  const GOLD = [200, 151, 43];   // #C8972B
  const TEAL = [15, 110, 86];    // #0F6E56
  const OFFWHITE = [247, 247, 247]; // #F7F7F7
  const DARK = [30, 41, 59];

  // Header Banner (Navy #1A3E6F)
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, 210, 36, "F");

  // Gold Accent Line
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(0, 36, 210, 3, "F");

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("KBC BYLINE — PUBLISHED STORIES REPORT", 14, 18);

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text("Official Broadcast, Airing & Editorial Publication Record | Kenya Broadcasting Corporation", 14, 26);

  doc.setFontSize(9);
  doc.text(`Period: ${params.periodLabel || "All Records"}`, 130, 26);

  // Metadata Block
  let y = 46;
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Correspondent & Publication Details", 14, y);

  y += 5.5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Correspondent: ${params.correspondentName || "All Correspondents"}`, 14, y);
  doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 120, y);

  y += 4.5;
  if (params.correspondentEmail) {
    doc.text(`Email: ${params.correspondentEmail}`, 14, y);
  }
  doc.text(`Total Stories Filed: ${params.submissions.length}`, 120, y);

  y += 8;

  // Section Header (Navy #1A3E6F)
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(14, y, 182, 7.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Published Stories, Platforms Aired & Broadcast Verification Links", 18, y + 5);

  y += 12;

  if (params.submissions.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("No stories found for the selected period.", 16, y + 6);
  } else {
    params.submissions.forEach((sub, index) => {
      // Check page break
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      const isEven = index % 2 === 0;
      doc.setFillColor(isEven ? OFFWHITE[0] : 255, isEven ? OFFWHITE[1] : 255, isEven ? OFFWHITE[2] : 255);
      doc.rect(14, y - 4, 182, 32, "F");
      doc.setDrawColor(220, 220, 220);
      doc.rect(14, y - 4, 182, 32, "D");

      // Story Title & Ref
      doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const titleShort = sub.assignmentTitle.length > 60 ? sub.assignmentTitle.substring(0, 57) + "..." : sub.assignmentTitle;
      doc.text(`${index + 1}. ${titleShort}`, 16, y + 1);

      // Verification Badge
      if (sub.proofConfirmed) {
        doc.setTextColor(TEAL[0], TEAL[1], TEAL[2]);
        doc.setFontSize(8);
        doc.text("[PROOF VERIFIED]", 162, y + 1);
      } else {
        doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
        doc.setFontSize(8);
        doc.text("[PENDING PROOF]", 162, y + 1);
      }

      // Metadata line: Filed Date & Correspondent
      doc.setTextColor(DARK[0], DARK[1], DARK[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const dateStr = new Date(sub.submittedAt).toLocaleDateString();
      doc.text(`Filed: ${dateStr} | Ref: ${sub.id} | Author: ${sub.correspondentName}`, 16, y + 6.5);

      // Where Published (Platforms Aired)
      doc.setFont("helvetica", "bold");
      doc.text("Where Published:", 16, y + 12);
      doc.setFont("helvetica", "normal");
      const platformsStr = sub.publishedPlatforms.map((p) => p.replace("_", " ").toUpperCase()).join(", ") || "None marked";
      doc.text(platformsStr, 46, y + 12);

      // Links & Proof
      doc.setFont("helvetica", "bold");
      doc.text("Links / Proof:", 16, y + 17.5);
      doc.setFont("helvetica", "normal");
      const linksArr = [];
      if (sub.proofOfUse?.url) linksArr.push(`Web: ${sub.proofOfUse.url}`);
      if (sub.proofOfUse?.youtubeUrl) linksArr.push(`YouTube: ${sub.proofOfUse.youtubeUrl}`);
      if (sub.proofOfUse?.audioClipUrl) linksArr.push(`Audio: ${sub.proofOfUse.audioClipUrl}`);
      if (sub.wetransferUrl) linksArr.push(`WeTransfer: ${sub.wetransferUrl}`);
      if (sub.mediaFiles?.length > 0) linksArr.push(`${sub.mediaFiles.length} attached media file(s)`);
      const linksStr = linksArr.length > 0 ? linksArr.join(" | ") : "No direct link recorded";
      const linksTrunc = linksStr.length > 85 ? linksStr.substring(0, 82) + "..." : linksStr;
      doc.text(linksTrunc, 38, y + 17.5);

      // Broadcast Notes
      if (sub.proofOfUse?.notes) {
        doc.setFont("helvetica", "bold");
        doc.text("Airing Note:", 16, y + 23);
        doc.setFont("helvetica", "italic");
        const plainNotes = richTextToPlain(sub.proofOfUse.notes).replace(/\s*\n\s*/g, " ");
        const notesTrunc = plainNotes.length > 80 ? plainNotes.substring(0, 77) + "..." : plainNotes;
        doc.text(`"${notesTrunc}"`, 36, y + 23);
      }

      y += 36;
    });
  }

  // Save the PDF
  const filenameScope = (params.correspondentName || "All").replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`KBC_Byline_Published_Stories_Report_${filenameScope}.pdf`);
}

export function exportStoriesPublicationReportCSV(params: StoriesPublicationReportParams) {
  const headers = [
    "Filing Ref ID",
    "Story Headline",
    "Correspondent Name",
    "Correspondent ID",
    "Date Filed",
    "Where Published (Platforms)",
    "Web Article Link",
    "YouTube TV Link",
    "Radio Audio Link",
    "WeTransfer Cloud Link",
    "Attached Files Count",
    "Proof Confirmed",
    "Airing Bulletin Notes",
  ];

  const rows = params.submissions.map((s) => [
    `"${s.id}"`,
    `"${s.assignmentTitle.replace(/"/g, '""')}"`,
    `"${(s.correspondentName || '').replace(/"/g, '""')}"`,
    `"${s.correspondentId}"`,
    `"${new Date(s.submittedAt).toLocaleDateString()}"`,
    `"${s.publishedPlatforms.map(p => p.replace('_', ' ').toUpperCase()).join(', ')}"`,
    `"${s.proofOfUse?.url || ''}"`,
    `"${s.proofOfUse?.youtubeUrl || ''}"`,
    `"${s.proofOfUse?.audioClipUrl || ''}"`,
    `"${s.wetransferUrl || ''}"`,
    s.mediaFiles?.length || 0,
    `"${s.proofConfirmed ? 'Yes' : 'No'}"`,
    `"${richTextToPlain(s.proofOfUse?.notes).replace(/"/g, '""')}"`,
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  const filename = `KBC_Byline_Published_Stories_${(params.correspondentName || 'All').replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
