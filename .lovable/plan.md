

# 🎯 "Guess the Alarm" - Hebrew RTL Betting App

## Overview
A dark-themed, mobile-first prediction market app where users bet virtual coins on Israeli rocket alert patterns. RTL Hebrew interface with neon green (#00ff88) on dark purple/black (#0d0d1a) design.

## Tech Stack
- React + TypeScript + Tailwind (existing)
- Firebase (Auth, Realtime Database) with provided config
- RTL layout throughout

## Pages & Features

### 1. Auth Flow
- Login/Register page with Email/Password + Google Sign-in via Firebase Auth
- Username selection modal on first login, grant 500M starting coins
- Save user profile to Firebase `/users/{uid}`

### 2. Home Page (דף הבית)
- Header with coin balance (top-left) + "GUESS THE ALARM" branding (top-right, neon green)
- Username + logout button
- Warning banner: "לא כסף אמיתי - לבידור בלבד"
- **Live alerts feed**: Poll oref.org.il alerts every 10s (via CORS proxy), show area + time ago, daily count badge
- **Betting market**: Toggle between "הימורים נפוצים" / "יחסים דינמיים", 2-column grid of all 26 bet cards with emoji, Hebrew description, and neon green multiplier badges

### 3. Bet Modal
- Triggered on bet card click
- Coin input with quick buttons (1M, 10M, 50M, 100M, MAX)
- Shows potential winnings (amount × multiplier)
- "!הימר" confirm button, deducts coins and saves to Firebase `/bets/{betId}`

### 4. Build a Bet Page (בנה הימור)
- Scope selector: עיר / אזור / כללי
- 4 bet type cards: כמה סה"כ, אובר/אנדר, תקופת שקט, אזעקת לילה
- "ההימורים שלי" section showing user's open bets

### 5. My Bets Page (ההימורים שלי)
- Tabs: פתוחים / היסטוריה
- Open bets with status badges, History with win (green 🏆) / loss (red ✗) indicators

### 6. Profile & Leaderboard Page
- User stats (coins, wins, losses)
- Betting groups (create/join)
- Global leaderboard ranked by coins, current user highlighted

### 7. Bottom Navigation Bar
- 4 tabs: 🏠 בית, 🎰 הימר, 📋 ההימורים שלי, 👤 פרופיל

## Core Logic
- **Alert polling**: Fetch from oref.org.il every 10s via CORS proxy, store to Firebase
- **Bet resolution**: Client-side checks against alert data (night quiet, over/under counts, quiet periods)
- **Coin management**: Deduct on bet placement, credit (amount × multiplier) on win, update leaderboard

## Design System
- Background: #0d0d1a, Cards: #1a1a2e, Accent: #00ff88
- Large bold numbers for coins/multipliers
- Full RTL layout, Hebrew primary language
- Mobile-first (no desktop optimization needed)

