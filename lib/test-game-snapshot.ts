// Hardcoded historical game snapshots for testing
// These are based on real NBA games that had interesting progressions

export type GameSnapshot = {
  gameId: string
  homeTeam: {
    teamId: number
    teamName: string
    teamCity: string
    teamTricode: string
    wins: number
    losses: number
  }
  awayTeam: {
    teamId: number
    teamName: string
    teamCity: string
    teamTricode: string
    wins: number
    losses: number
  }
  // Progression snapshots - one per minute of game time
  // Each represents the state at that point in the game
  progressionStates: GameProgressionState[]
}

export type GameProgressionState = {
  gameTimeSeconds: number // Total elapsed game time in seconds
  period: number // 1-4 for quarters, 5+ for OT
  gameClock: string // Format: "PT09M43.00S"
  homeScore: number
  awayScore: number
  gameStatus: number // 1=scheduled, 2=live, 3=final
  gameStatusText: string
  // Optional: player stats at this point (can be omitted for simplicity)
}

// Game 1: Lakers vs Celtics - Close playoff-style game
// Based on a high-scoring competitive game with lead changes
export const LAKERS_VS_CELTICS_SNAPSHOT: GameSnapshot = {
  gameId: 'TEST_GAME_LAL_BOS',
  homeTeam: {
    teamId: 1610612747,
    teamName: 'Lakers',
    teamCity: 'Los Angeles',
    teamTricode: 'LAL',
    wins: 45,
    losses: 37,
  },
  awayTeam: {
    teamId: 1610612738,
    teamName: 'Celtics',
    teamCity: 'Boston',
    teamTricode: 'BOS',
    wins: 64,
    losses: 18,
  },
  progressionStates: generateRealisticGameProgression({
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    finalHomeScore: 118,
    finalAwayScore: 115,
    isCloseGame: true,
  }),
}

// Helper function to generate realistic game progression
function generateRealisticGameProgression(params: {
  homeTeam: string
  awayTeam: string
  finalHomeScore: number
  finalAwayScore: number
  isCloseGame: boolean
}): GameProgressionState[] {
  const { finalHomeScore, finalAwayScore, isCloseGame } = params
  const states: GameProgressionState[] = []

  // Game duration: 4 quarters x 12 minutes = 48 minutes = 2880 seconds
  const quarterDurationSeconds = 12 * 60 // 720 seconds
  const totalGameSeconds = quarterDurationSeconds * 4

  // Generate states every 30 seconds of game time
  const stateIntervalSeconds = 30

  let homeScore = 0
  let awayScore = 0

  for (let gameTime = 0; gameTime <= totalGameSeconds; gameTime += stateIntervalSeconds) {
    const period = Math.floor(gameTime / quarterDurationSeconds) + 1
    const timeInPeriod = gameTime % quarterDurationSeconds
    const clockSecondsRemaining = quarterDurationSeconds - timeInPeriod
    const clockMinutes = Math.floor(clockSecondsRemaining / 60)
    const clockSeconds = clockSecondsRemaining % 60
    const gameClock = `PT${String(clockMinutes).padStart(2, '0')}M${String(clockSeconds).padStart(2, '0')}.00S`

    // Calculate expected scores at this point (linear progression with some randomness)
    const progressRatio = gameTime / totalGameSeconds
    const expectedHomeScore = Math.floor(finalHomeScore * progressRatio)
    const expectedAwayScore = Math.floor(finalAwayScore * progressRatio)

    // Add some variance to make it realistic
    if (gameTime > 0 && gameTime < totalGameSeconds) {
      // Randomly increase scores to match expected
      while (homeScore < expectedHomeScore) {
        homeScore += Math.random() > 0.5 ? 2 : 3
      }
      while (awayScore < expectedAwayScore) {
        awayScore += Math.random() > 0.5 ? 2 : 3
      }

      // For close games, keep scores within a few points
      if (isCloseGame) {
        const scoreDiff = Math.abs(homeScore - awayScore)
        if (scoreDiff > 8) {
          // Bring them closer
          if (homeScore > awayScore) {
            awayScore += 3
          } else {
            homeScore += 3
          }
        }
      }
    }

    // Determine game status
    let gameStatus = 2 // Live
    let gameStatusText = 'Live'

    if (gameTime === 0) {
      gameStatus = 2 // Start as live immediately
      gameStatusText = 'Live'
    }

    if (gameTime >= totalGameSeconds) {
      gameStatus = 3
      gameStatusText = 'Final'
      homeScore = finalHomeScore
      awayScore = finalAwayScore
    }

    states.push({
      gameTimeSeconds: gameTime,
      period: Math.min(period, 4),
      gameClock,
      homeScore,
      awayScore,
      gameStatus,
      gameStatusText,
    })
  }

  return states
}

// Export available test games
export const TEST_GAMES = {
  'lakers-celtics': LAKERS_VS_CELTICS_SNAPSHOT,
}

export type TestGameKey = keyof typeof TEST_GAMES

// Get a test game snapshot by key
export function getTestGameSnapshot(key: TestGameKey): GameSnapshot {
  return TEST_GAMES[key]
}

// Get all available test games
export function getAvailableTestGames(): { key: TestGameKey; label: string }[] {
  return [
    { key: 'lakers-celtics', label: 'Lakers vs Celtics (Close Game)' },
  ]
}
