import { addDays, startOfDay, startOfWeek } from 'date-fns'
import { prisma } from './prisma'
import type { Plan } from './whop'

export type Period = 'day' | 'week'

export function getPeriodStart(period: Period, d = new Date()): Date {
  if (period === 'day') return startOfDay(d)
  // week starts on Sunday (0)
  return startOfWeek(d, { weekStartsOn: 0 })
}

export function getLimitForPlan(plan: Plan): { period: Period; max: number } | null {
  switch (plan) {
    case 'starter':
      return { period: 'week', max: 1 }
    case 'pro':
      return { period: 'day', max: 1 }
    case 'max':
      return null
  }
}

export async function canUnlockGame(userId: string, plan: Plan, gameId: string): Promise<{ allowed: boolean; reason?: string }> {
  const rule = getLimitForPlan(plan)
  if (!rule) return { allowed: true }

  const periodStart = getPeriodStart(rule.period)

  // If already unlocked this game in this period, allow
  const existing = await prisma.gameUnlock.findUnique({
    where: {
      userId_gameId_period_periodStart: {
        userId,
        gameId,
        period: rule.period,
        periodStart,
      },
    },
  }).catch(() => null)

  if (existing) return { allowed: true }

  const used = await prisma.gameUnlock.count({
    where: { userId, period: rule.period, periodStart },
  })

  if (used >= rule.max) {
    return { allowed: false, reason: `Limit reached: ${rule.max} live game/${rule.period}` }
  }
  return { allowed: true }
}

export async function unlockGame(userId: string, plan: Plan, gameId: string): Promise<void> {
  const rule = getLimitForPlan(plan)
  const period: Period = rule ? rule.period : 'day'
  const periodStart = getPeriodStart(period)

  await prisma.gameUnlock.upsert({
    where: {
      userId_gameId_period_periodStart: { userId, gameId, period, periodStart },
    },
    create: { userId, gameId, period, periodStart },
    update: {},
  })
}

export async function logGameView(userId: string, gameId: string, periodNum: number | null): Promise<void> {
  if (!periodNum || periodNum <= 0) return
  try {
    await prisma.gameView.create({ data: { userId, gameId, period: periodNum } })
  } catch (e) {
    // ignore unique constraint conflicts
  }
}
