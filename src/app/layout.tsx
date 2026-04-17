import type { Metadata } from 'next';
import './globals.css';
import { SettingsProvider } from '@/hooks/useSettings';

export const metadata: Metadata = {
  title: 'TwinMind — Live Suggestions',
  description: 'Real-time AI meeting copilot with live suggestions',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
