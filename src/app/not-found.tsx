import Link from "next/link";

export default function NotFound() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-foreground"
      role="main"
    >
      <h1 className="text-7xl font-bold tracking-tight text-foreground">
        404
      </h1>
      <p className="text-lg text-muted-foreground">
        This page could not be found.
      </p>
      <Link
        href="/"
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Back to home
      </Link>
    </main>
  );
}
