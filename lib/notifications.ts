import { prisma } from './prisma'
import { getGameById } from './ball'
import { createMessage, formatGameUpdateMessage } from './whop-api'

type EventType = 'score' | 'quarter_end' | 'game_start' | 'game_end'

/**
 * Check all active notification settings and send updates for tracked games
 */
export async function processGameNotifications() {
  try {
    // Get all enabled notification settings
    const allSettings = await prisma.notificationSettings.findMany({
      where: { enabled: true },
    })

    for (const settings of allSettings) {
      const channelIds = settings.channelId
        ? settings.channelId.split(',').map((id) => id.trim()).filter(Boolean)
        : []
      if (channelIds.length === 0 || !settings.trackedGames) {
        continue
      }

      // Parse comma-separated game IDs
      const trackedGames = settings.trackedGames.split(',').filter(Boolean)
      if (trackedGames.length === 0) {
        continue
      }

      // Process each tracked game
      for (const gameId of trackedGames) {
        try {
          await processGameNotification(settings, channelIds, gameId)
        } catch (e) {
          console.error(`Error processing game ${gameId} for company ${settings.companyId}:`, e)
        }
      }
    }
  } catch (e) {
    console.error('Error in processGameNotifications:', e)
  }
}

/**
 * Process notifications for a single game
 */
async function processGameNotification(
  settings: {
    companyId: string
    updateFrequency: string
    notifyGameStart: boolean
    notifyGameEnd: boolean
    notifyQuarterEnd: boolean
  },
  channelIds: string[],
  gameId: string
) {
  if (channelIds.length === 0) return

  // Fetch current game data
  const game = await getGameById(gameId)
  const status = formatGameStatus(game.gameStatus, game.gameStatusText)
  const isLive = game.gameStatus === 2

  // Get or create notification state
  let state = await prisma.gameNotificationState.findUnique({
    where: {
      companyId_gameId: {
        companyId: settings.companyId,
        gameId,
      },
    },
  })

  if (!state) {
    state = await prisma.gameNotificationState.create({
      data: {
        companyId: settings.companyId,
        gameId,
        lastHomeScore: 0,
        lastAwayScore: 0,
        lastPeriod: 0,
        lastStatus: '',
      },
    })
  }

  const homeScore = game.homeTeam.score
  const awayScore = game.awayTeam.score
  const period = game.period

  // Determine if we should send a notification
  let shouldNotify = false
  let eventType: EventType | undefined

  // Game start notification
  if (settings.notifyGameStart && state.lastStatus !== 'Live' && isLive) {
    shouldNotify = true
    eventType = 'game_start'
  }

  // Game end notification
  if (settings.notifyGameEnd && game.gameStatus === 3 && state.lastStatus !== 'Final') {
    shouldNotify = true
    eventType = 'game_end'
  }

  // Quarter end notification
  if (settings.notifyQuarterEnd && period > state.lastPeriod && state.lastPeriod > 0) {
    shouldNotify = true
    eventType = 'quarter_end'
  }

  // Score change notification
  if (isLive && (homeScore !== state.lastHomeScore || awayScore !== state.lastAwayScore)) {
    if (settings.updateFrequency === 'every_point') {
      shouldNotify = true
      eventType = 'score'
    } else if (settings.updateFrequency === 'every_minute') {
      const minutesSinceLastNotif = (Date.now() - state.lastNotifiedAt.getTime()) / 1000 / 60
      if (minutesSinceLastNotif >= 1) {
        shouldNotify = true
        eventType = 'score'
      }
    }
  }

  const baseWhere = {
    companyId_gameId: {
      companyId: settings.companyId,
      gameId,
    },
  } as const

  if (shouldNotify) {
    const claimedAt = new Date()
    const claim = await prisma.gameNotificationState.updateMany({
      where: {
        companyId: settings.companyId,
        gameId,
        lastHomeScore: state.lastHomeScore,
        lastAwayScore: state.lastAwayScore,
        lastPeriod: state.lastPeriod,
        lastStatus: state.lastStatus,
      },
      data: {
        lastHomeScore: homeScore,
        lastAwayScore: awayScore,
        lastPeriod: period,
        lastStatus: status,
        lastNotifiedAt: claimedAt,
      },
    })

    if (claim.count === 0) {
      // Another worker already handled this update
      return
    }

    const message = formatGameUpdateMessage({
      homeTeam: `${game.homeTeam.teamCity} ${game.homeTeam.teamName}`,
      awayTeam: `${game.awayTeam.teamCity} ${game.awayTeam.teamName}`,
      homeNickname: game.homeTeam.teamName,
      awayNickname: game.awayTeam.teamName,
      homeScore,
      awayScore,
      period,
      gameClock: game.gameClock,
      status,
      eventType,
    })

    try {
      await Promise.all(channelIds.map((id) => createMessage(id, message)))
    } catch (err) {
      // Roll back state so a future run can retry
      await prisma.gameNotificationState.update({
        where: baseWhere,
        data: {
          lastHomeScore: state.lastHomeScore,
          lastAwayScore: state.lastAwayScore,
          lastPeriod: state.lastPeriod,
          lastStatus: state.lastStatus,
          lastNotifiedAt: state.lastNotifiedAt,
        },
      }).catch(() => {})
      throw err
    }

    return
  }

  // No notification sent but state may have changed; keep it in sync
  if (
    state.lastHomeScore !== homeScore ||
    state.lastAwayScore !== awayScore ||
    state.lastPeriod !== period ||
    state.lastStatus !== status
  ) {
    await prisma.gameNotificationState.update({
      where: baseWhere,
      data: {
        lastHomeScore: homeScore,
        lastAwayScore: awayScore,
        lastPeriod: period,
        lastStatus: status,
      },
    })
  }
}

function formatGameStatus(gameStatus: number, statusText: string): string {
  switch (gameStatus) {
    case 1:
      return statusText
    case 2:
      return 'Live'
    case 3:
      return 'Final'
    default:
      return statusText
  }
}
