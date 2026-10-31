# Portfolio plan

Personal portfolio for Zackary Blaylock, published with GitHub Pages at
`https://zackaryb1993.github.io`. Content comes from "The One Resume" (Google Doc).

Status: **Phases 0–4 done** (scaffold, design system, content, hero decrypt + particle
network, seven interactive 3D flow scenes with legends and fallbacks). Next: Phase 5,
timeline, skills, and contact animations.

Flow scenes: `src/data/flows.ts` holds the nodes, edges, routes, and hover blurbs for every
case study; `src/scenes/` holds the shared Three.js stage (`stage.ts`), the scene class
(`flow.ts`), the hero (`hero.ts`), and the decrypt effect. Desktop gets 3D; touch and
narrow screens get the SVG fallback; reduced motion gets no animation at all. Scene colors
are read from the theme CSS variables at runtime.

## Decisions so far

| Topic | Decision |
|---|---|
| GitHub account | `zackaryB1993` (personal) |
| Repo / URL | Repo `zackaryB1993.github.io`, served at the root URL |
| Look | Dark "encrypted" theme with a web3 visual language: near-black background with a subtle grid or mesh, glassmorphism cards, neon gradient accents, glow on borders and headings. Palette: **to be decided** (purple/cyan web3, or navy/orange matching the LinkedIn banner). |
| Animation | Rich 2D and scroll-driven, plus **one lightweight 3D scene per section** (hero and each case study, optionally contact). Decided 2026-10-30; replaces the earlier "no 3D" decision. |
| 3D guardrails | Single shared Three.js renderer with one scene swapped in per section; only the visible scene runs; device pixel ratio capped at 1.5; simple geometry only (wireframes, particles, shader materials); static fallback for `prefers-reduced-motion`; on mobile keep the hero scene and use 2D fallbacks for the rest; cap at six or seven scenes total. |
| Resume PDF | Yes, downloadable. Use a copy without the phone number. |
| Headshot | Yes. Zack will provide it later; use a styled placeholder until then. |
| PQVault status | Not live. Label it "personal side project, in development" everywhere. |
| PQVault link | Repo is private, so no code link. Link the Z&K Tech marketing site (`https://stage.zak-tech.us/`) for context, and switch to the production `zak-tech.us` URL once it is live. |

## Stack

| Piece | Choice | Why |
|---|---|---|
| Framework | [Astro](https://astro.build) + TypeScript | Static output for GitHub Pages, near-zero JS by default, already used on the Z&K Tech site |
| Styling | Tailwind CSS v4 | Fast to iterate, design tokens in CSS |
| Animation | GSAP (ScrollTrigger, SplitText, DrawSVG, MotionPath) | Free for commercial use, handles scroll-pinned and SVG path animation well |
| 3D | Three.js (vanilla module, no React) | One shared renderer; ~150 KB gzipped loaded once; scenes are small hand-written modules under `src/scenes/` |
| Smooth scroll | Lenis | Pairs with ScrollTrigger |
| Fonts | Self-hosted via Fontsource: Inter (text), JetBrains Mono (code/cipher effects), Comfortaa (display headings; same font as OnPoint) | No third-party font requests |
| Deploy | GitHub Actions (`withastro/action`) to GitHub Pages | Push to `main` deploys |

All resume content lives in one typed file, `src/data/resume.ts`, so updating the
resume means editing one place.

## Page structure

Single page with anchored sections, plus a small sticky nav that shows scroll progress.

1. **Hero.** The name starts as random ciphertext and "decrypts" into
   `Zackary Blaylock`, then the title and a one-line summary. Behind it, the hero 3D
   scene: a particle network or wireframe sphere that reacts gently to the cursor.
   Buttons: View work, Resume (PDF), GitHub, LinkedIn, Email.
2. **About.** Short version of the resume summary, with counters for numbers that are
   actually true: 8+ years, 3 production systems designed and built at SendSafely,
   3 AWS regions (US, EU, AU).
3. **Featured work.** One case study per project from the resume's Projects section.
   Each has a short write-up, a tech stack row, and a **3D scene that doubles as the
   architecture diagram**, animated as you scroll (section pinned while it plays), with
   a 2D SVG version as the mobile and reduced-motion fallback:
   - **SendSafely Actions.** Event packets flow along a path: platform event → workflow
     engine → native action or signed webhook → customer's scanner (DLP / antivirus) →
     callback → result. The packet visibly pauses at the webhook node and resumes on
     callback, which is the core idea of the design.
   - **SendSafely MCP Server.** Two paths converge on the API: local server (lock icon,
     encryption on the user's machine) and remote connector (metadata only).
   - **SendSafely OAuth Authorization Server.** A key shape passes through gates:
     sign-in and consent → authorization code with PKCE → access token → token
     exchange → scoped API call.
   - **Delta Payment Engine.** Card networks and wallets (PayPal, PayPal Credit, Alipay, Apple Pay,
     Google Pay, bank transfer) orbit one engine node; PSD2 and CID/CVV checks as gates.
   - **Delta eCredits, Certificates & Gift Cards.** Booking → payment engine →
     eCredit / eCert / Gift Card redemption → fare, taxes, and fees. Links to the public
     Delta page.
   - **PQVault** *(personal side project, in development)*. A lattice (nod to ML-KEM)
     with desktop, extension, web, and mobile clients around a Rust core.

   Below the case studies, a **"More work" grid** of glass cards (hover tilt, no 3D)
   for resume items that are bullets rather than projects: Bedrock form-building
   agents; integrations (Freshdesk, Zendesk, Salesforce, Outlook, Slack, Chrome,
   serverless email gateway); maintained SDKs (Java, Node.js, Python, .NET); Claude
   agent skills adopted by the team; AWS infrastructure with CloudFormation; CI/CD
   with GitHub Actions and CodeArtifact.
4. **Experience timeline.** A vertical line draws down the page as you scroll and each
   role lights up when reached: SendSafely, Delta, then Cox Automotive, Hiliteu, and
   Sicom as compact entries.
5. **Skills.** Grouped like the resume sidebar. Hovering or tapping a skill highlights
   the projects and roles that used it (mapping stored in `resume.ts`).
6. **Education.** University of Kentucky, Kennesaw State, Thinkful.
7. **Contact.** A terminal-style card that types out `contact --email`, then shows
   email, LinkedIn, and GitHub.

### Extras (after the core is done)

- `Cmd+K` command palette to jump to sections or open links.
- Magnetic hover on buttons and a soft cursor glow.
- A small easter egg, such as typing `decrypt` anywhere replays the hero effect.

## Content rules

- **Public-level detail only.** Diagrams and write-ups describe what each system does
  and how it fits together, at the same level as the resume and SendSafely's public help
  center. No internal repo names, hostnames, tenant names, limits, or known weak spots.
- **Real numbers only.** No invented metrics.
- **Privacy.** The site shows city (Roswell, GA), email, LinkedIn, and GitHub. No phone
  number or full street address.
- **PQVault** is always labeled as a personal side project in development.

## Accessibility and performance

- `prefers-reduced-motion`: skip scroll-jacking and decrypt effects and show final
  states immediately.
- Animated text keeps the real text in the DOM (`aria-label`) so screen readers and
  search engines read it correctly.
- Diagrams have text descriptions.
- Keyboard navigable, visible focus states, color contrast meets WCAG AA.
- Targets: Lighthouse 90+ performance, 100 accessibility, 100 SEO on mobile.
- Animation code loads per section, and the canvas pauses when off-screen.

## SEO and sharing

Title and description meta tags, Open Graph image (generated from the hero), favicon,
`sitemap.xml`, and JSON-LD `Person` data.

## Phases

Each phase ends with something you can look at before the next one starts.

| # | Phase | Result |
|---|---|---|
| 0 | Setup | Git repo initialized in this folder, Astro + Tailwind + GSAP scaffold, runs locally |
| 1 | Design system | Colors, type, spacing, buttons, section layout, a style test page |
| 2 | Content | `resume.ts` filled from the resume; all sections render as static content |
| 3 | Hero | Decrypt effect, shared Three.js renderer, hero scene, fallbacks |
| 4 | Case studies | Six 3D diagram scenes plus 2D fallbacks, one at a time; then the "More work" grid |
| 5 | Timeline, skills, contact | Remaining animations |
| 6 | Polish | Reduced motion, accessibility, performance, SEO, mobile pass |
| 7 | Deploy | Repo created on `zackaryB1993`, GitHub Actions deploy, live URL |
| 8 | Extras | Command palette, cursor effects, easter egg |
| 9 | GitHub profile | Profile README on `zackaryB1993` (repo `zackaryB1993/zackaryB1993`) linking to the portfolio |

## Setup notes

- This folder sits inside `~/Documents/code`, which is itself a git repo. The portfolio
  gets its own repo here; the parent should ignore it.
- The GitHub CLI is currently signed in as `zblaylockTackon`. Before Phase 7, sign in to
  `zackaryB1993` (`gh auth login`) or add it as a second account (`gh auth switch`).
- Local folder name can stay `zblaylock-portfolio`; the GitHub repo must be named
  `zackaryB1993.github.io` for the root URL to work.

## Open questions

- Palette: purple/cyan (typical web3) or navy/orange (matches the LinkedIn banner made
  2026-10-30 from SendSafely's site colors: navy #263b5e, orange #ee6723, green #28a745).
