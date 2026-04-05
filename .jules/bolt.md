## 2024-04-05 - Direct Rendering of Large Arrays Causes DOM Bloat
**Learning:** Rendering the entire `CITIES` array (over 1450 items) without virtualization or array slicing causes significant DOM bloat and UI lag, especially during search filtering when many elements match.
**Action:** Always use array slicing (e.g., `.slice(0, 50)`) or virtualization when rendering large lists to ensure the DOM is not overwhelmed by thousands of nodes.
