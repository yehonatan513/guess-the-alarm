## 2024-06-25 - Massive DOM Bloat in List Rendering
**Learning:** Rendering large lists directly to the DOM (like the 1,450+ `CITIES` array) without constraints causes significant initial render lag and UI freezing.
**Action:** Always constrain large list renderings by either applying a limit (e.g., `.slice(0, 50)`) or implementing proper list virtualization when all items must be rendered.
