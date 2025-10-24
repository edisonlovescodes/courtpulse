-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameUnlock" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameView" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameUnlock_userId_period_periodStart_idx" ON "GameUnlock"("userId", "period", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "GameUnlock_userId_gameId_period_periodStart_key" ON "GameUnlock"("userId", "gameId", "period", "periodStart");

-- CreateIndex
CREATE INDEX "GameView_userId_gameId_idx" ON "GameView"("userId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GameView_userId_gameId_period_key" ON "GameView"("userId", "gameId", "period");

