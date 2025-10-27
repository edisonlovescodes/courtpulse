import { WhopServerSdk } from '@whop/api'

export const whopSdk = WhopServerSdk({
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID ?? 'fallback',
  appApiKey: process.env.WHOP_API_KEY ?? 'fallback',
  // Use the agent/owner account for on-behalf-of actions when needed
  onBehalfOfUserId:
    process.env.WHOP_AGENT_USER_ID || process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
  companyId: undefined,
})

