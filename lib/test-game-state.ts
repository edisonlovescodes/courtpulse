import { prisma } from './prisma'
import { getTestGameSnapshot, type GameSnapshot, type GameProgressionState, type TestGameKey } from './test-game-snapshot'
import type { NBAGame, NBATeam, TodayGame } from './ball'

// Start time: 8:35 AM October 27, 2025
const TEST_GAME_START_TIME = new Date('2025-10-27T08:35:00.000Z')

export type TestGameSession = {
  id: number
  gameId: string
  snapshotData: string
  startedAt: Date
  isActive: boolean
  companyId: string
}

/**
 * Start a test game session for a company
 */
export async function startTestGame(companyId: string, gameKey: TestGameKey): Promise<TestGameSession> {
  // Stop any existing test game for this company
  await stopTestGame(companyId)

  const snapshot = getTestGameSnapshot(gameKey)

  // Delete any old inactive sessions to avoid unique constraint issues
  await prisma.testGameSession.deleteMany({
    where: {
      companyId,
      gameId: snapshot.gameId,
      isActive: false,
    },
  })

  const session = await prisma.testGameSession.create({
    data: {
      gameId: snapshot.gameId,
      snapshotData: JSON.stringify(snapshot),
      startedAt: TEST_GAME_START_TIME,
      isActive: true,
      companyId,
    },
  })

  return session
}

/**
 * Stop the active test game for a company
 */
export async function stopTestGame(companyId: string): Promise<void> {
  await prisma.testGameSession.updateMany({
    where: {
      companyId,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  })
}

/**
 * Get the active test game session for a company
 */
export async function getActiveTestGame(companyId: string): Promise<TestGameSession | null> {
  return await prisma.testGameSession.findFirst({
    where: {
      companyId,
      isActive: true,
    },
  })
}

/**
 * Get current state of a test game based on elapsed time
 */
export function getCurrentTestGameState(session: TestGameSession): GameProgressionState | null {
  const snapshot: GameSnapshot = JSON.parse(session.snapshotData)
  const now = new Date()
  const elapsedMs = now.getTime() - session.startedAt.getTime()
  const elapsedSeconds = Math.floor(elapsedMs / 1000)

  // Find the closest state for the current elapsed time
  const states = snapshot.progressionStates

  // If game hasn't started yet
  if (elapsedSeconds < 0) {
    return states[0]
  }

  // If game is over
  if (elapsedSeconds >= states[states.length - 1].gameTimeSeconds) {
    return states[states.length - 1]
  }

  // Find the state that matches current time (or closest one)
  let closestState = states[0]
  for (const state of states) {
    if (state.gameTimeSeconds <= elapsedSeconds) {
      closestState = state
    } else {
      break
    }
  }

  return closestState
}

/**
 * Convert test game session to TodayGame format
 */
export function testGameToTodayGame(session: TestGameSession): TodayGame | null {
  const snapshot: GameSnapshot = JSON.parse(session.snapshotData)
  const currentState = getCurrentTestGameState(session)

  if (!currentState) return null

  return {
    id: snapshot.gameId,
    homeTeam: `${snapshot.homeTeam.teamCity} ${snapshot.homeTeam.teamName}`,
    awayTeam: `${snapshot.awayTeam.teamCity} ${snapshot.awayTeam.teamName}`,
    homeScore: currentState.homeScore,
    awayScore: currentState.awayScore,
    status: currentState.gameStatusText,
    period: currentState.period,
    gameClock: currentState.gameClock,
  }
}

/**
 * Convert test game session to full NBAGame format
 */
export function testGameToNBAGame(session: TestGameSession): NBAGame | null {
  const snapshot: GameSnapshot = JSON.parse(session.snapshotData)
  const currentState = getCurrentTestGameState(session)

  if (!currentState) return null

  const homeTeam: NBATeam = {
    teamId: snapshot.homeTeam.teamId,
    teamName: snapshot.homeTeam.teamName,
    teamCity: snapshot.homeTeam.teamCity,
    teamTricode: snapshot.homeTeam.teamTricode,
    score: currentState.homeScore,
    wins: snapshot.homeTeam.wins,
    losses: snapshot.homeTeam.losses,
    periods: generatePeriodScores(snapshot, currentState, true),
    players: [], // Could add mock player data if needed
    statistics: undefined,
  }

  const awayTeam: NBATeam = {
    teamId: snapshot.awayTeam.teamId,
    teamName: snapshot.awayTeam.teamName,
    teamCity: snapshot.awayTeam.teamCity,
    teamTricode: snapshot.awayTeam.teamTricode,
    score: currentState.awayScore,
    wins: snapshot.awayTeam.wins,
    losses: snapshot.awayTeam.losses,
    periods: generatePeriodScores(snapshot, currentState, false),
    players: [],
    statistics: undefined,
  }

  return {
    gameId: snapshot.gameId,
    gameStatus: currentState.gameStatus,
    gameStatusText: currentState.gameStatusText,
    period: currentState.period,
    gameClock: currentState.gameClock,
    homeTeam,
    awayTeam,
  }
}

/**
 * Generate period scores based on progression
 */
function generatePeriodScores(
  snapshot: GameSnapshot,
  currentState: GameProgressionState,
  isHomeTeam: boolean
): Array<{ period: number; periodType: string; score: number }> {
  const periods: Array<{ period: number; periodType: string; score: number }> = []
  const states = snapshot.progressionStates

  // For each completed period, calculate the score at end of that period
  for (let p = 1; p <= currentState.period; p++) {
    // Find the last state of this period
    const periodEndState = states.find(
      (s) => s.period === p && s.gameTimeSeconds === p * 12 * 60
    ) || states.find((s) => s.period === p)

    if (periodEndState) {
      const score = isHomeTeam ? periodEndState.homeScore : periodEndState.awayScore

      // If we're in the current period, use current score
      if (p === currentState.period) {
        periods.push({
          period: p,
          periodType: 'REGULAR',
          score: isHomeTeam ? currentState.homeScore : currentState.awayScore,
        })
      } else {
        // For completed periods, calculate the score gained in that period
        const prevPeriodState = p > 1
          ? states.find((s) => s.period === p - 1 && s.gameTimeSeconds === (p - 1) * 12 * 60)
          : null

        const prevScore = prevPeriodState
          ? (isHomeTeam ? prevPeriodState.homeScore : prevPeriodState.awayScore)
          : 0

        periods.push({
          period: p,
          periodType: 'REGULAR',
          score: score - prevScore,
        })
      }
    }
  }

  return periods
}

/**
 * Check if a game ID is a test game
 */
export function isTestGameId(gameId: string): boolean {
  return gameId.startsWith('TEST_GAME_')
}

/**
 * Get test game by ID if it exists and is active
 */
export async function getTestGameById(gameId: string): Promise<TestGameSession | null> {
  if (!isTestGameId(gameId)) return null

  return await prisma.testGameSession.findFirst({
    where: {
      gameId,
      isActive: true,
    },
  })
}

/**
 * Get all active test games (for notification processing)
 */
export async function getAllActiveTestGames(): Promise<TestGameSession[]> {
  return await prisma.testGameSession.findMany({
    where: {
      isActive: true,
    },
  })
}
