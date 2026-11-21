// lib/articles.ts — Pet loss guides shown on /guides and the landing page (texts are translation keys: k())

import { k } from './tkey'

export const ARTICLES = [
  {
    slug: 'what-is-the-rainbow-bridge',
    title: k('What is the Legend of the Rainbow Bridge?'),
    excerpt: k('The history and comforting prose behind the mythical realm where beloved pets wait across meadows of gold and spring.'),
    mins: 4,
    category: k('Comfort & Meaning'),
  },
  {
    slug: 'coping-with-the-first-week',
    title: k('Surviving the First Week After Pet Loss'),
    excerpt: k('Practical and emotional grounding strategies when the quietness of your home feels overwhelmingly heavy.'),
    mins: 6,
    category: k('Grief Support'),
  },
  {
    slug: 'helping-children-understand',
    title: k('How to Talk to Children About a Pet’s Passing'),
    excerpt: k('Age-appropriate guidance to help young kids process loss without fear or emotional confusion.'),
    mins: 5,
    category: k('Family Care'),
  },
  {
    slug: 'memorial-ideas-at-home',
    title: k('7 Meaningful Ways to Honor Your Pet at Home'),
    excerpt: k('From planting memorial gardens to keepsakes, simple rituals that bring enduring comfort.'),
    mins: 5,
    category: k('Memorials'),
  },
  {
    slug: 'condolence-messages-for-a-friend',
    title: k('What to Write in a Pet Loss Sympathy Card'),
    excerpt: k('Gentle words and heartfelt phrases when someone you care about is grieving a pet.'),
    mins: 3,
    category: k('Community'),
  },
]
