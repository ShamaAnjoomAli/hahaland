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
    title: 'Temple Seals',
    shortTitle: 'TEMPLE',
    description: 'Collect the seven sacred seals of the temple.',
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
  },

  {
    id: 'bazaar-map',
    name: 'Papyrus Pathfinder',
    description: 'Complete the suspicious map bargain.',
    category: 'bazaar',
    kind: 'trial',
    order: 1,
    symbol: 'M',
  },
  {
    id: 'bazaar-grain',
    name: 'Granary Friend',
    description: 'Help the cat and mouse complete the Grain Merchant trial.',
    category: 'bazaar',
    kind: 'trial',
    order: 2,
    symbol: 'G',
  },
  {
    id: 'bazaar-spice',
    name: 'Spice Keeper',
    description: 'Complete the Spice Merchant memory challenge.',
    category: 'bazaar',
    kind: 'trial',
    order: 3,
    symbol: 'S',
  },
  {
    id: 'bazaar-date',
    name: 'Palm Grove Trader',
    description: 'Complete the Date Merchant trade challenge.',
    category: 'bazaar',
    kind: 'trial',
    order: 4,
    symbol: 'D',
  },
  {
    id: 'bazaar-pottery',
    name: "Potter's Eye",
    description: 'Expose the fake pottery in the Pottery Seller trial.',
    category: 'bazaar',
    kind: 'trial',
    order: 5,
    symbol: 'P',
  },
  {
    id: 'bazaar-donkey',
    name: 'Desert Rider',
    description: 'Complete the Donkey Master race.',
    category: 'bazaar',
    kind: 'trial',
    order: 6,
    symbol: 'R',
  },
  {
    id: 'bazaar-eagle',
    name: 'Sky Courier',
    description: 'Complete the Eagle Keeper delivery challenge.',
    category: 'bazaar',
    kind: 'trial',
    order: 7,
    symbol: 'E',
  },
  {
    id: 'bazaar-master',
    name: 'Bazaar Master',
    description: 'Complete all seven Bazaar merchant trials.',
    category: 'bazaar',
    kind: 'quest',
    order: 8,
    symbol: '★',
    requires: [
      'bazaar-map',
      'bazaar-grain',
      'bazaar-spice',
      'bazaar-date',
      'bazaar-pottery',
      'bazaar-donkey',
      'bazaar-eagle',
    ],
  },

  {
    id: 'pyramid-sage',
    name: 'Pyramid Sage',
    description: 'Complete the Pyramid quest and solve its ancient riddles.',
    category: 'pyramid',
    kind: 'quest',
    order: 1,
    symbol: '▲',
  },

  {
    id: 'temple-scarab',
    name: 'Scarab Seal',
    description: 'Earn the sacred Scarab Seal.',
    category: 'temple',
    kind: 'trial',
    order: 1,
    symbol: '◆',
  },
  {
    id: 'temple-eye',
    name: 'Eye Seal',
    description: 'Earn the watchful Eye Seal.',
    category: 'temple',
    kind: 'trial',
    order: 2,
    symbol: '◈',
  },
  {
    id: 'temple-ankh',
    name: 'Ankh Seal',
    description: 'Earn the sacred Ankh Seal.',
    category: 'temple',
    kind: 'trial',
    order: 3,
    symbol: '✚',
  },
  {
    id: 'temple-falcon',
    name: 'Falcon Seal',
    description: 'Earn the swift Falcon Seal.',
    category: 'temple',
    kind: 'trial',
    order: 4,
    symbol: '▲',
  },
  {
    id: 'temple-lotus',
    name: 'Lotus Seal',
    description: 'Earn the blooming Lotus Seal.',
    category: 'temple',
    kind: 'trial',
    order: 5,
    symbol: '✿',
  },
  {
    id: 'temple-sun',
    name: 'Sun Seal',
    description: 'Earn the radiant Sun Seal.',
    category: 'temple',
    kind: 'trial',
    order: 6,
    symbol: '☀',
  },
  {
    id: 'temple-crown',
    name: 'Royal Crown Seal',
    description: 'Earn the final Royal Crown Seal.',
    category: 'temple',
    kind: 'trial',
    order: 7,
    symbol: '♛',
  },
  {
    id: 'temple-ascendant',
    name: 'Temple Ascendant',
    description: 'Collect all seven sacred Temple seals.',
    category: 'temple',
    kind: 'quest',
    order: 8,
    symbol: '★',
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
