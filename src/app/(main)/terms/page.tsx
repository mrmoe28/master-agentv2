export const metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Master Agent",
};

export default function TermsPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-border px-4">
        <h1 className="font-semibold text-foreground">Terms of Service</h1>
      </header>
      <div className="flex-1 overflow-auto p-6 text-sm text-muted-foreground">
        <p className="mb-4 font-medium text-foreground">Master Agent — Terms of Service</p>
        <p className="mb-4">
          By using Master Agent, you agree to use it in accordance with these terms and with the policies of the services you connect (Google, Twilio, SendGrid).
        </p>
        <p className="mb-4">
          <strong>Acceptable use:</strong> You must not use the application to send spam, abuse APIs, or violate any third-party terms. You are responsible for keeping your API keys and OAuth connections secure.
        </p>
        <p className="mb-4">
          <strong>No warranty:</strong> The application is provided as-is. The developer is not liable for loss of data, failed deliveries, or service interruptions.
        </p>
        <p className="mb-4">
          <strong>Changes:</strong> These terms may be updated. Continued use after changes constitutes acceptance.
        </p>
        <p className="text-xs text-muted-foreground">
          Last updated: February 2025. This is a placeholder; have it reviewed for your use case before production.
        </p>
      </div>
    </div>
  );
}
