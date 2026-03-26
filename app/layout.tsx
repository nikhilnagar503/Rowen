import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Rowen',
  description: 'your only data analyst assistant',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} antialiased`}>
        <ClerkProvider>{children}</ClerkProvider>   
      </body>  
    </html>
  );
}
