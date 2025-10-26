# Game Notifications System

CourtPulse includes a powerful live game notifications system that sends real-time NBA game updates to your Whop community chat channels.

## Features

- 🔔 **Real-time Updates**: Get live score updates as games progress
- ⚙️ **Flexible Frequency**: Choose between every point, every minute, or every quarter
- 🎯 **Game Selection**: Track specific games you care about
- 🎮 **Event Notifications**: Special alerts for game start, quarter end, and final score
- 📊 **Smart Updates**: Automatically detects score changes and important game events
- 🔒 **Duplicate Prevention**: Never get the same update twice

## Setup

### 1. Environment Variables

Add these to your `.env` file (or Vercel dashboard):

```env
# Required for Whop API access
WHOP_API_KEY="your_api_key_here"

# Optional: Secure your cron endpoint
CRON_SECRET="your_random_secret"
```

Get your `WHOP_API_KEY` from the Whop dashboard at `/dashboard/developer`.

### 2. Database Setup

The notification system requires two database tables:
- `NotificationSettings`: Stores company notification preferences
- `GameNotificationState`: Tracks last notification state per game

These are automatically created when you deploy or run `npx prisma db push`.

### 3. GitHub Actions Cron Setup (FREE!)

The app uses GitHub Actions to trigger notifications every minute - completely free!

**Setup Steps:**

1. **Add GitHub Secrets**
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add two secrets:
     - `VERCEL_URL`: Your deployed Vercel URL (e.g., `https://your-app.vercel.app`)
     - `CRON_SECRET`: A random secret for securing the endpoint (same as in Vercel env vars)

2. **Enable GitHub Actions**
   - The workflow file is already included at `.github/workflows/notifications-cron.yml`
   - It will automatically start running every minute once you push to main branch

3. **Verify It's Working**
   - Go to your repository → Actions tab
   - You should see "Game Notifications Cron" running every minute
   - Click on a run to see logs

**Note**: GitHub Actions is free for public repositories and has 2,000 minutes/month for private repos on free tier.

## Admin Portal Usage

### Accessing the Settings

Navigate to `/admin` in your deployed app to access the notification settings portal.

### Configuration Steps

1. **Enter Company ID**
   - Find your Company ID in the Whop dashboard URL or environment variables
   - Format: `biz_xxxxxxxxxxxxx`
   - Click "Load Settings" to fetch your configuration

2. **Enable Notifications**
   - Toggle "Enable Game Notifications" to turn the system on/off

3. **Select Chat Channel**
   - Choose which Whop chat channel will receive updates
   - The dropdown shows all available channels in your company

4. **Set Update Frequency**
   - **Every Point**: Send update whenever the score changes (high frequency)
   - **Every Minute**: Send update once per minute during live games
   - **Every Quarter**: Send update only at the end of each quarter

5. **Configure Event Notifications**
   - ✅ Notify when game starts
   - ✅ Notify at end of each quarter
   - ✅ Notify when game ends (final score)

6. **Select Games to Track**
   - Choose which games you want notifications for
   - Only tracked games will send updates
   - Games list refreshes daily with NBA schedule

7. **Save Settings**
   - Click "Save Settings" to apply your configuration

## How It Works

### Notification Flow

1. **Cron Trigger**: Every minute, Vercel Cron calls `/api/cron/notifications`
2. **Settings Lookup**: System finds all companies with notifications enabled
3. **Game Polling**: For each tracked game, fetches latest data from NBA API
4. **State Comparison**: Compares current game state with last notification state
5. **Smart Detection**: Identifies if an update should be sent based on:
   - Score changes
   - Quarter transitions
   - Game status changes (start/end)
   - Update frequency settings
6. **Message Formatting**: Creates a formatted markdown message
7. **Whop API**: Sends message to the configured chat channel
8. **State Update**: Records the new state to prevent duplicates

### Message Format

Messages are sent in markdown format:

```markdown
**Charlotte Hornets @ Washington Wizards**
**Score:** Charlotte Hornets 51 - 62 Washington Wizards
🏀 **Game Starting!**
```

```markdown
**Los Angeles Lakers @ Golden State Warriors**
**Score:** Los Angeles Lakers 98 - 102 Golden State Warriors
📊 Q3 - 5:23
```

## API Endpoints

### Admin Endpoints

#### GET /api/admin/notifications
Get notification settings for a company.

**Query Parameters:**
- `company_id` (required): Your Whop company ID

**Response:**
```json
{
  "settings": {
    "id": 1,
    "companyId": "biz_xxxxx",
    "enabled": true,
    "channelId": "channel_xxxxx",
    "channelName": "General Chat",
    "updateFrequency": "every_point",
    "notifyGameStart": true,
    "notifyGameEnd": true,
    "notifyQuarterEnd": true,
    "trackedGames": ["0022400123", "0022400124"]
  }
}
```

#### POST /api/admin/notifications
Update notification settings.

**Body:**
```json
{
  "companyId": "biz_xxxxx",
  "enabled": true,
  "channelId": "channel_xxxxx",
  "channelName": "General Chat",
  "updateFrequency": "every_minute",
  "notifyGameStart": true,
  "notifyGameEnd": true,
  "notifyQuarterEnd": true,
  "trackedGames": ["0022400123"]
}
```

#### GET /api/admin/channels
List available chat channels.

**Query Parameters:**
- `company_id` (required): Your Whop company ID

**Response:**
```json
{
  "channels": [
    {
      "id": "channel_xxxxx",
      "experience": {
        "id": "exp_xxxxx",
        "name": "General Chat"
      }
    }
  ]
}
```

### Cron Endpoint

#### GET /api/cron/notifications
Processes all active game notifications. Called automatically by Vercel Cron.

**Headers:**
- `Authorization: Bearer <CRON_SECRET>` (optional, for security)

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-10-26T12:00:00.000Z"
}
```

## Troubleshooting

### Notifications Not Sending

1. **Check Cron Job**
   - Verify Vercel Cron is enabled (Pro plan required)
   - Check Vercel dashboard → Project → Settings → Cron Jobs

2. **Verify Settings**
   - Ensure notifications are enabled in `/admin`
   - Confirm a chat channel is selected
   - Check that games are tracked

3. **API Key**
   - Verify `WHOP_API_KEY` is set correctly
   - Key should have `chat:message:create` permission

4. **Check Logs**
   - View Vercel logs for the cron function
   - Look for errors in `/api/cron/notifications`

### Duplicate Notifications

The system uses `GameNotificationState` to prevent duplicates. If you're seeing duplicates:
- Check database for stale state records
- Verify cron isn't running multiple times

### Missing Games

Games list only shows today's games. If no games appear:
- Check if it's game day (NBA season)
- Verify NBA API is accessible
- Check browser console for errors

## Database Schema

### NotificationSettings

```prisma
model NotificationSettings {
  id                   Int      @id @default(autoincrement())
  companyId            String   @unique
  enabled              Boolean  @default(false)
  channelId            String?
  channelName          String?
  updateFrequency      String   @default("every_point")
  notifyGameStart      Boolean  @default(true)
  notifyGameEnd        Boolean  @default(true)
  notifyQuarterEnd     Boolean  @default(true)
  trackedGames         String   @default("") // Comma-separated
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

### GameNotificationState

```prisma
model GameNotificationState {
  id                Int      @id @default(autoincrement())
  companyId         String
  gameId            String
  lastHomeScore     Int      @default(0)
  lastAwayScore     Int      @default(0)
  lastPeriod        Int      @default(0)
  lastStatus        String   @default("")
  lastNotifiedAt    DateTime @default(now())

  @@unique([companyId, gameId])
  @@index([companyId])
}
```

## Security

### Cron Endpoint Protection

Add `CRON_SECRET` to your environment variables and the system will require it:

```env
CRON_SECRET="your_random_secret_here"
```

Then configure your cron job to send:
```
Authorization: Bearer your_random_secret_here
```

### Whop API Permissions

Required permissions for `WHOP_API_KEY`:
- `chat:read` - List chat channels
- `chat:message:create` - Send messages

## Cost Considerations

- **GitHub Actions**: FREE (2,000 minutes/month for private repos, unlimited for public)
- **Vercel Hosting**: FREE (Hobby plan is sufficient)
- **NBA API**: FREE, no rate limits
- **Whop API**: FREE within reasonable limits
- **Database**: Minimal storage needed

**Total Cost: $0/month** 🎉

## Future Enhancements

Potential features to add:
- [ ] Webhook-based updates instead of polling
- [ ] Multiple channel support per company
- [ ] Custom message templates
- [ ] Player stat alerts
- [ ] Close game alerts (within 5 points)
- [ ] Overtime notifications
- [ ] Historical notification log

## Support

For issues or questions:
- Check the main [README.md](./README.md)
- Review Whop API docs: https://docs.whop.com/
- File an issue on GitHub
