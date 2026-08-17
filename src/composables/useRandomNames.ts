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

const PLAYER_NAMES = [
  "Alex Turner",
  "Marco Rossi",
  "Liam Carter",
  "Diego Fernandez",
  "Kenji Sato",
  "Lucas Silva",
  "Noah Williams",
  "Mateo Garcia",
  "Ethan Brooks",
  "Hugo Martin",
  "Omar Hassan",
  "Leon Mueller",
  "Jonas Berg",
  "Bruno Costa",
  "Aiden Walsh",
  "Rafael Santos",
  "Felix Novak",
  "Tomas Novotny",
  "Adrian Kowalski",
  "Milan Petrov",
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function randomTeamName(): string {
  return pickRandom(TEAM_NAMES)
}

export function randomPlayerName(): string {
  return pickRandom(PLAYER_NAMES)
}

export function randomTournamentName(): string {
  const base = pickRandom(TOURNAMENT_NAMES)
  return base
}
