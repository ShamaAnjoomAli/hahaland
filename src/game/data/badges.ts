export type BadgeCategory =
  | 'fake-hotel'
  | 'bazaar'
  | 'pyramid'
  | 'temple'

export type BadgeKind = 'trial' | 'quest'

export type BadgeDefinition = {
  id: string
  name: string
  description: string
  category: BadgeCategory
  kind: BadgeKind
  order: number
  symbol: string
  iconKey?: string
  requires?: string[]
}

export type BadgeCategoryDefinition = {
  id: BadgeCategory
  title: string
  shortTitle: string
  description: string
  accent: number
}

export const BADGE_CATEGORIES: Record<
  BadgeCategory,
  BadgeCategoryDefinition
> = {
  'fake-hotel': {
    id: 'fake-hotel',
    title: 'Fake Hotel',
    shortTitle: 'HOTEL',
    description: 'Survive the suspicious first night in Hahaland.',
    accent: 0xc98b45,
  },
  bazaar: {
    id: 'bazaar',
    title: 'Bazaar Trials',
    shortTitle: 'BAZAAR',
    description: 'Complete every merchant challenge in the Bazaar.',
    accent: 0x29b7b2,
  },
  pyramid: {
    id: 'pyramid',
    title: 'Pyramid Quest',
    shortTitle: 'PYRAMID',
    description: 'Solve the secrets hidden inside the ancient pyramid.',
    accent: 0xd5a84b,
  },
  temple: {
    id: 'temple',
    title: 'Temple Trials',
    shortTitle: 'TEMPLE',
    description: 'Complete the seven sacred Temple trials.',
    accent: 0x4aa7d8,
  },
}

export const BADGES: readonly BadgeDefinition[] = [
  {
    id: 'fake-hotel-scam-survivor',
    name: 'Scam Survivor',
    description: 'Escape the fake hotel after surviving one impossible night.',
    category: 'fake-hotel',
    kind: 'quest',
    order: 1,
    symbol: '☾',
    iconKey: 'badge-fake-hotel',
  },

  // Bazaar trial IDs remain unchanged so existing saves and award calls work.
  {
    id: 'bazaar-date',
    name: 'Palm Grove Trader',
    description: 'Complete the Date Merchant trade challenge.',
    category: 'bazaar',
    kind: 'trial',
    order: 1,
    symbol: 'D',
    iconKey: 'badge-bazaar-date',
  },
  {
    id: 'bazaar-eagle',
    name: 'Sky Courier',
    description: 'Complete the Eagle Keeper delivery challenge.',
    category: 'bazaar',
    kind: 'trial',
    order: 2,
    symbol: 'E',
    iconKey: 'badge-bazaar-eagle',
  },
  {
    id: 'bazaar-donkey',
    name: 'Desert Rider',
    description: 'Complete the Donkey Master race.',
    category: 'bazaar',
    kind: 'trial',
    order: 3,
    symbol: 'R',
    iconKey: 'badge-bazaar-donkey',
  },
  {
    id: 'bazaar-grain',
    name: 'Granary Friend',
    description: 'Help the cat and mouse complete the Grain Merchant trial.',
    category: 'bazaar',
    kind: 'trial',
    order: 4,
    symbol: 'G',
    iconKey: 'badge-bazaar-grain',
  },
  {
    id: 'bazaar-spice',
    name: 'Spice Keeper',
    description: 'Complete the Spice Merchant memory challenge.',
    category: 'bazaar',
    kind: 'trial',
    order: 5,
    symbol: 'S',
    iconKey: 'badge-bazaar-spice',
  },
  {
    id: 'bazaar-pottery',
    name: "Potter's Eye",
    description: 'Expose the fake pottery in the Pottery Seller trial.',
    category: 'bazaar',
    kind: 'trial',
    order: 6,
    symbol: 'P',
    iconKey: 'badge-bazaar-pottery',
  },
  {
    id: 'bazaar-map',
    name: 'Reedland Archer',
    description: 'Complete the Bow Merchant archery challenge.',
    category: 'bazaar',
    kind: 'trial',
    order: 7,
    symbol: 'A',
    iconKey: 'badge-bazaar-archery',
  },
  {
    id: 'bazaar-master',
    name: 'Bazaar Master',
    description: 'Complete all seven Bazaar merchant trials.',
    category: 'bazaar',
    kind: 'quest',
    order: 8,
    symbol: '★',
    iconKey: 'badge-bazaar-finish',
    requires: [
      'bazaar-date',
      'bazaar-eagle',
      'bazaar-donkey',
      'bazaar-grain',
      'bazaar-spice',
      'bazaar-pottery',
      'bazaar-map',
    ],
  },

  // Pyramid stays as a letter/symbol badge for now.
  {
    id: 'pyramid-sage',
    name: 'Pyramid Sage',
    description: 'Complete the Pyramid quest and solve its ancient riddles.',
    category: 'pyramid',
    kind: 'quest',
    order: 1,
    symbol: '▲',
  },

  // Temple IDs remain unchanged so future scene wiring can use the existing IDs.
  {
    id: 'temple-scarab',
    name: 'Gate of Truth',
    description: 'Solve the three-tablet truth and lie chamber.',
    category: 'temple',
    kind: 'trial',
    order: 1,
    symbol: '◆',
    iconKey: 'badge-temple-gate-truth',
  },
  {
    id: 'temple-eye',
    name: 'Candle of Ra',
    description: 'Carry the sacred flame through the windy torch corridor.',
    category: 'temple',
    kind: 'trial',
    order: 2,
    symbol: '◈',
    iconKey: 'badge-temple-candle-ra',
  },
  {
    id: 'temple-ankh',
    name: 'Hall of Hieroglyphs',
    description: 'Solve the glowing glyphs and symbol-floor chamber.',
    category: 'temple',
    kind: 'trial',
    order: 3,
    symbol: '✚',
    iconKey: 'badge-temple-hieroglyphs',
  },
  {
    id: 'temple-falcon',
    name: 'Treasury of False Gold',
    description: 'Separate the real treasure from the false gold.',
    category: 'temple',
    kind: 'trial',
    order: 4,
    symbol: '▲',
    iconKey: 'badge-temple-false-gold',
  },
  {
    id: 'temple-lotus',
    name: 'Painted Prophecy',
    description: 'Restore the broken mural and reveal the prophecy.',
    category: 'temple',
    kind: 'trial',
    order: 5,
    symbol: '✿',
    iconKey: 'badge-temple-painted-prophecy',
  },
  {
    id: 'temple-sun',
    name: 'Sacred Scarab Board',
    description: 'Guide the scarab across the board to the sun-disk target.',
    category: 'temple',
    kind: 'trial',
    order: 6,
    symbol: '☀',
    iconKey: 'badge-temple-scarab-board',
  },
  {
    id: 'temple-crown',
    name: 'Stairway to the Sun',
    description: 'Climb the final stairway and reach the sun altar.',
    category: 'temple',
    kind: 'trial',
    order: 7,
    symbol: '♛',
    iconKey: 'badge-temple-stairway-sun',
  },
  {
    id: 'temple-ascendant',
    name: 'Temple Ascendant',
    description: 'Complete all seven sacred Temple trials.',
    category: 'temple',
    kind: 'quest',
    order: 8,
    symbol: '★',
    iconKey: 'badge-temple-finish',
    requires: [
      'temple-scarab',
      'temple-eye',
      'temple-ankh',
      'temple-falcon',
      'temple-lotus',
      'temple-sun',
      'temple-crown',
    ],
  },
]

export const BADGE_BY_ID = new Map(
  BADGES.map((badge) => [badge.id, badge] as const),
)

export function getBadgesForCategory(category: BadgeCategory) {
  return BADGES.filter((badge) => badge.category === category).sort(
    (a, b) => a.order - b.order,
  )
}