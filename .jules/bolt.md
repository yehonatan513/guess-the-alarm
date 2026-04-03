## 2025-04-03 - [Index.tsx Location Search Optimization]
**Learning:** `Index.tsx` renders all 1450+ cities as individual button elements in a flex-wrap container when the user selects "city" scope and the search input is empty. This is a classic DOM bloat performance bottleneck causing slow initial render of the location picker and input lag when typing the first characters.
**Action:** Implement slicing on the `filteredCities` to limit the number of rendered buttons to something manageable (like 50-100), since users will use the search box to find specific cities anyway.
