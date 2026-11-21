// lib/tkey.ts — k('English text') marks text kept in a list or sent from the server as a translation key (shown
// later with t() or <T>), so scripts/missing-keys can find it. Plain module: server and browser code can both use it.

export const k = <S extends string>(text: S) => text
