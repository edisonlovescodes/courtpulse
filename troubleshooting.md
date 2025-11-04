# Multi-Tenant Chat Channel Isolation - Troubleshooting Log

## Problem Statement

CourtPulse is a multi-tenant Whop app where each customer (company) should only see their own chat channels in the settings page. The initial issue was that all customers were seeing the developer's chat channels instead of their own.

## Whop Multi-Tenancy Architecture

- **Companies**: Top-level tenants (e.g., `biz_HUd6NiNNIq9stT`, `biz_mdftd3RMZ5ZOBE`)
- **Experiences**: Sub-entities within a company (e.g., `exp_7geIFl8HJxrTuw`, `exp_dzVVhsWQoECLx1`)
- **Chat Channels**: Belong to experiences (e.g., `chat_feed_1CUX3yteB3Yi2EM4tw3FnK`)
- **Users**: Can be admins of companies/experiences

### Test Accounts

**DEV Account (Developer)**
- Company ID: `biz_HUd6NiNNIq9stT`
- Experience ID: `exp_7geIFl8HJxrTuw`
- Expected channels: From experiences `exp_hK3XVbjps5TQj6`, `exp_iw5OIDlaLcUsan`

**TEST Account (Customer)**
- Company ID: `biz_mdftd3RMZ5ZOBE`
- Experience ID: `exp_dzVVhsWQoECLx1`
- Expected channel: `chat-FpbztfdkvJM94v` from experience `exp_FpbztfdkvJM94v`

## Investigation Timeline

### Phase 1: Initial Discovery (Incorrect Company ID Being Used)

**Symptom**: Both DEV and TEST accounts showed the same channels from `biz_HUd6NiNNIq9stT`.

**Initial Hypothesis**: The company ID was hardcoded or not being extracted correctly.

**Investigation**:
1. Added debug logging to `app/dashboard/[companyId]/settings-client.tsx` to trace company ID usage
2. Checked Vercel server logs vs browser console logs
3. Discovered mismatch:
   - **Browser console** (TEST account): `Company ID extracted from Whop headers: null`
   - **Vercel server logs** (TEST account): `companyId: 'biz_mdftd3RMZ5ZOBE'` ✓

**Key Discovery**: The `resolveAdminContext()` function in `lib/whop.ts` WAS correctly extracting the customer's company ID from Whop headers, but the code wasn't using it!

**Root Cause Found**:
```typescript
// app/dashboard/[companyId]/page.tsx (BEFORE FIX)
return <DashboardSettings companyId={params.companyId} ...
```

The page was passing `params.companyId` (from URL parameter) instead of `ctx.companyId` (from Whop headers).

**Why This Failed**:
- URL parameter: Always `biz_HUd6NiNNIq9stT` (developer's company, possibly from initial setup)
- Whop headers: Correct customer company ID
- Using URL parameter meant all customers got routed to developer's company

### Phase 2: First Fix (Prioritize Header-Extracted Company ID)

**Fix Applied** (Commit: `db1dd38`):
```typescript
// app/dashboard/[companyId]/page.tsx (AFTER FIX)
const resolvedCompanyId = ctx.companyId || params.companyId

const debugInfo = {
  extractedCompanyId: ctx.companyId,
  usedFallback: !ctx.companyId,
  fallbackValue: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
  finalCompanyId: resolvedCompanyId,
  accessLevel: ctx.accessLevel,
  isAdmin: ctx.isAdmin,
}

return <DashboardSettings companyId={resolvedCompanyId} experienceId={ctx.experienceId || undefined} debugContext={debugInfo} />
```

**Result**: Vercel logs confirmed correct company IDs were being extracted:

```
TEST Account:
[resolveAdminContext] Final result: {
  companyId: 'biz_mdftd3RMZ5ZOBE',  ✓
  experienceId: 'exp_dzVVhsWQoECLx1',
  source: 'headers'
}

DEV Account:
[resolveAdminContext] Final result: {
  companyId: 'biz_HUd6NiNNIq9stT',  ✓
  experienceId: 'exp_7geIFl8HJxrTuw',
  source: 'headers'
}
```

**Status**: Multi-tenant isolation at the company level was now working on the server side! ✅

### Phase 3: Client-Side Navigation Issue

**Symptom**: Browser console showed `Company ID extracted from Whop headers: null` after clicking the settings link.

**Hypothesis**: Client-side navigation was losing Whop headers.

**Investigation**:
1. Understood that Whop only sends headers on initial iframe load
2. Next.js `<Link>` components do client-side navigation (no new server request)
3. This meant headers weren't available during client-side navigation

**Attempted Fix** (Commit: `eaf4ad1`):
```typescript
// app/components/AdminCog.tsx
useEffect(() => {
  if (!experienceId && typeof window !== 'undefined') {
    try {
      if (window.parent && window.parent !== window) {
        const parentUrl = window.parent.location.href
        const match = parentUrl.match(/\/((?:exp|xp)_[A-Za-z0-9]+)/)
        if (match) {
          setExperienceId(match[1])
          return
        }
      }
    } catch (e) {
      // Cross-origin iframe
    }

    const match = window.location.pathname.match(/\/((?:exp|xp)_[A-Za-z0-9]+)/)
    if (match) {
      setExperienceId(match[1])
    }
  }
}, [experienceId])

const href = experienceId
  ? `/experiences/${experienceId}/settings`
  : companyId ? `/dashboard/${companyId}` : '/dashboard'
```

**Why This Worked**:
- Experience ID was extracted from URL and persisted in state
- Settings link used `/experiences/${experienceId}/settings` route
- This route calls `getCompanyIdForExperience()` to map experience → company via Whop API
- Even without headers, correct company ID was resolved via the experience ID mapping

**Result**: Both routes now worked:
- `/dashboard/[companyId]`: Works on initial load with headers
- `/experiences/[experienceId]/settings`: Works on client-side navigation via experience mapping

**Status**: Company ID resolution working via multiple strategies! ✅

### Phase 4: "No Chat Channels Found" Issue

**Symptom**: Both TEST and DEV accounts showed "No chat channels found" despite channels existing in Vercel logs.

**Browser Console** (TEST account):
```
[Settings Debug] Company ID extracted from Whop headers: biz_mdftd3RMZ5ZOBE
[Settings Debug] Final company ID: biz_mdftd3RMZ5ZOBE
```

**Vercel Logs** (TEST account):
```
[Channels API] Channel chat_feed_1CUX3EPYfHSkGkuJZ9NPHn:
  experience.id = exp_FpbztfdkvJM94v, experience.name = Chat
```

**Initial Hypothesis**: Channels API was returning empty array.

**Investigation**:
1. Verified API was returning channels in Vercel logs ✓
2. Checked if channels were being fetched by client component
3. Found filtering logic in `app/dashboard/[companyId]/settings-client.tsx`:

```typescript
// PROBLEMATIC CODE
const filteredChannels = experienceId
  ? allChannels.filter((ch: Channel) => ch.experience?.id === experienceId)
  : allChannels
```

**Root Cause Found**:

The client was filtering to show ONLY channels from the current experience, but channels belonged to different experiences within the same company:

**TEST Account Mismatch**:
- Current experience: `exp_dzVVhsWQoECLx1`
- Channel experience: `exp_FpbztfdkvJM94v`
- Filter result: **NO MATCH** → Hidden!

**DEV Account Mismatch**:
- Current experience: `exp_7geIFl8HJxrTuw`
- Channel experience: `exp_iw5OIDlaLcUsan`
- Filter result: **NO MATCH** → Hidden!

**Why This Logic Existed**:
- Original intent was to scope settings to a single experience
- But Whop's architecture allows multiple experiences per company
- Admins should see all channels they own across all experiences

### Phase 5: Final Fix (Remove Experience Filtering)

**Fix Applied** (Commit: `1ad3865`):
```typescript
// app/dashboard/[companyId]/settings-client.tsx (AFTER FIX)
// CHANGED: Show ALL channels from this company, not just current experience
// This allows admins to configure notifications for any channel they own
const filteredChannels = allChannels

console.log('[Settings Debug] Showing all company channels:', filteredChannels.length)
```

**Rationale**:
1. Multi-tenant isolation should be at the **company level**, not experience level
2. Admins should configure notifications for any channel in their company
3. Customers already can't see other companies' channels (API enforces this)

**Result**: Both accounts now show their respective channels! ✅

## Final Architecture

### Multi-Tenant Isolation Layers

1. **API Layer** (`/api/admin/channels`):
   - Filters by `company_id` query parameter
   - Returns only channels belonging to that company
   - Enforced by Whop API

2. **Server Component** (`app/dashboard/[companyId]/page.tsx`):
   - Extracts correct company ID via `resolveAdminContext()`
   - Prioritizes Whop headers over URL parameters
   - Passes company ID to client component

3. **Client Component** (`app/dashboard/[companyId]/settings-client.tsx`):
   - Receives company ID from server
   - Fetches channels via API (company-scoped)
   - Shows ALL channels from the company (no experience filtering)

### Context Resolution Strategy

The app uses multiple strategies to resolve company ID, in priority order:

1. **Headers** (`source: 'headers'`): Whop headers on initial iframe load
2. **Query params** (`source: 'query'`): URL query parameters
3. **Referer** (`source: 'referer'`): Parent iframe URL
4. **Experience mapping** (`source: 'experience_map'`): API lookup via experience ID
5. **Fallback** (`source: 'none'`): Environment variable (dev only)

This multi-strategy approach ensures correct company ID resolution across:
- Initial iframe loads (headers available)
- Client-side navigation (headers not available, use experience mapping)
- Direct URL access (use referer or experience mapping)

## Key Learnings

1. **Always prioritize platform-provided context over URL parameters**: Whop headers contain the authoritative company/experience IDs.

2. **Understand the difference between server and client state**: Browser console showing `null` doesn't mean the server isn't working correctly.

3. **Client-side navigation in Next.js doesn't trigger new server requests**: Headers from initial load aren't available on subsequent client-side navigations.

4. **Multiple resolution strategies are necessary**: Experience ID can be used to map back to company ID when headers aren't available.

5. **Be careful with overly restrictive filtering**: The experience-level filtering was preventing legitimate channels from showing up.

6. **Debug logging is essential**: Structured logging at both server (Vercel) and client (browser console) was critical to diagnosing the issue.

## Testing Checklist

To verify multi-tenant isolation is working:

- [ ] DEV account shows only channels from `biz_HUd6NiNNIq9stT`
- [ ] TEST account shows only channels from `biz_mdftd3RMZ5ZOBE`
- [ ] Settings icon works from home page (initial load with headers)
- [ ] Settings icon works after navigation (client-side nav without headers)
- [ ] Direct URL access to `/experiences/[id]/settings` works
- [ ] Vercel logs show correct company IDs being extracted
- [ ] Browser console shows channels are being displayed
- [ ] No cross-contamination of channels between accounts

## Related Files

- `lib/whop.ts`: Company/experience ID resolution logic
- `app/dashboard/[companyId]/page.tsx`: Server component that resolves company ID
- `app/dashboard/[companyId]/settings-client.tsx`: Client component that displays channels
- `app/experiences/[experienceId]/settings/page.tsx`: Alternative route using experience ID
- `app/components/AdminCog.tsx`: Settings icon that constructs correct URL
- `app/layout.tsx`: Root layout that passes context to AdminCog
- `app/api/admin/channels/route.ts`: API endpoint that fetches channels by company ID

## Commits

1. `db1dd38`: Fix company ID resolution by prioritizing headers over URL params
2. `eaf4ad1`: Add experience ID extraction to AdminCog for client-side navigation
3. `1ad3865`: Remove experience filtering to show all company channels
