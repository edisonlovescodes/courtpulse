import { prisma } from './prisma'
import { getGameById, type NBAGame } from './ball'
import { createMessage, formatGameUpdateMessage } from './whop-api'
import { getTestGameById, testGameToNBAGame, isTestGameId } from './test-game-state'

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
      if (!settings.channelId || !settings.trackedGames) {
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
          await processGameNotification(settings, gameId)
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
    channelId: string | null
    updateFrequency: string
    notifyGameStart: boolean
    notifyGameEnd: boolean
    notifyQuarterEnd: boolean
  },
  gameId: string
) {
  if (!settings.channelId) return

  // Fetch current game data (from test game or NBA API)
  let game: NBAGame | null = null

  // Check if this is a test game
  if (isTestGameId(gameId)) {
    const testSession = await getTestGameById(gameId)
    if (testSession) {
      game = testGameToNBAGame(testSession)
    }
  }

  // If not a test game (or test game not found), fetch from NBA API
  if (!game) {
    game = await getGameById(gameId)
  }

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

  // Send notification if needed
  if (shouldNotify) {
    const message = formatGameUpdateMessage({
      homeTeam: `${game.homeTeam.teamCity} ${game.homeTeam.teamName}`,
      awayTeam: `${game.awayTeam.teamCity} ${game.awayTeam.teamName}`,
      homeScore,
      awayScore,
      period,
      gameClock: game.gameClock,
      status,
      eventType,
    })

    await createMessage(settings.channelId, message)

    // Update state
    await prisma.gameNotificationState.update({
      where: {
        companyId_gameId: {
          companyId: settings.companyId,
          gameId,
        },
      },
      data: {
        lastHomeScore: homeScore,
        lastAwayScore: awayScore,
        lastPeriod: period,
        lastStatus: status,
        lastNotifiedAt: new Date(),
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
