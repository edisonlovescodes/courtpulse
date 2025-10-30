import './globals.css'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { headers } from 'next/headers'
import { resolveAdminContextFromRequest } from '@/lib/whop'

export const metadata = {
  title: 'CourtPulse - NBA Live Scores',
  description: 'Real-time NBA scores for your community',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Root layout just provides html/body wrapper and global styles
  // Header/nav is rendered by experience layout which has access to experienceId
  return (
    <html lang="en">
      <body className="min-h-screen bg-brand-bg text-brand-text antialiased">
        {children}
      </body>
    </html>
  )
}
