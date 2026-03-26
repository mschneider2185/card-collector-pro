/**
 * Card data normalizer — standardizes strings for matching.
 * Run on BOTH extracted data and checklist data before comparison.
 */

const NUMBER_WORDS: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
}

const BRAND_ALIASES: Record<string, string> = {
  ud: 'Upper Deck',
  'u.d.': 'Upper Deck',
  'pan.': 'Panini',
  'pan': 'Panini',
  'tops': 'Topps',
  fleer: 'Fleer',
  'o-pee-chee': 'O-Pee-Chee',
  opc: 'O-Pee-Chee',
}

const ABBREVIATIONS: Record<string, string> = {
  'ser.': 'Series',
  'rc': 'Rookie',
  'sp': 'Short Print',
  'ssp': 'Super Short Print',
  'auto': 'Autograph',
  'mem': 'Memorabilia',
}

/** Normalize a generic string: lowercase, trim, collapse spaces, strip punctuation. */
export function normalizeString(input: string | null | undefined): string {
  if (!input) return ''
  let s = input.trim().toLowerCase()
  // Collapse multiple spaces
  s = s.replace(/\s+/g, ' ')
  return s
}

/** Normalize a brand name with alias resolution. */
export function normalizeBrand(brand: string | null | undefined): string {
  if (!brand) return ''
  const lower = brand.trim().toLowerCase()
  return BRAND_ALIASES[lower] || brand.trim()
}

/** Normalize a set/series name: expand abbreviations, number words → digits. */
export function normalizeSetName(name: string | null | undefined): string {
  if (!name) return ''
  let s = name.trim()

  // Number words → digits
  for (const [word, digit] of Object.entries(NUMBER_WORDS)) {
    s = s.replace(new RegExp(`\\b${word}\\b`, 'gi'), digit)
  }

  // Abbreviations
  for (const [abbr, full] of Object.entries(ABBREVIATIONS)) {
    s = s.replace(new RegExp(`\\b${abbr.replace('.', '\\.')}\\b`, 'gi'), full)
  }

  return s.replace(/\s+/g, ' ').trim()
}

/** Normalize a player name for comparison. */
export function normalizePlayerName(name: string | null | undefined): string {
  if (!name) return ''
  let s = name.trim()
  // Remove common suffixes like Jr., Sr., III, etc. for matching purposes
  s = s.replace(/\s+(jr\.?|sr\.?|iii|ii|iv)$/i, '')
  // Strip periods from initials
  s = s.replace(/\./g, '')
  return s.replace(/\s+/g, ' ').trim()
}

/** Normalize a card number for comparison. */
export function normalizeCardNumber(num: string | null | undefined): string {
  if (!num) return ''
  // Remove leading # and whitespace
  let s = num.trim().replace(/^#/, '').trim()
  // Remove leading zeros for numeric-only numbers
  if (/^\d+$/.test(s)) {
    s = String(parseInt(s, 10))
  }
  return s
}
