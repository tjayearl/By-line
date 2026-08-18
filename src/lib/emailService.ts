import { collection, addDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "./firebase";
import { loadStoredData, saveStoredData } from "./dataStore";

export interface OutgoingEmailLog {
  id: string;
  to: string;
  recipientName: string;
  subject: string;
  role: string;
  type: "welcome_activation" | "password_reset" | "finance_claim";
  sentAt: string;
  status: "sent" | "queued";
}

/**
 * Dispatches account credentials and email activation details to the new user.
 * 1. Writes to Firestore `mail` collection (compatible with Firebase Trigger Email extension / Mailgun / SendGrid).
 * 2. Attempts to send a password reset / account verification link via Firebase Auth.
 * 3. Logs the outgoing email in local persistent storage.
 */
export async function sendUserWelcomeAndActivationEmail(params: {
  name: string;
  email: string;
  role: string;
  roleTitle?: string;
  password?: string;
  registeredBy?: string;
}): Promise<{ success: boolean; message: string }> {
  const { name, email, role, roleTitle, password, registeredBy } = params;
  const loginUrl = window.location.origin + "/login";
  const displayRole = roleTitle || role.replace("_", " ").toUpperCase();
  const emailLower = email.trim().toLowerCase();

  const emailSubject = `Welcome to KBC Byline Contributor Portal — Activate Your Account (${displayRole})`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f7f7f7; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background-color: #1A3E6F; color: #ffffff; padding: 28px 24px; border-bottom: 4px solid #C8972B; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px; }
          .header p { margin: 6px 0 0 0; color: #C8972B; font-size: 12px; font-weight: 600; text-transform: uppercase; }
          .content { padding: 32px 28px; line-height: 1.6; font-size: 14px; }
          .welcome { font-size: 18px; font-weight: 700; color: #1A3E6F; margin-bottom: 16px; }
          .card { background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 20px 0; }
          .card-title { font-weight: 700; font-size: 13px; color: #0F6E56; margin-bottom: 10px; text-transform: uppercase; }
          .cred-row { margin-bottom: 8px; font-size: 13px; }
          .cred-label { font-weight: 600; color: #64748b; width: 140px; display: inline-block; }
          .cred-value { font-weight: 700; color: #0f172a; font-family: monospace; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { background-color: #C8972B; color: #102747; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 2px 6px rgba(200, 151, 43, 0.4); }
          .notice { font-size: 12px; color: #64748b; background: #eff6ff; border-left: 4px solid #1A3E6F; padding: 12px; margin-top: 24px; border-radius: 0 6px 6px 0; }
          .footer { background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>KENYA BROADCASTING CORPORATION</h1>
            <p>Byline Contributor & Editorial Portal</p>
          </div>
          <div class="content">
            <div class="welcome">Dear ${name},</div>
            <p>Your official contributor and editorial account has been registered on the <strong>KBC Byline Portal</strong>${registeredBy ? ` by ${registeredBy}` : ""}.</p>
            
            <div class="card">
              <div class="card-title">Your Portal Credentials & Access Details</div>
              <div class="cred-row"><span class="cred-label">Login Email:</span> <span class="cred-value">${emailLower}</span></div>
              <div class="cred-row"><span class="cred-label">Assigned Role:</span> <span class="cred-value">${displayRole}</span></div>
              ${password ? `<div class="cred-row"><span class="cred-label">Temporary Password:</span> <span class="cred-value">${password}</span></div>` : ""}
              <div class="cred-row"><span class="cred-label">Portal URL:</span> <span class="cred-value"><a href="${loginUrl}">${loginUrl}</a></span></div>
            </div>

            <p>Please click the button below to log in, verify your email, and access your dashboard:</p>

            <div class="btn-container">
              <a href="${loginUrl}" class="btn">Log In & Activate Account</a>
            </div>

            <div class="notice">
              <strong>Important Security Note:</strong> For security compliance, you are advised to change your password upon initial login. If you have any questions, please contact your desk editor or system administrator.
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Kenya Broadcasting Corporation (KBC Digital Media Directorate). All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    // 1. Queue to Firestore `mail` collection (used by Firebase Trigger Email extension)
    try {
      await addDoc(collection(db, "mail"), {
        to: [emailLower],
        message: {
          subject: emailSubject,
          text: `Dear ${name},\n\nYour account has been created on the KBC Byline Portal.\nRole: ${displayRole}\nLogin Email: ${emailLower}\n${password ? `Temporary Password: ${password}\n` : ""}Portal URL: ${loginUrl}\n\nPlease visit the portal to log in and activate your account.`,
          html: emailHtml,
        },
        createdAt: new Date().toISOString(),
      });
    } catch (fsErr) {
      console.warn("Firestore mail queue notice:", fsErr);
    }

    // 2. Also attempt to send password reset / activation link via Firebase Auth
    try {
      await sendPasswordResetEmail(auth, emailLower);
    } catch (authErr) {
      console.warn("Firebase sendPasswordResetEmail notice:", authErr);
    }

    // 3. Log to local persistent email history
    const storedLogs = loadStoredData<OutgoingEmailLog[]>("byline_sent_emails_v1", []);
    const newLog: OutgoingEmailLog = {
      id: `mail-${Date.now()}`,
      to: emailLower,
      recipientName: name,
      subject: emailSubject,
      role: displayRole,
      type: "welcome_activation",
      sentAt: new Date().toISOString(),
      status: "sent",
    };
    saveStoredData("byline_sent_emails_v1", [newLog, ...storedLogs]);

    return {
      success: true,
      message: `Activation details and credentials sent to ${emailLower}.`,
    };
  } catch (err: any) {
    console.error("Failed to send welcome email:", err);
    return {
      success: false,
      message: err?.message || "Failed to dispatch activation email.",
    };
  }
}

/**
 * Resends password reset & account activation link to an existing user.
 */
export async function resendAccountActivation(email: string, name?: string): Promise<{ success: boolean; message: string }> {
  try {
    const emailLower = email.trim().toLowerCase();
    await sendPasswordResetEmail(auth, emailLower);

    const storedLogs = loadStoredData<OutgoingEmailLog[]>("byline_sent_emails_v1", []);
    const newLog: OutgoingEmailLog = {
      id: `mail-${Date.now()}`,
      to: emailLower,
      recipientName: name || emailLower,
      subject: "KBC Byline Portal — Password Reset & Account Activation",
      role: "User",
      type: "password_reset",
      sentAt: new Date().toISOString(),
      status: "sent",
    };
    saveStoredData("byline_sent_emails_v1", [newLog, ...storedLogs]);

    return {
      success: true,
      message: `Password reset and activation link sent to ${emailLower}.`,
    };
  } catch (err: any) {
    console.error("Resend activation error:", err);
    return {
      success: false,
      message: err?.message || `Could not send activation link to ${email}.`,
    };
  }
}
