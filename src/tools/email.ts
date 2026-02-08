import { logReportSection } from "./report.js";

// Demo: log and return success. Replace with real SMTP/API in production.
export async function sendEmail(
  recipients: string[],
  subject?: string,
  _bodyTemplate?: string
): Promise<string> {
  const subj = subject ?? "Follow-up";
  // In production: await emailProvider.send({ to: recipients, subject: subj, body: bodyTemplate ?? "Hi, this is a follow-up from our team." });
  console.log(`[EMAIL] To: ${recipients.join(", ")} | Subject: ${subj}`);
  const summary = `Sent ${recipients.length} email(s): ${recipients.join(", ")}. Subject: ${subj}.`;
  logReportSection("Emails sent", summary);
  return summary;
}
