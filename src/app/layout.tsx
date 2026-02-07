import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RootErrorBoundary } from "@/components/error-boundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "Master Agent OS",
  description: "AI control dashboard for autonomous agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <noscript>
          <div className="flex min-h-screen items-center justify-center p-6">
            <p className="text-center text-muted-foreground">
              Master Agent OS requires JavaScript. Please enable it and reload.
            </p>
          </div>
        </noscript>
        <RootErrorBoundary>
          <ThemeProvider>
            <TooltipProvider delayDuration={200}>
              {children}
            </TooltipProvider>
          </ThemeProvider>
        </RootErrorBoundary>
      </body>
    </html>
  );
}
