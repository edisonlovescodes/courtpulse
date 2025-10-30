"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'

type AdminCogProps = {
  initialCompanyId?: string | null
}

export default function AdminCog({ initialCompanyId }: AdminCogProps) {
  const [companyId, setCompanyId] = useState<string | null>(initialCompanyId ?? null)
  const [checkedFallback, setCheckedFallback] = useState<boolean>(Boolean(initialCompanyId))
  const [errorLogged, setErrorLogged] = useState(false)

  // DEBUG: Log what AdminCog receives
  useEffect(() => {
    console.log('[AdminCog] Initial props:', { initialCompanyId })
  }, [initialCompanyId])

  useEffect(() => {
    if (companyId || checkedFallback) return

    let cancelled = false
    async function fetchCompanyId() {
      try {
        console.log('[AdminCog] Fetching admin context via API fallback')
        const res = await fetch('/api/admin/context', { cache: 'no-store' })
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        const data = (await res.json()) as { companyId?: string | null }
        if (!cancelled && data?.companyId) {
          console.log('[AdminCog] Fetched company id from API fallback:', data.companyId)
          setCompanyId(data.companyId)
        } else if (!cancelled) {
          console.log('[AdminCog] API fallback returned no company id')
          setCheckedFallback(true)
        }
      } catch (err) {
        if (!cancelled && !errorLogged) {
          console.error('[AdminCog] Fallback fetch failed:', err)
          setErrorLogged(true)
          setCheckedFallback(true)
        }
      }
    }

    fetchCompanyId()
    return () => {
      cancelled = true
    }
  }, [companyId, checkedFallback, errorLogged])

  if (!companyId) {
    console.log('[AdminCog] No companyId - hiding cog')
    return null
  }

  console.log('[AdminCog] Showing cog for company:', companyId)

  return (
    <Link
      href={`/dashboard/${companyId}`}
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
