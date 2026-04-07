## 2024-04-07 - Slicing for Large DOM lists
**Learning:** Rendering the entire 1450+ items `CITIES` array directly to the DOM causes massive DOM bloat and UI lag.
**Action:** Use array slicing (e.g., `slice(0, 50)`) or virtualization when rendering large datasets to prevent UI freezing, especially when search strings are empty.
