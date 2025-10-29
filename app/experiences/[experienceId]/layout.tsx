import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import { whopSdk } from '@/lib/whop-sdk'

export default async function ExperienceLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ experienceId: string }>
}) {
  const { experienceId } = await params
  const hdrs = await headers()
  await whopSdk.verifyUserToken(hdrs as any).catch(() => {})

  return (
    <>
      {children}
    </>
  )
}
