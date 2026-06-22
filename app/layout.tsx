import type { Metadata, Viewport } from 'next';
import { Inter, Sora } from 'next/font/google';
import { AuthProvider } from '@/components/AuthContext';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  weight: ['400', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'ConGé - Gestion des congés',
  description: 'Plateforme professionnelle de gestion des congés et des absences',
  creator: 'ConGé',
  keywords: ['congés', 'absence', 'RH', 'gestion', 'vacances'],
  openGraph: {
    type: 'website',
    title: 'ConGé - Gestion des congés',
    description: 'Interface professionnelle de gestion des congés',
    url: 'https://conge.app',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${sora.variable} scroll-smooth`}>
      <body className="bg-background text-foreground font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
