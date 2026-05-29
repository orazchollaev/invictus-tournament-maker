const TEAM_NAMES = [
  "Red Dragons",
  "Blue Wolves",
  "Iron Eagles",
  "Golden Lions",
  "Storm Raiders",
  "Frost Giants",
  "Shadow Hawks",
  "Thunder Bulls",
  "Crimson Foxes",
  "Steel Vipers",
  "Night Owls",
  "Wild Boars",
  "Solar Bears",
  "Dark Knights",
  "Silver Sharks",
  "Arctic Wolves",
  "Blazing Comets",
  "Stone Titans",
  "Jade Serpents",
  "Neon Panthers",
  "Copper Cobras",
  "Frozen Falcons",
  "Ember Wolves",
  "Gravity Bears",
  "Lunar Tigers",
  "Obsidian Ravens",
  "Scarlet Stallions",
  "Iron Rhinos",
  "Tidal Sharks",
  "Blazing Arrows",
  "Ivory Tusks",
  "Savage Jaguars",
  "Crystal Stags",
  "Toxic Vipers",
  "Rogue Wolves",
  "Molten Hawks",
  "Phantom Foxes",
  "Gilded Eagles",
  "Wraith Lions",
  "Venom Mantis",
]

const TOURNAMENT_NAMES = [
  "Spring Championship",
  "Summer Clash",
  "Autumn Showdown",
  "Winter Cup",
  "Grand Prix",
  "Champions League",
  "Elite Series",
  "Masters Tournament",
  "Iron Cup",
  "Golden Trophy",
  "Apex League",
  "Titan Series",
  "Invitational Cup",
  "Premier League",
  "Thunderdome Open",
  "Galaxy Cup",
  "Diamond League",
  "Challenger Series",
  "Colosseum Cup",
  "Blaze Tournament",
  "Phoenix Open",
  "Dragon's Den Cup",
  "Shadow League",
  "Frost Cup",
  "Solar Series",
  "Storm Championship",
  "Inferno Open",
  "Crystal League",
  "Vortex Cup",
  "Eclipse Tournament",
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function randomTeamName(): string {
  return pickRandom(TEAM_NAMES)
}

export function randomTournamentName(): string {
  const year = new Date().getFullYear()
  const base = pickRandom(TOURNAMENT_NAMES)
  return Math.random() < 0.5 ? `${base} ${year}` : base
}
