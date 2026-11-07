import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-4xl font-extrabold text-primary">404</h2>
        <p className="text-base font-semibold">Page Not Found</p>
        <p className="text-xs text-muted-foreground">
          The requested workspace page or resource could not be found.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition-all"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
