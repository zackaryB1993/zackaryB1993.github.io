# zblaylock-portfolio

Personal portfolio for Zackary Blaylock. Astro + Tailwind v4 + GSAP, deployed to GitHub
Pages at `https://zackaryb1993.github.io`. See `PLAN.md` for the full plan, phases, and
decisions.

## Project rules

- **Content source:** resume content belongs in `src/data/resume.ts` (from Phase 2 on).
  Don't hard-code resume text in components.
- **Public-level detail only:** no internal SendSafely or Delta names, hostnames, limits,
  or known weaknesses. Real numbers only.
- **Privacy:** never publish the phone number or street address.
- **PQVault:** always labeled "personal side project, in development". Repo is private and
  the marketing site is not public yet, so no external link.
- **Motion:** every animation must respect `prefers-reduced-motion` and leave the real
  text in the DOM.
- **Theme:** `src/styles/theme.css` is the only file with color values (nine keys:
  background, surface-dock, surface-card, surface-hover, accent-primary, accent-glow,
  accent-link, text-heading, text-muted). Everything else derives colors with
  `color-mix()` from those. Never hard-code a hex in a component or in `global.css`.
  Changing the theme means replacing the values in `theme.css` only.
- **Style test page:** `/style` renders every component with the current tokens. Keep it
  updated when adding components.
- **npm:** the user's npm config enforces `min-release-age=7`. If an install fails with
  `notarget`, pin to a release older than 7 days instead of changing the setting.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
