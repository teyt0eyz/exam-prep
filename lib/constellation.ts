import type { AccentKey } from './subjects';

// Layout for the home "knowledge map": one cluster per subject, one star per
// lesson. Pure and deterministic so the SVG fallback and the WebGL scene agree.

export interface MapSubject {
  id: string;
  short: string;
  accent: AccentKey;
  lessons: { slug: string; title: string }[];
}

export interface MapStar {
  subject: string;
  accent: AccentKey;
  slug: string;
  x: number;
  y: number;
  z: number;
  read: boolean;
  current: boolean;
}

export interface MapLayout {
  stars: MapStar[];
  /** Pairs of star indexes: consecutive lessons inside a subject. */
  links: [number, number][];
  hubs: { subject: string; accent: AccentKey; x: number; y: number; z: number }[];
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

export function layoutMap(
  subjects: MapSubject[],
  isRead: (subject: string, slug: string) => boolean,
  current?: { subject: string; slug: string },
): MapLayout {
  const stars: MapStar[] = [];
  const links: [number, number][] = [];
  const hubs: MapLayout['hubs'] = [];

  subjects.forEach((s, i) => {
    const angle = (i / subjects.length) * Math.PI * 2 - Math.PI / 2;
    const cx = Math.cos(angle) * 3.3;
    const cy = Math.sin(angle) * 2.0;
    const cz = Math.sin(angle * 2) * 0.7;
    hubs.push({ subject: s.id, accent: s.accent, x: cx, y: cy, z: cz });

    s.lessons.forEach((l, j) => {
      const r = 0.27 * Math.sqrt(j + 1.4);
      const t = j * GOLDEN + i;
      if (j > 0) links.push([stars.length - 1, stars.length]);
      stars.push({
        subject: s.id,
        accent: s.accent,
        slug: l.slug,
        x: cx + Math.cos(t) * r,
        y: cy + Math.sin(t) * r * 0.85,
        z: cz + Math.sin(j * 1.7 + i) * 0.35,
        read: isRead(s.id, l.slug),
        current: current?.subject === s.id && current.slug === l.slug,
      });
    });
  });
  return { stars, links, hubs };
}
