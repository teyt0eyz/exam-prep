import type { AccentKey } from './subjects';

/**
 * Colours for the 3D books and the 2D fallback shelf. Same pairs as --grad-* in
 * design/tokens.css (keep them in sync); `ink` is the text-safe --acc-* shade.
 */
export interface BookStyle {
  from: string;
  to: string;
  ink: string;
  /** Pattern drawn on the cover. */
  motif: 'circuit' | 'tree' | 'network' | 'brackets' | 'chart';
}

export const BOOK_STYLE: Record<AccentKey, BookStyle> = {
  os: { from: '#83d5ff', to: '#8986ff', ink: '#2c64d4', motif: 'circuit' },
  ds: { from: '#93e6c0', to: '#83d5ff', ink: '#11785c', motif: 'tree' },
  net: { from: '#ffe58f', to: '#ffb477', ink: '#b0500c', motif: 'network' },
  web: { from: '#c3a7ff', to: '#8986ff', ink: '#5a4ddc', motif: 'brackets' },
  biz: { from: '#ff9fb8', to: '#ffb477', ink: '#c13a68', motif: 'chart' },
};
