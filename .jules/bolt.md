## 2024-05-18 - [React.memo in frequently updated parent]
**Learning:** When parent components (like `Index` or `BuildBet` in this app) have internal tick timers (e.g. `minutesLeftToday`) or fast typing search states, wrapping large modal components (`BetModal`) in `React.memo` (with explicit generic typing `React.memo<Props>`) alongside `useCallback` for event handlers avoids heavy re-renders while the modal is not open.
**Action:** Consider `React.memo` for Modals/Dialogs at the top level of frequently rendering screens.
