import { redirect } from 'next/navigation'

export default async function ExperiencePage() {
  // For now, just redirect to the main app
  // The experienceId is used by Whop for tracking which community installed the app
  // Since CourtPulse shows all games on the homepage, we don't need separate experience views
  redirect('/')
}
