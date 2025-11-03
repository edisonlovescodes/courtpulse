/**
 * NFL data integration using ESPN's free public API
 */

export type NFLTeam = {
  teamId: number;
  teamName: string;
  teamCity: string;
  teamTricode: string;
  score: number;
  wins: number;
  losses: number;
  ties: number;
  timeouts: number;
  possession: boolean;
  logoUrl: string;
};

export type NFLGame = {
  gameId: string;
  gameStatus: number; // 1 = scheduled, 2 = in-progress, 3 = final
  gameStatusText: string;
  period: number; // 1-4 for quarters, 5+ for OT
  gameClock: string;
  down?: number;
  distance?: number;
  yardLine?: string;
  possessionText?: string;
  homeTeam: NFLTeam;
  awayTeam: NFLTeam;
  gameTimeUTC: string;
  gameDate: string;
};

export type NFLGameDetail = NFLGame & {
  plays?: any[]; // Play-by-play data
  leaders?: {
    passing?: any;
    rushing?: any;
    receiving?: any;
  };
  teamStats?: {
    home: {
      totalYards: number;
      passingYards: number;
      rushingYards: number;
      turnovers: number;
      timeOfPossession: string;
    };
    away: {
      totalYards: number;
      passingYards: number;
      rushingYards: number;
      turnovers: number;
      timeOfPossession: string;
    };
  };
  scoringPlays?: any[];
};

/**
 * Fetches today's NFL games from ESPN API
 */
export async function getTodaysNFLGames(): Promise<NFLGame[]> {
  try {
    // Format today's date as YYYYMMDD for ESPN API
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${dateStr}`,
      {
        next: { revalidate: 10 }, // Cache for 10 seconds for live updates
      }
    );

    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.events || data.events.length === 0) {
      return [];
    }

    return data.events
      .filter((event: any) => event.competitions && event.competitions.length > 0)
      .map((event: any) => parseNFLGame(event.competitions[0], event.id));
  } catch (error) {
    console.error('Error fetching NFL games:', error);
    return [];
  }
}

/**
 * Fetches a specific NFL game by ID
 */
export async function getNFLGame(gameId: string): Promise<NFLGameDetail | null> {
  try {
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`,
      {
        next: { revalidate: 10 },
      }
    );

    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }

    const data = await response.json();

    const game = parseNFLGame(data.header.competitions[0]);

    // Add detailed stats
    const gameDetail: NFLGameDetail = {
      ...game,
      plays: data.plays || [],
      scoringPlays: data.scoringPlays || [],
      leaders: data.leaders || {},
      teamStats: extractTeamStats(data),
    };

    return gameDetail;
  } catch (error) {
    console.error(`Error fetching NFL game ${gameId}:`, error);
    return null;
  }
}

/**
 * Parses ESPN API game data into our NFLGame format
 */
function parseNFLGame(competition: any, eventId?: string): NFLGame {
  const status = competition?.status || {};
  const competitors = competition?.competitors || [];
  const homeTeam = competitors.find((c: any) => c.homeAway === 'home');
  const awayTeam = competitors.find((c: any) => c.homeAway === 'away');

  // Determine possession
  const possession = competition.situation?.possession;
  const homePossession = possession === homeTeam?.id;
  const awayPossession = possession === awayTeam?.id;

  // Parse down and distance
  const situation = competition.situation;
  const down = situation?.shortDownDistanceText;
  const possessionText = situation?.possessionText;

  return {
    gameId: eventId || competition.id || competition.event?.id || 'unknown',
    gameStatus: status?.type?.state === 'pre' ? 1 : status?.type?.state === 'in' ? 2 : 3,
    gameStatusText: status?.type?.detail || 'Unknown',
    period: status?.period || 0,
    gameClock: status?.displayClock || '',
    down: situation?.down,
    distance: situation?.distance,
    yardLine: situation?.possessionText,
    possessionText: down || possessionText,
    homeTeam: {
      teamId: parseInt(homeTeam?.id || '0'),
      teamName: homeTeam?.team?.name || '',
      teamCity: homeTeam?.team?.location || '',
      teamTricode: homeTeam?.team?.abbreviation || '',
      score: parseInt(homeTeam?.score || '0'),
      wins: parseInt(homeTeam?.records?.[0]?.summary.split('-')[0] || '0'),
      losses: parseInt(homeTeam?.records?.[0]?.summary.split('-')[1] || '0'),
      ties: parseInt(homeTeam?.records?.[0]?.summary.split('-')[2] || '0'),
      timeouts: homeTeam?.timeouts || 3,
      possession: homePossession,
      logoUrl: homeTeam?.team?.logo || '',
    },
    awayTeam: {
      teamId: parseInt(awayTeam?.id || '0'),
      teamName: awayTeam?.team?.name || '',
      teamCity: awayTeam?.team?.location || '',
      teamTricode: awayTeam?.team?.abbreviation || '',
      score: parseInt(awayTeam?.score || '0'),
      wins: parseInt(awayTeam?.records?.[0]?.summary.split('-')[0] || '0'),
      losses: parseInt(awayTeam?.records?.[0]?.summary.split('-')[1] || '0'),
      ties: parseInt(awayTeam?.records?.[0]?.summary.split('-')[2] || '0'),
      timeouts: awayTeam?.timeouts || 3,
      possession: awayPossession,
      logoUrl: awayTeam?.team?.logo || '',
    },
    gameTimeUTC: competition.date,
    gameDate: new Date(competition.date).toLocaleDateString(),
  };
}

/**
 * Extracts team statistics from game detail data
 */
function extractTeamStats(data: any): NFLGameDetail['teamStats'] {
  const stats = data.boxscore?.teams;

  if (!stats || stats.length < 2) {
    return undefined;
  }

  const homeStats = stats.find((t: any) => t.homeAway === 'home')?.statistics || [];
  const awayStats = stats.find((t: any) => t.homeAway === 'away')?.statistics || [];

  const getStatValue = (stats: any[], name: string) => {
    const stat = stats.find((s: any) => s.name === name);
    return stat?.displayValue || '0';
  };

  return {
    home: {
      totalYards: parseInt(getStatValue(homeStats, 'totalYards')),
      passingYards: parseInt(getStatValue(homeStats, 'netPassingYards')),
      rushingYards: parseInt(getStatValue(homeStats, 'rushingYards')),
      turnovers: parseInt(getStatValue(homeStats, 'turnovers')),
      timeOfPossession: getStatValue(homeStats, 'possessionTime'),
    },
    away: {
      totalYards: parseInt(getStatValue(awayStats, 'totalYards')),
      passingYards: parseInt(getStatValue(awayStats, 'netPassingYards')),
      rushingYards: parseInt(getStatValue(awayStats, 'rushingYards')),
      turnovers: parseInt(getStatValue(awayStats, 'turnovers')),
      timeOfPossession: getStatValue(awayStats, 'possessionTime'),
    },
  };
}

/**
 * Gets NFL games for a specific date
 */
export async function getNFLGamesByDate(date: string): Promise<NFLGame[]> {
  try {
    // Format: YYYYMMDD
    const formattedDate = date.replace(/-/g, '');

    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${formattedDate}`,
      {
        next: { revalidate: 10 },
      }
    );

    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.events || data.events.length === 0) {
      return [];
    }

    return data.events.map((event: any) => parseNFLGame(event.competitions[0]));
  } catch (error) {
    console.error('Error fetching NFL games by date:', error);
    return [];
  }
}
