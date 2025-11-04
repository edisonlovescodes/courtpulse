"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'

type AdminCogProps = {
  initialCompanyId?: string | null
  initialExperienceId?: string | null
}

export default function AdminCog({ initialCompanyId, initialExperienceId }: AdminCogProps) {
  const [experienceId, setExperienceId] = useState<string | null>(initialExperienceId ?? null)

  useEffect(() => {
    // Try to extract experience ID from parent iframe URL (Whop context)
    if (!experienceId && typeof window !== 'undefined') {
      try {
        // Check if we're in an iframe and can access parent
        if (window.parent && window.parent !== window) {
          const parentUrl = window.parent.location.href
          const match = parentUrl.match(/\/((?:exp|xp)_[A-Za-z0-9]+)/)
          if (match) {
            setExperienceId(match[1])
            return
          }
        }
      } catch (e) {
        // Cross-origin, can't access parent URL
      }

      // Try to extract from current URL
      const match = window.location.pathname.match(/\/((?:exp|xp)_[A-Za-z0-9]+)/)
      if (match) {
        setExperienceId(match[1])
      }
    }
  }, [experienceId])

  const fallbackCompanyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || ''
  const companyId = initialCompanyId ?? fallbackCompanyId

  // If experienceId is available, link to /experiences/[experienceId]/settings
  // Otherwise fall back to /dashboard/[companyId]
  const href = experienceId
    ? `/experiences/${experienceId}/settings`
    : companyId
      ? `/dashboard/${companyId}`
      : '/dashboard'

  // Debug: Log what URL AdminCog will navigate to
  console.log('[AdminCog] experienceId:', experienceId)
  console.log('[AdminCog] companyId:', companyId)
  console.log('[AdminCog] Settings link href:', href)

  return (
    <Link
      href={href}
      aria-label="Settings"
      className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 p-2 text-gray-700 shadow-sm transition hover:border-brand-accent/60 hover:text-brand-accent"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-4 w-4"
      >
        <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    </Link>
  )
}
