import './globals.css';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'SkillProof — Skill Depth Auditor',
  description: 'A resume & job-application tool that audits skill depth and repo interview readiness.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-gray-100 font-sans flex flex-col">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-surface-border py-6 text-center text-xs text-gray-500 glass-panel mt-12">
            SkillProof — Tiered Honesty & Repo Readiness Auditor
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}

