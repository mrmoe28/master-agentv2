export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Master Agent",
};

export default function PrivacyPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-border px-4">
        <h1 className="font-semibold text-foreground">Privacy Policy</h1>
      </header>
      <div className="flex-1 overflow-auto p-6 text-sm text-muted-foreground">
        <p className="mb-4 font-medium text-foreground">Master Agent — Privacy Policy</p>
        <p className="mb-4">
          This application (&quot;Master Agent&quot;) allows you to connect your Google account (Gmail, Calendar, Drive), Twilio, and SendGrid for email and messaging. We do not sell your data.
        </p>
        <p className="mb-4">
          <strong>Data we use:</strong> When you connect Google, we store OAuth tokens on the server (or in your browser session) so we can send email, manage calendar events, and access Drive on your behalf. We do not see or store your Google password. For Twilio and SendGrid, we use the API keys you provide in environment variables.
        </p>
        <p className="mb-4">
          <strong>Data retention:</strong> OAuth tokens are stored until you disconnect the integration. You can revoke access at any time from the Integrations page or from your Google Account settings.
        </p>
        <p className="mb-4">
          <strong>Contact:</strong> For privacy questions, contact the developer at the email shown in the OAuth consent screen (e.g. ekosolarize@gmail.com).
        </p>
        <p className="text-xs text-muted-foreground">
          Last updated: February 2025. This is a placeholder policy; update it for your jurisdiction and practices before production use.
        </p>
      </div>
    </div>
  );
}
