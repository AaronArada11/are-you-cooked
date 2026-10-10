# Design

## Direction

A candidate practices on a laptop in a quiet evening setting. Dark charcoal surfaces reduce glare; warm ivory text and coral actions keep the workspace approachable. Restrained product UI, with personality concentrated in the mascot.

## System

Next.js App Router, Tailwind v4, shadcn/ui Radix primitives. OKLCH tokens live in `frontend/src/app/globals.css`. System sans for UI; SFMono/Consolas for code. Flat panels, 10px corners, one-pixel borders, no decorative shadows. Keyboard focus uses a coral outline. Reduced motion disables transitions.

## Layout

Start screen → resizable problem/editor/interviewer workspace → evidence-linked summary. Below 1100px, labeled panel controls replace the desktop columns. Local drafts remain in React memory; downloads are explicit. Session actions use the FastAPI state machine.

## Mascot

User-provided reference: upright kidney-shaped steak, amber eyes, small limbs, navy linework and white sticker outline. Six cells, in a 3×2 sheet: Rare, Medium Rare, Medium, Well, Well Done, Burnt. The reference supersedes the initial 3D concept. All current real sessions use the friendly neutral pose and an explicit unassessed label. The six doneness variants are previews until a validated assessment exists.

## Intentional concept adjustments

The generated workspace concept is a visual reference, not a source of problem content: use the repository's five-string exercise and ordering requirements. No fabricated running tests, typing indicator, or performance scores. Use flat color controls, the user's sticker mascot, and accurate recording limitations. Neutral desktop typography replaces image-generated all-caps section labels.
