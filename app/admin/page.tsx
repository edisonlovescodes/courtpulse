import NotificationSettings from './settings-client'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isAdminFromHeaders } from '@/lib/whop'

export default async function AdminPage() {
  const hdrs = await headers()
  const isAdmin = isAdminFromHeaders(hdrs)
  if (!isAdmin) {
    redirect('/')
  }
  return <NotificationSettings />
}
