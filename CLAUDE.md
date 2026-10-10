# Exam Prep Site

## Goal
Exam prep website for 5 CE subjects: OS, OODS, IST, Web App Dev, Applications for Business (BIZ). 
Each subject: lessons with interactive simulations + 3 mock exams × 70 MCQs.

## Stack
Next.js (App Router, static export), TypeScript strict, Tailwind CSS, MDX for lessons.
No backend. Progress and quiz history in localStorage (wrap in try/catch).

## Language
UI and explanations in Thai. Keep technical terms in English 
(e.g. "semaphore", "context switch"). Code and identifiers in English.

## Structure
- docs/<subject>/            course materials from the lecturer (source of truth)
- content/<subject>/*.mdx    lessons
- content/<subject>/quiz/set-{1,2,3}.json
- components/sim/            simulations, one folder per sim
- components/sim/core/       shared SimulationPlayer
- components/quiz/           quiz engine
- scripts/validate-quiz.ts

## Rules
- Mobile-first. Must work at 360px width with no horizontal scroll. 
  Touch targets >= 44px. Test every sim at mobile size.
- Every simulation uses the shared SimulationPlayer: a pure step function 
  `step(state) -> state` with history, so Step back works. 
  Controls: play/pause/step back/step forward/reset/speed. 
  Every step shows a Thai explanation of what just happened and why.
- Users can edit sim inputs (e.g. burst times, reference strings, buffer size).
- Content must follow docs/<subject>/. Don't add topics outside the syllabus 
  unless marked "เสริม". If docs and general knowledge conflict, follow docs 
  and note it.
- Quiz JSON schema: { id, topic, difficulty: 1-3, question, choices[4], 
  answer: 0-3, explanation, source } — explanation must say why the answer 
  is right AND why common wrong choices are wrong.
- Run `npm run validate:quiz` and `npm run build` before saying a task is done.
## Deploy
- Production: GitHub Pages at https://teyt0eyz.github.io/exam-prep/ (repo `teyt0eyz/exam-prep`).
  Deploy with `npm run deploy`: it builds with `NEXT_PUBLIC_BASE_PATH` and `NEXT_PUBLIC_SITE_URL`
  taken from the repo name and force-pushes `out/` to the `gh-pages` branch. Pushing `main` alone does not deploy.
- The site is served from `/exam-prep`, so never hard-code a leading-slash URL: use `next/link`,
  or `BASE_PATH` / `SITE_URL` from `lib/site.ts`.
- `.github/deploy-workflow.yml.example` is a ready Actions workflow (deploy on push). It is not active
  because the gh token lacks the `workflow` scope; to use it, run `gh auth refresh -s workflow`,
  move it to `.github/workflows/deploy.yml` and switch Pages to the "GitHub Actions" source.
- `docs/` is git-ignored (lecturer's slides stay local). Nothing in the build may read from it.
- Cloudflare Pages at https://exam.chickyon.com was the original plan and is on hold.
- next.config: output: 'export', images: { unoptimized: true }, trailingSlash: true
- No server features: no API routes, no middleware, no server actions, 
  no dynamic routes without generateStaticParams
- metadataBase, OG tags, sitemap and robots all come from `SITE_URL` in `lib/site.ts`