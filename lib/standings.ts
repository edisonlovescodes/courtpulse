// NBA team conference mapping
const EASTERN_CONFERENCE_TEAMS = [
  1610612738, // Boston Celtics
  1610612751, // Brooklyn Nets
  1610612752, // New York Knicks
  1610612755, // Philadelphia 76ers
  1610612761, // Toronto Raptors
  1610612741, // Chicago Bulls
  1610612739, // Cleveland Cavaliers
  1610612765, // Detroit Pistons
  1610612754, // Indiana Pacers
  1610612749, // Milwaukee Bucks
  1610612737, // Atlanta Hawks
  1610612766, // Charlotte Hornets
  1610612748, // Miami Heat
  1610612753, // Orlando Magic
  1610612764, // Washington Wizards
]

const WESTERN_CONFERENCE_TEAMS = [
  1610612743, // Denver Nuggets
  1610612750, // Minnesota Timberwolves
  1610612760, // Oklahoma City Thunder
  1610612757, // Portland Trail Blazers
  1610612762, // Utah Jazz
  1610612744, // Golden State Warriors
  1610612746, // LA Clippers
  1610612747, // Los Angeles Lakers
  1610612756, // Phoenix Suns
  1610612758, // Sacramento Kings
  1610612742, // Dallas Mavericks
  1610612745, // Houston Rockets
  1610612763, // Memphis Grizzlies
  1610612740, // New Orleans Pelicans
  1610612759, // San Antonio Spurs
]

export type TeamStanding = {
  teamId: number
  teamName: string
  teamCity: string
  teamTricode: string
  wins: number
  losses: number
  winPct: number
  conference: 'East' | 'West'
  gamesBack?: number
}

export function getConference(teamId: number): 'East' | 'West' {
  if (EASTERN_CONFERENCE_TEAMS.includes(teamId)) return 'East'
  if (WESTERN_CONFERENCE_TEAMS.includes(teamId)) return 'West'
  return 'East' // Default
}

export function calculateWinPercentage(wins: number, losses: number): number {
  const totalGames = wins + losses
  if (totalGames === 0) return 0
  return wins / totalGames
}

export function calculateGamesBack(wins: number, losses: number, leadWins: number, leadLosses: number): number {
  const gb = ((leadWins - wins) + (losses - leadLosses)) / 2
  return Math.max(0, gb)
}

export function sortStandings(teams: TeamStanding[]): TeamStanding[] {
  return teams.sort((a, b) => {
    // Sort by win percentage (descending)
    if (a.winPct !== b.winPct) return b.winPct - a.winPct
    // If tied, sort by wins (descending)
    return b.wins - a.wins
  })
}

export function addGamesBack(teams: TeamStanding[]): TeamStanding[] {
  if (teams.length === 0) return teams

  const leader = teams[0]
  return teams.map(team => ({
    ...team,
    gamesBack: team.teamId === leader.teamId ? 0 : calculateGamesBack(team.wins, team.losses, leader.wins, leader.losses)
  }))
}
