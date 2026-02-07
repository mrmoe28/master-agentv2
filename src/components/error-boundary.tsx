"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface State {
  hasError: boolean;
  error?: Error;
}

export class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("RootErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            {this.state.error?.message ?? "An error occurred loading the app."}
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
          >
            Reload page
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
