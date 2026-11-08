import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/context/auth-context';
import { DataProvider } from '@/lib/context/data-context';

export const metadata: Metadata = {
  title: 'ChromaDiaries Workspace - Centralized Management Platform',
  description: 'Team management, dynamic workflow engine, and carry-forward performance analytics for ChromaDiaries web magazine.',
  icons: {
    icon: '/white.png',
    shortcut: '/white.png',
    apple: '/white.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <AuthProvider>
          <DataProvider>
            {children}
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
