# 🏀 CourtPulse — NBA Live Scores for Whop

A beautiful, simple Whop app that delivers real-time NBA game scores with intelligent plan-based access limits.

![Brand Colors](https://img.shields.io/badge/Background-FCF6F5-FCF6F5?style=flat-square) ![Text](https://img.shields.io/badge/Text-141212-141212?style=flat-square) ![Accent](https://img.shields.io/badge/Accent-FA4616-FA4616?style=flat-square)

## 💰 Pricing Strategy (Per-Community)

Built using [Alex Hormozi's value-based pricing framework](https://www.acquisition.com/):

| Plan | Access | Price | Target Audience |
|------|--------|-------|----------------|
| **Community Starter** | 1 live game/week | **$19/mo** | Small communities (<100 members) |
| **Pro Locker Room** | 1 live game/day | **$79/mo** | Active communities (100-1K members) - **Magnetic Middle** |
| **Franchise Max** | Unlimited games | **$249/mo** | Premium communities (1K+ members) |

**Key Insight:** Pricing is per-community (not per-user), maximizing value for creators while keeping costs predictable.

## 🎨 Brand Identity

```css
--brand-bg: #FCF6F5;     /* Soft cream background */
--brand-text: #141212;   /* Near-black text */
--brand-accent: #FA4616; /* Vibrant orange-red */
```

## 🚀 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **Database:** Prisma ORM
  - Local dev: SQLite
  - Production: PostgreSQL (Vercel Postgres, Supabase, or Neon)
- **Auth:** Whop SDK (header-based)
- **Data Source:** [NBA.com Public API](https://cdn.nba.com/static/json/liveData) (free, no key required)
- **Hosting:** Vercel

## 🏗️ Architecture

```
app/
├── api/
│   ├── games/
│   │   ├── today/route.ts      # List today's games
│   │   └── [id]/route.ts       # Game detail + limit enforcement
│   └── health/route.ts         # Health check
├── game/[id]/
│   ├── page.tsx                # Game detail page (server)
│   └── viewer.tsx              # Live score viewer (client)
├── layout.tsx                  # Root layout
├── page.tsx                    # Homepage (game list)
└── globals.css                 # Global styles

lib/
├── ball.ts                     # BallDontLie API wrapper
├── limits.ts                   # Plan enforcement logic
├── prisma.ts                   # Prisma client
├── signing.ts                  # Token verification (placeholder)
└── whop.ts                     # Whop auth helpers

prisma/
└── schema.prisma               # Database schema
```

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- (Optional) PostgreSQL for production

### Setup

```bash
# 1. Clone or navigate to the project
cd courtpulse

# 2. Install dependencies
npm install
# or: pnpm install / yarn install

# 3. Set up environment variables
cp .env.example .env

# 4. Generate Prisma client
npm run prisma:generate

# 5. Run migrations (creates SQLite database)
npm run prisma:migrate

# 6. Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🔐 Authentication & Plans

### Development Mode

The app reads user context from:
1. **Headers** (highest priority):
   - `X-Whop-User-Id` — user ID
   - `X-Whop-Plan` — `starter` | `pro` | `max`
   - `Whop-Signed-Token` — (optional) signed JWT for production

2. **Environment fallback** (`.env`):
   ```env
   DEV_USER_ID="dev_user_1"
   DEV_PLAN="pro"
   ```

### Production (Whop Integration)

When deployed inside Whop:
- Whop passes user context via signed headers
- Backend verifies `Whop-Signed-Token` using `WHOP_APP_SECRET`
- Plan entitlements are mapped in [lib/whop.ts:55](lib/whop.ts#L55) `getPlanForWhopUser()`

**TODO:** Wire real Whop API calls to fetch user entitlements.

## 📡 API Endpoints

### `GET /api/games/today`
Returns list of today's NBA games.

**Response:**
```json
{
  "games": [
    {
      "id": 12345,
      "homeTeam": "Los Angeles Lakers",
      "awayTeam": "Golden State Warriors",
      "homeScore": 98,
      "awayScore": 102,
      "status": "In Progress",
      "period": 3
    }
  ]
}
```

### `GET /api/games/:id`
Get detailed game info. **Enforces plan limits for live games.**

**Response (allowed):**
```json
{
  "id": 12345,
  "homeTeam": "Los Angeles Lakers",
  "awayTeam": "Golden State Warriors",
  "homeScore": 98,
  "awayScore": 102,
  "status": "In Progress",
  "period": 3,
  "allowed": true
}
```

**Response (limit reached):**
```json
{
  "id": 12345,
  "homeTeam": "Los Angeles Lakers",
  "awayTeam": "Golden State Warriors",
  "homeScore": 98,
  "awayScore": 102,
  "status": "In Progress",
  "period": 3,
  "allowed": false,
  "reason": "Limit reached: 1 live game/week"
}
```

## 🎯 Features

### ✅ Current (v1.0)
- [x] Live NBA score fetching from BallDontLie
- [x] Plan-based access control (Starter/Pro/Max)
- [x] Usage tracking per week/day/unlimited
- [x] Beautiful, responsive UI with live indicators
- [x] Auto-refresh every 10 seconds for live games
- [x] Mobile-optimized design
- [x] Whop iFrame embedding ready

### 🔜 Planned (v2.0+)
- [ ] Real Whop OAuth integration
- [ ] Team filters & favorites
- [ ] Push notifications for close games
- [ ] Box score stats
- [ ] Dark mode
- [ ] Multi-sport support (NFL, MLB)

## 🚢 Deployment

### Vercel (Recommended)

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Deploy to Vercel:**
   - Import project from GitHub
   - Framework preset: Next.js
   - Add environment variables:
     ```env
     DATABASE_URL=<postgres-connection-string>
     WHOP_APP_SECRET=<your-whop-secret>
     DEV_USER_ID=dev_user_1
     DEV_PLAN=pro
     ```

3. **Database Migration:**
   ```bash
   # After first deploy, run migrations
   npx prisma migrate deploy
   ```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `WHOP_APP_SECRET` | Production | Whop app secret for token verification |
| `DEV_USER_ID` | Dev only | Default user ID for local testing |
| `DEV_PLAN` | Dev only | Default plan (`starter`/`pro`/`max`) |
| `NEXT_PUBLIC_WHOP_APP_ID` | Production | Whop app ID (client-side) |

## 🔒 Security

- **iFrame Embedding:** Configured in [next.config.ts](next.config.ts) and [vercel.json](vercel.json)
  - CSP: `frame-ancestors 'self' *.whop.com`
  - X-Frame-Options: deprecated; relying on CSP `frame-ancestors`

## 🧭 Clean Launch Checklist (Whop + Vercel)

- Vercel
  - Create a project from `courtpulse/`
  - Set Node 18+ runtime, build command defaults
  - Add env: `DATABASE_URL` (Postgres), `WHOP_APP_SECRET`, `WHOP_API_KEY`, `NEXT_PUBLIC_WHOP_APP_ID`, `NEXT_PUBLIC_WHOP_AGENT_USER_ID`, `NEXT_PUBLIC_WHOP_COMPANY_ID`, optional `WHOP_PLAN_MAP`
  - Deploy, then run `npx prisma migrate deploy` if needed
- Database
  - Use Vercel Postgres/Neon/Supabase, set `DATABASE_URL`
- Domain
  - Add production domain and use it in Whop iFrame settings
- Whop Dashboard
  - Create App (name, icon 1024x1024, screenshots, description, support email)
  - Configure iFrame URL to your Vercel domain
  - Set the signed token secret (same as `WHOP_APP_SECRET`)
  - Create three products: Starter, Pro, Max, with your pricing
  - Note their product IDs and set `WHOP_PLAN_MAP` like `prodStarter:starter,prodPro:pro,prodMax:max`
  - Configure a webhook to `POST /api/webhooks/whop`
- QA in Whop
  - Test as a buyer; confirm signed token arrives and plan limit enforcement works
  - Verify live scores update in both list and detail views
- Submit to App Store
  - Complete listing (SEO title, summary, category)
  - Add Terms/Privacy links; pass review

## 🔧 Whop Environment Variables

- Server-only
  - `WHOP_API_KEY` — Whop API key for server-side entitlement checks
  - `WHOP_APP_SECRET` — shared secret to verify `Whop-Signed-Token`
  - `WHOP_PLAN_MAP` — map product IDs or slugs to `starter|pro|max` (e.g. `prodA:starter,prodB:pro,prodC:max`)
- Client-exposed
  - `NEXT_PUBLIC_WHOP_APP_ID`
  - `NEXT_PUBLIC_WHOP_AGENT_USER_ID`
  - `NEXT_PUBLIC_WHOP_COMPANY_ID`

## 🔔 Webhooks

- Endpoint: `POST /api/webhooks/whop` (stubbed to log events)
- Add `WHOP_WEBHOOK_SECRET` and implement signature verification as needed

- **Token Verification:** Placeholder HMAC-SHA256 implementation in [lib/signing.ts](lib/signing.ts)
  - **TODO:** Replace with Whop's official token verification

- **Plan Enforcement:** Server-side only - clients cannot bypass limits

## 📊 Database Schema

```prisma
model User {
  id        String   @id
  createdAt DateTime @default(now())
}

model GameUnlock {
  userId      String
  gameId      Int
  period      String   // 'day' | 'week'
  periodStart DateTime
  @@unique([userId, gameId, period, periodStart])
}

model GameView {
  userId    String
  gameId    Int
  period    Int      // Quarter number
  @@unique([userId, gameId, period])
}
```

**Key Logic:**
- `GameUnlock` tracks which games a user has "unlocked" in a given period
- `GameView` logs per-quarter views (for future analytics)
- Weekly periods start on **Sunday** (see [lib/limits.ts:10](lib/limits.ts#L10))

## 🧪 Testing

```bash
# Run Next.js linter
npm run lint

# Build for production
npm run build

# Start production server locally
npm run start

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

## 🐛 Troubleshooting

### Build fails with Prisma errors
```bash
npm run prisma:generate
```

### Database out of sync
```bash
npm run prisma:migrate
```

### No games showing
- Check if NBA season is active
- Verify NBA.com API is reachable: [https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json](https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json)

## 📝 License

MIT

## 🙏 Credits

- **Data:** [NBA.com Public API](https://www.nba.com/)
- **Pricing Framework:** [Alex Hormozi - Value Equation](https://www.acquisition.com/)
- **Platform:** [Whop](https://whop.com/)

---

**Built with ❤️ for sports communities**
