# CE Exam Prep

Exam prep site for five CE subjects (OS, OODS, IST, Web App Dev, Applications for Business): lessons with
interactive simulations and three 70-question mock exams per subject.

Static Next.js site (App Router, `output: 'export'`), TypeScript strict, Tailwind v4, MDX.
No backend: progress and quiz history live in the visitor's `localStorage`.

Production: <https://exam.chickyon.com> (Cloudflare Pages, auto-deploy from `main`).

## Commands

```bash
npm install
npm run dev             # http://localhost:3000
npm run validate:quiz   # check every quiz set (also runs before each build)
npm run build           # static export to out/
npm run preview         # serve out/ locally (npx serve out)
npm run typecheck
```

Run `npm run validate:quiz` and `npm run build` before calling a task done.

## Adding content

| What | Where |
|---|---|
| Lecturer's material (source of truth) | `docs/<subject>/` |
| Lesson | `content/<subject>/NN-name.mdx` — ordered by filename |
| Quiz set | `content/<subject>/quiz/set-{1,2,3}.json` |
| Simulation | `components/sim/<name>/` |
| Subject list | `lib/subjects.ts` |
| Design tokens | `design/tokens.css` (see Design below) |

Subject ids are `os`, `oods`, `ist`, `webapp`, `biz`. A subject marked `isDemo` in `lib/subjects.ts` is
exempt from the 70-question rule and left out of the sitemap; none exists at the moment.

### Lesson

```mdx
import { StackSim } from '@/components/sim/stack/StackSim';

export const meta = {
  title: 'ชื่อบทเรียน',
  summary: 'สรุปหนึ่งบรรทัด',
  chapter: { no: 3, title: 'Deadlock' }, // groups lessons on the subject page
  minutes: 12,
  sim: true,    // shows a "Simulation" chip
  extra: false, // true = outside the syllabus, shown with an "เสริม" badge
};

## หัวข้อ

<StackSim />
```

### Quiz set

A JSON array of questions:

```json
{
  "id": "os-s1-001",
  "topic": "CPU Scheduling",
  "difficulty": 2,
  "question": "…",
  "choices": ["…", "…", "…", "…"],
  "answer": 0,
  "explanation": "why the answer is right AND why the common wrong choices are wrong",
  "source": "docs/os/…"
}
```

`npm run validate:quiz` checks: 70 questions per set, ids unique across all sets, `answer`
in 0-3, four non-empty distinct choices, explanation and source present, no question text
repeated across a subject's three sets. It warns when one answer letter is correct in more
than 35% of a set, and when a set file is missing (`-- --strict` turns that into an error;
`-- os` checks one subject).

Choice order is shuffled each time a quiz starts. Answers are stored as the original index,
so `answer` in the JSON always refers to the order written in the file.

### Simulation

Every simulation goes through the shared player in `components/sim/core/`:

```tsx
<SimulationPlayer
  title="…"                   // accessible name
  initialState={initialState} // memoize it; a new reference restarts the sim
  step={step}                 // pure: (state) => next state
  isDone={isDone}
  render={(state, prev) => <svg viewBox="…" />}
  explain={(state, prev) => ({ title: 'P1 ขอ R2', body: 'Thai: what happened and why' })}
  status={(state) => ({ tone: 'waiting', label: 'Waiting' })} // header badge, optional
  inputs={<>editable inputs</>}
  legend={<>○ Process □ Resource</>}
/>
```

Because `step` is pure, the player computes the whole run up front. That is what makes
step back, "ขั้นที่ n / total", the progress segments and the desktop step list work, so
`step` must never mutate its argument. `components/sim/stack/` is the reference
implementation.

Draw states with the design's simulation tones, which pair a colour with a line style so
they read without colour: normal (solid `ink-3`), active (subject accent), waiting (dashed
amber), error (thick red), done (green).

## Design

`design/Exam Prep.dc.html` is the Claude Design source (design system + five screens at
390px and 1440px); `design/tokens.css` holds its tokens under the same names.
`app/globals.css` maps them to Tailwind utilities:

| Utility | Token | Use |
|---|---|---|
| `bg-canvas` | `--bg` | page background |
| `bg-surface`, `bg-surface-2` | `--surface`, `--surface-2` | cards / tracks, secondary fills |
| `border-line` | `--line` | borders, dividers |
| `text-ink`, `text-muted`, `text-faint` | `--ink`, `--ink-2`, `--ink-3` | primary / secondary / caption text |
| `bg-accent`, `bg-accent-soft`, `text-accent-ink` | `--acc`, `--acc-soft`, `--on-acc` | current subject's accent |
| `ok`, `warn`, `bad` (+ `-soft`) | `--done`, `--wait`, `--err` (+ `-bg`) | right / review / wrong, sim states |

Each subject has its own accent (`accent` in `lib/subjects.ts`). `app/[subject]/layout.tsx`
sets `data-accent` so everything under a subject picks it up through `--acc`.

Rules from the design system: radius 6 (badge) / 12 (control) / 16 (card) / 24 (sheet);
cards are surface + 1px line with no shadow; tappable rows are at least 44px, primary
buttons 48px, answer choices 56px. Shared class strings live in `components/ui/styles.ts`.

Layout: below `lg` each page has a 60px top bar; from `lg` up a 260px sidebar replaces it.
A running quiz is a full-screen focus mode with no site navigation.

## Deploying to Cloudflare Pages

The build writes a fully static site to `out/`, including `404.html`, `sitemap.xml`,
`robots.txt`, `og.png` and `_headers`.

### 1. Push the repo to GitHub

```bash
git init -b main
git add .
git commit -m "Phase 0: foundation"
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin main
```

### 2. Create the Pages project

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Authorize GitHub and pick the repository.
3. Build settings:

   | Setting | Value |
   |---|---|
   | Production branch | `main` |
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `out` |

   Do not pick the "Next.js" preset: it targets the Workers runtime adapter, and this site
   is a plain static export.
4. **Environment variables** → add `NODE_VERSION` = `22` (or newer) for Production and Preview.
5. **Save and Deploy**. Every push to `main` now deploys to production; other branches and
   pull requests get preview URLs.

### 3. Add the custom domain

1. In the Pages project → **Custom domains** → **Set up a custom domain**.
2. Enter `exam.chickyon.com`.
3. If `chickyon.com` is already a zone on the same Cloudflare account, Cloudflare creates
   the `CNAME exam → <project>.pages.dev` record for you. Otherwise add that CNAME at your
   DNS provider.
4. Wait for the status to become **Active** (the certificate is issued automatically).

### Notes

- `public/_headers` sets security headers on every response and a one-year immutable cache
  on `/_next/static/*` (those filenames are content-hashed).
- The Content-Security-Policy only allows same-origin scripts. If you enable Cloudflare Web
  Analytics, add `https://static.cloudflareinsights.com` to `script-src` and
  `https://cloudflareinsights.com` to `connect-src` in `public/_headers`.
- The site URL used for canonical links, Open Graph tags and the sitemap is `SITE_URL` in
  `lib/site.ts`.
- Static export means no API routes, middleware or server actions, and every dynamic route
  needs `generateStaticParams`.
