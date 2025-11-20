
/**
 * ESPN API integration for NBA odds and scores
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
        const response = await fetch(
            'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
            {
                next: { revalidate: 60 }, // Cache for 60 seconds
            }
        )

        if (!response.ok) {
            console.error('ESPN API error:', response.status)
            return []
        }

        const data = await response.json()
        const events = data.events || []

        return events.map((event: any) => {
            const competition = event.competitions?.[0]
            const odds = competition?.odds?.[0]
            const homeTeam = competition?.competitors?.find((c: any) => c.homeAway === 'home')
            const awayTeam = competition?.competitors?.find((c: any) => c.homeAway === 'away')

            // Debug logging
            if (homeTeam?.team?.abbreviation === 'DAL' || awayTeam?.team?.abbreviation === 'DAL') {
                console.log('[ESPN Debug] DAL game found')
                console.log('[ESPN Debug] Odds object:', JSON.stringify(odds, null, 2))
                console.log('[ESPN Debug] Competition.odds array:', competition?.odds)
            }

            return {
                gameId: event.id,
                homeTeamTricode: homeTeam?.team?.abbreviation,
                awayTeamTricode: awayTeam?.team?.abbreviation,
                spread: odds?.details,
                moneyline: odds?.moneyline ? {
                    home: odds.moneyline.home, // Note: ESPN might not always provide ML in this structure, need to verify
                    away: odds.moneyline.away
                } : undefined,
                overUnder: odds?.overUnder
            }
        })
    } catch (error) {
        console.error('Error fetching NBA odds:', error)
        return []
    }
}
