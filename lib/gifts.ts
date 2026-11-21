// lib/gifts.ts — The little gifts visitors can leave at a shrine. Shared by the picker (client) and the API (server).

export type GiftCategory = 'food' | 'toys' | 'little' | 'special'

export interface Gift {
  id: string
  emoji: string
  name: string
  category: GiftCategory
  /** Special gifts cost money (THB); the rest are free, one every FREE_GIFT_COOLDOWN_DAYS. */
  price?: number
  /** Special gifts that only show in some months (1–12). */
  months?: number[]
  /** A picture (under /public) for gifts no emoji draws well; the emoji stands in where a picture can't go. */
  img?: string
}

export const FREE_GIFT_COOLDOWN_DAYS = 3
export const FREE_GIFT_SHOWS_DAYS = 7
export const SPECIAL_GIFT_SHOWS_DAYS = 60

export const CATEGORIES: { id: GiftCategory; emoji: string; label: string; hint: string }[] = [
  { id: 'food', emoji: '🍪', label: 'Snacks', hint: 'Their favourite things to eat' },
  { id: 'toys', emoji: '🎾', label: 'Toys', hint: 'Something to play with' },
  { id: 'little', emoji: '🦋', label: 'Keepsakes', hint: 'Small things that say “I remember you”' },
  { id: 'special', emoji: '✨', label: 'Special', hint: `Stay by their shrine for ${SPECIAL_GIFT_SHOWS_DAYS} days with your name` },
]

const g = (category: GiftCategory, list: [string, string, string, number?, number[]?][]): Gift[] =>
  list.map(([id, emoji, name, price, months]) => ({ id, emoji, name, category, price, months }))

const WINTER = [11, 12]

export const GIFTS: Gift[] = [
  ...g('food', [
    ['treat', '🦴', 'A crunchy treat'], ['bowl', '🥣', 'A full bowl'], ['fish', '🐟', 'A little fish'],
  ]),
  { id: 'sweetfish', emoji: '🐟', name: 'Sweet dried fish', category: 'food', img: '/gifts/sweet-fish.svg' }, // ปลาหวาน
  ...g('food', [
    ['cheese', '🧀', 'A bit of cheese'], ['cookie', '🍪', 'A cookie'], ['carrot', '🥕', 'A carrot'],
    ['milk', '🥛', 'Warm milk'], ['cupcake', '🧁', 'A cupcake'], ['icecream', '🍦', 'An ice cream'],
    ['apple', '🍎', 'An apple'], ['strawberry', '🍓', 'Strawberries'], ['chicken', '🍗', 'Roast chicken'],
    ['egg', '🥚', 'A boiled egg'], ['sushi', '🍣', 'Some sushi'], ['pancakes', '🥞', 'Pancakes'],
    ['banana', '🍌', 'A banana'], ['watermelon', '🍉', 'Watermelon'], ['honey', '🍯', 'A pot of honey'],
    ['cake', '🎂', 'A birthday cake'], ['sausage', '🌭', 'A sausage'],
  ]),
  ...g('toys', [
    ['ball', '🎾', 'A tennis ball'], ['teddy', '🧸', 'A teddy bear'], ['yarn', '🧶', 'A ball of yarn'],
    ['mouse', '🐭', 'A toy mouse'], ['duck', '🦆', 'A rubber duck'], ['frisbee', '🥏', 'A frisbee'],
    ['feather', '🪶', 'A feather wand'], ['kite', '🪁', 'A kite'], ['box', '📦', 'A cardboard box'],
    ['sock', '🧦', 'An old sock'], ['stick', '🪵', 'The perfect stick'], ['yoyo', '🪀', 'A yo-yo'],
  ]),
  ...g('little', [
    ['stone', '🪨', 'A smooth stone'], ['butterfly', '🦋', 'A butterfly'], ['ribbon', '🎀', 'A ribbon'],
    ['bed', '🛏️', 'A soft bed'], ['lantern', '🏮', 'A paper lantern'], ['plant', '🪴', 'A little plant'],
    ['books', '📚', 'Bedtime stories'], ['nightlight', '💡', 'A night light'], ['tea', '🍵', 'A cup of tea'],
    ['clover', '🍀', 'A lucky clover'], ['shell', '🐚', 'A seashell'], ['mushroom', '🍄', 'A tiny mushroom'],
  ]),
  ...g('special', [
    ['tree', '🎄', 'A little Christmas tree', 45, WINTER], ['snowman', '⛄', 'A snowman', 45, WINTER],
    ['reindeer', '🦌', 'A reindeer', 45, WINTER], ['present', '🎁', 'A wrapped present', 35, WINTER],
    ['snowflake', '❄️', 'A snowflake', 35, WINTER], ['candycane', '🍬', 'A candy cane', 35, WINTER],
    ['roses', '🌹', 'Red roses', 35], ['sunflowers', '🌻', 'Sunflowers', 35], ['tulips', '🌷', 'Pink tulips', 35],
    ['bouquet', '💐', 'A bouquet', 35], ['rainbow', '🌈', 'A rainbow bridge', 45], ['star', '⭐', 'A guiding star', 45],
    ['moon', '🌙', 'A crescent moon', 45], ['halo', '😇', 'A golden halo', 45], ['crown', '👑', 'A little crown', 45],
    ['sparkles', '✨', 'Fairy lights', 45], ['dove', '🕊️', 'A white dove', 45], ['heart', '💖', 'A glowing heart', 45],
  ]),
]

export const giftById = (id: string) => GIFTS.find(x => x.id === id)

/** Gifts on offer this month (seasonal specials come and go). */
export const giftsFor = (category: GiftCategory, month = new Date().getMonth() + 1) =>
  GIFTS.filter(x => x.category === category && (!x.months || x.months.includes(month)))

/** A gift someone left, as the API returns it. */
export interface LeftGift {
  id: string
  item: string
  visitor_name: string
  created_at: string
}
