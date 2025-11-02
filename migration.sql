-- Add sport field to all tables for multi-sport support
-- Migration: add_sport_field_for_multi_sport_support

-- 1. Add sport column to GameUnlock
ALTER TABLE "GameUnlock" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'nba';

-- 2. Add sport column to GameView
ALTER TABLE "GameView" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'nba';

-- 3. Add sport column to NotificationSettings
ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'nba';

-- 4. Add sport column to GameNotificationState
ALTER TABLE "GameNotificationState" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'nba';

-- 5. Drop old unique constraints
ALTER TABLE "GameUnlock" DROP CONSTRAINT IF EXISTS "GameUnlock_userId_gameId_period_periodStart_key";
ALTER TABLE "GameView" DROP CONSTRAINT IF EXISTS "GameView_userId_gameId_period_key";
ALTER TABLE "NotificationSettings" DROP CONSTRAINT IF EXISTS "NotificationSettings_companyId_key";
ALTER TABLE "GameNotificationState" DROP CONSTRAINT IF EXISTS "GameNotificationState_companyId_gameId_key";

-- 6. Add new unique constraints with sport field
ALTER TABLE "GameUnlock" ADD CONSTRAINT "GameUnlock_userId_gameId_sport_period_periodStart_key" UNIQUE ("userId", "gameId", "sport", "period", "periodStart");
ALTER TABLE "GameView" ADD CONSTRAINT "GameView_userId_gameId_sport_period_key" UNIQUE ("userId", "gameId", "sport", "period");
ALTER TABLE "NotificationSettings" ADD CONSTRAINT "NotificationSettings_companyId_sport_key" UNIQUE ("companyId", "sport");
ALTER TABLE "GameNotificationState" ADD CONSTRAINT "GameNotificationState_companyId_gameId_sport_key" UNIQUE ("companyId", "gameId", "sport");
