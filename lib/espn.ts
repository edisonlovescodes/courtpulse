/**
 * The Odds API integration for NBA odds
 * API docs: https://the-odds-api.com/liveapi/guides/v4/
 */

export type NBAOdds = {
    gameId: string
    homeTeamTricode: string
    awayTeamTricode: string
    spread?: string
    moneyline?: {
        home?: string
        away?: string
    }
    overUnder?: string
}

export async function getTodaysNBAOdds(): Promise<NBAOdds[]> {
    try {
        const apiKey = process.env.ODDS_API_KEY
        if (!apiKey) {
            console.error('[Odds API] No API key found')
            return []
        }

        const response = await fetch(
            `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`,
            {
                cache: 'no-store',
            }
        )

        if (!response.ok) {
            console.error('[Odds API] Error:', response.status)
            return []
        }

        const data = await response.json()
        console.log('[Odds API] Fetched', data.length, 'games')

        return data.map((game: any) => {
            const homeTeam = game.home_team
            const awayTeam = game.away_team

            // The Odds API uses full team names, we need to convert to tricodes
            const homeTricode = convertToTricode(homeTeam)
            const awayTricode = convertToTricode(awayTeam)

            // Get the first available bookmaker's odds
            const bookmaker = game.bookmakers?.[0]
            const markets = bookmaker?.markets || []

            // Find spread market
            const spreadMarket = markets.find((m: any) => m.key === 'spreads')
            const homeSpreadOutcome = spreadMarket?.outcomes?.find((o: any) => o.name === homeTeam)
            const spread = homeSpreadOutcome?.point ? (homeSpreadOutcome.point > 0 ? `+${homeSpreadOutcome.point}` : homeSpreadOutcome.point.toString()) : undefined

            // Find totals (over/under) market
            const totalsMarket = markets.find((m: any) => m.key === 'totals')
            const overUnder = totalsMarket?.outcomes?.[0]?.point?.toString()

            // Find moneyline market
            const h2hMarket = markets.find((m: any) => m.key === 'h2h')
            const homeML = h2hMarket?.outcomes?.find((o: any) => o.name === homeTeam)?.price
            const awayML = h2hMarket?.outcomes?.find((o: any) => o.name === awayTeam)?.price

            console.log('[Odds API] Game:', { homeTricode, awayTricode, spread, overUnder })

            return {
                gameId: game.id,
                homeTeamTricode: homeTricode,
                awayTeamTricode: awayTricode,
                spread,
                overUnder,
                moneyline: homeML && awayML ? {
                    home: homeML > 0 ? `+${homeML}` : homeML.toString(),
                    away: awayML > 0 ? `+${awayML}` : awayML.toString(),
                } : undefined,
            }
        })
    } catch (error) {
        console.error('[Odds API] Error fetching odds:', error)
        return []
    }
}

// Map full team names to NBA tricodes
function convertToTricode(teamName: string): string {
    const map: Record<string, string> = {
        'Atlanta Hawks': 'ATL',
        'Boston Celtics': 'BOS',
        'Brooklyn Nets': 'BKN',
        'Charlotte Hornets': 'CHA',
        'Chicago Bulls': 'CHI',
        'Cleveland Cavaliers': 'CLE',
        'Dallas Mavericks': 'DAL',
        'Denver Nuggets': 'DEN',
        'Detroit Pistons': 'DET',
        'Golden State Warriors': 'GSW',
        'Houston Rockets': 'HOU',
        'Indiana Pacers': 'IND',
        'LA Clippers': 'LAC',
        'Los Angeles Lakers': 'LAL',
        'Memphis Grizzlies': 'MEM',
        'Miami Heat': 'MIA',
        'Milwaukee Bucks': 'MIL',
        'Minnesota Timberwolves': 'MIN',
        'New Orleans Pelicans': 'NOP',
        'New York Knicks': 'NYK',
        'Oklahoma City Thunder': 'OKC',
        'Orlando Magic': 'ORL',
        'Philadelphia 76ers': 'PHI',
        'Phoenix Suns': 'PHX',
        'Portland Trail Blazers': 'POR',
        'Sacramento Kings': 'SAC',
        'San Antonio Spurs': 'SAS',
        'Toronto Raptors': 'TOR',
        'Utah Jazz': 'UTA',
        'Washington Wizards': 'WAS',
    }
    return map[teamName] || teamName
}
