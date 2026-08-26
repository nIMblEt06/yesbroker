---
version: alpha
name: Nike
description: Monochrome. Massive uppercase. Full-bleed photography.
colors:
  primary: "#111111"
  secondary: "#757575"
  tertiary: "#111111"
  neutral: "#FAFAFA"
  surface: "#FFFFFF"
  on-primary: "#FFFFFF"
typography:
  display:
    fontFamily: Archivo Black
    fontSize: 7rem
    fontWeight: 900
    letterSpacing: "-0.035em"
  h1:
    fontFamily: Archivo Black
    fontSize: 3rem
    fontWeight: 900
  body:
    fontFamily: Inter
    fontSize: 0.98rem
    lineHeight: 1.55
  label:
    fontFamily: Archivo Black
    fontSize: 0.72rem
    letterSpacing: "0.18em"
rounded:
  sm: 0px
  md: 2px
  lg: 4px
spacing:
  sm: 8px
  md: 16px
  lg: 32px
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 12px 20px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: 24px
---
## Overview

Nike: monochrome UI, massive all-caps display, full-bleed hero photography, condensed bold sans.

## Colors

The palette is built around high-contrast neutrals and a single accent that drives interaction.

- **Primary (`#111111`):** Headlines and core text.
- **Secondary (`#757575`):** Borders, captions, and metadata.
- **Tertiary (`#111111`):** The sole driver for interaction. Reserve it.
- **Neutral (`#FAFAFA`):** The page foundation.

## Typography

- **display:** Archivo Black 7rem
- **h1:** Archivo Black 3rem
- **body:** Inter 0.98rem
- **label:** Archivo Black 0.72rem

## Do's and Don'ts

- **Do** use Tertiary for exactly one action per screen.
- **Do** let Neutral carry the composition — negative space is a feature.
- **Don't** introduce gradients. This system is flat on purpose.
- **Don't** mix Tertiary with alternate accents; the single-accent rule is load-bearing.
