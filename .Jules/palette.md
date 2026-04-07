## 2025-04-07 - Add accessibility features to custom buttons

**Learning:** Custom UI elements like icon-only buttons (`button` with an emoji or SVG instead of text) need an explicit `aria-label` attribute to properly convey their functionality to screen reader users. Also, custom-styled buttons lacking standard outline styles fail keyboard accessibility without appropriate `focus-visible` styles. Purely decorative icons/emojis in buttons or text should have `aria-hidden="true"` so screen readers don't read them out redundantly, ensuring a cleaner auditory experience.
**Action:** When building custom icon-only or custom-styled buttons in React/Tailwind, always verify three things:
1. Is an `aria-label` present?
2. Are `focus-visible` outline styles defined to support keyboard navigation (e.g. `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`)?
3. Are pure decorative visuals (like emojis) hidden from screen readers using `aria-hidden="true"`?