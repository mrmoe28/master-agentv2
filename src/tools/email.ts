import { logReportSection } from "./report.js";

// Demo: log and return success. Replace with real SMTP/API in production.
export async function sendEmail(
  recipients: string[],
  subject?: string,
  bodyTemplate?: string
): Promise<string> {
  const subj = subject ?? "Follow-up";
  const body = bodyTemplate ?? "Hi, this is a follow-up from our team.";
  // In production: await emailProvider.send({ to: recipients, subject: subj, body });
  console.log(`[EMAIL] To: ${recipients.join(", ")} | Subject: ${subj}`);
  const summary = `Sent ${recipients.length} email(s): ${recipients.join(", ")}. Subject: ${subj}.`;
  logReportSection("Emails sent", summary);
  return summary;
}
