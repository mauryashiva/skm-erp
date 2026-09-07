import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '../components/providers/theme-provider';
import { AppShell } from '../components/layout/app-shell';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'SKM ERP | SKM STEELS LIMITED',
  description: 'Enterprise Resource Planning Portal - SKM STEELS LIMITED',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20" suppressHydrationWarning>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
