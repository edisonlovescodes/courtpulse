-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GameUnlock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GameView" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "GameUnlock_userId_period_periodStart_idx" ON "GameUnlock"("userId", "period", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "GameUnlock_userId_gameId_period_periodStart_key" ON "GameUnlock"("userId", "gameId", "period", "periodStart");

-- CreateIndex
CREATE INDEX "GameView_userId_gameId_idx" ON "GameView"("userId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GameView_userId_gameId_period_key" ON "GameView"("userId", "gameId", "period");
