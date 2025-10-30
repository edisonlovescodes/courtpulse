import NotificationSettings from './settings-client'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveAdminContext } from '@/lib/whop'

export default async function AdminPage() {
  const hdrs = await headers()
  const ctx = await resolveAdminContext({ headers: hdrs, url: '/admin' })
  if (!ctx.isAdmin) {
    redirect('/')
  }
  return <NotificationSettings />
}
