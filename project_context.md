# project_context.md — Guess the Alarm

## Project Overview
אפליקציית שוק חיזוי (prediction market) בעברית שבה משתמשים מתחרים ומרוויחים מטבעות וירטואליים על בסיס חיזוי אזעקות התרעה (צבע אדום) בישראל.
- **שם:** Guess the Alarm
- **GitHub:** https://github.com/yehonatan513/guess-the-alarm.git
- **Production URL:** https://guess-the-alarm.lovable.app

---

## Current Status
- **Phase:** גירסת MVP מתקדמת – המערכת חיה ולומדת מנתונים בעצמה. מותאמת ל-1,450 יישובי פיקוד העורף ול-30 אזורי התרעה רשמיים.
- **Last Updated:** 2026-03-30
- **Next Planned Step:** תכנון פיצ'ר גדול נוסף / שיפור ושחרור מסך BuildBet

---

## Architecture

### Frontend
- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- React Router DOM
- ממשק משתמש RTL (עברית) לחוויה מתקדמת.

### Backend / Database
- **Firebase Auth** - אימות משתמשים (Email/Password + Google Login).
- **Firebase Realtime Database** - משתמשים, הימורים, לידרבורד, קבוצות, וסטטיסטיקות למידת מערכת (`alert_stats`). *הכתיבות מתבצעות באמצעות טרנזקציות למניעת שגיאות אסינכרוניות.*
- **Supabase Edge Function** - שמשמש כ-CORS proxy לשליפת אזעקות היסטוריות בזמן אמת.

### External Services
- **Supabase proxy URL:** `https://cvokdzmibrxadrpiczow.supabase.co/functions/v1/fetch-alerts`
- **Alert data source:** מבוסס על היסטוריית התרעות לא מוגבלת. 

---

## Advanced Systems Engine (Smart Odds)
כדי למנוע תשלומים על פונקציות צד שרת יקרות, האפליקציה משתמשת בגישת **למידת המונים (Crowd-Sourced Ingestion)**:
1. **`useDataIngestion.ts`:** כל משתמש פעיל באפליקציה הופך להיות סוכן דוגם ששולח נתוני אזעקות טריים לתוך ה-Firebase באמצעות Transactions (למניעת כפילויות ולרישום אסינכרוני בטוח).
2. **`alert_stats`:** מבנה נתונים ב-DB שסופר סטטיסטיקות על ערים, אזורים ומספר אזעקות שעות/לילות (Day/Night).
3. **`odds-calculator.ts`:** לאחר צבירת כ-300 אזעקות היקס, המערכת מפעילה חישוב הסתברותי (Poisson Distribution) כדי לשנות דינמית את יחסי הזכייה בהימורי "יותר/פחות", "כמה יהיו", ועוד.

---

## Official Pikud HaOref Data
- **`cities-data.ts`:** קובץ ששאוב ישירות ממסד הקוד הפתוח של רשימות פיקוד העורף. מכיל 1,450 ישובים המשויכים באופן קפדני ומוחלט אל 30 אזורי ההתרעה האמיתיים בישראל (דן, ירקון, שפלת יהודה, וכו').

---

## Firebase Config
```
projectId: "guess-the-alarm"
databaseURL: "https://guess-the-alarm-default-rtdb.firebaseio.com"
authDomain: "guess-the-alarm.firebaseapp.com"
```

### Firebase DB Rules (עם אינדקסים מקושרים מטהרים)
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "leaderboard": {
      ".indexOn": "coins"
    },
    "bets": {
      ".indexOn": ["userId", "status"]
    }
  }
}
```

---

## Completed Features
- [x] Firebase Auth + עריכת והתאמת הרשאות קשוחות כולל אינדקסים.
- [x] Username validation + 500,000 Coins בונוס הרשמה מוגן בענן.
- [x] Home page - התרעות בזמן אמת תוך ספירת תדירות יומית + שוק הימורים חי.
- [x] פתרון הימורים אוטומטי (`useBetResolution`)
- [x] מערכת מיגרציה חלקה עבור מזהי משתמשים ולקביעת אזורים.
- [x] הפיכת קובץ מייצר ההימורים (`bet-generator.ts`) לעבודה עם 1,450 אזורי פיקוד העורף.
- [x] סנכרון Smart Odds מתמטי לאחר למידת דאטה טבעית.
- [x] עמוד פרופיל (היסטוריית הימורים, לידרבורד עולמי, איחוד מטבעות מותאם).
- [x] **אופטימיזציית ביצועים בקוד - פתרון באג איפוס מטבעות (מבוסס טרנזקציה), ומניעת קריאות API (Polling) מיותרות.**

## In Progress / נדרש המשך
- [ ] ייעול ושיפור מלא של עמוד `BuildBet` (בנה הימור מותאם אישית) שעכשיו מכיל קרוב ל-1,500 ערים באופן ויזואלי מהיר.
- [ ] Light/Dark mode toggle
- [ ] תכנון והגדרת פיצ'ר חברתי גדול או מערכת ה-'House'.

---

## Backlog
- הודעות Push אישיות לעדכוני ניצחונות/הפסדים/בטים שפגו.
- היסטוריית הצלחות / Win Rate למשתמש.

---

## Technical Decisions
| החלטה | נימוק |
|--------|--------|
| Firebase RTDB + Auth | יציבות המערכת ולמידת המונים מהירה מאוד ללא צורך לשלם לשרת מרכזי יקר |
| Poisson Distribution | גישה מתמטית תקנית לחישוב טלקום ואזעקות לצורך דיוק יחסי ההימורים. |
| Crowd-Sourced Parsing | שמירת הסטטיסטיקות מתבצעת אצל הלקוח בכתיבת Transactions מוגנת. חיסכון דרמטי בעלויות Cloud Functions |
| ערים ורשימות אזורים Hardcoded | למנוע איבוד דאטה וחיכיות רשת מיותרות - קובץ סטטי נטען ב-1 מ"ש |

---

## Known Issues / Blockers
- פתרון הימורים ב-Client Side עדיין דורש שהמשתמש יפתח את האפליקציה על מנת שההימור הניצח יסגר אוטומטית (אם לא משתמשים בקרבת אגירה בענן).

---

## File Structure (src/)
```
src/
├── App.tsx                    # הלב עם אינטגרציות ה-Hooks ומעטפת הלייאוט
├── index.css                  # תצורת Tailwind מרכזית
├── components/
│   ├── BetModal.tsx           # המודל לפתיחת בט מהיר במסך הבית
│   ├── BottomNav.tsx          # ניווט טלפוני (4 לשוניות)
│   └── UsernameModal.tsx      # החלון לבחירת השם (נשען על אימייל)
├── hooks/
│   ├── useAlertStats.ts       # אוגד משיכת דאטה לפערים המגויסים
│   ├── useDataIngestion.ts    # הלב של עקומת הלמידה (מטעין ל-Firebase)
│   ├── useAlerts.ts           # polling אזעקות
│   └── useBetResolution.ts    # פותר תקלות וקובע ניצחון/הפסד אסינכרוני
├── lib/
│   ├── cities-data.ts         # קובץ רשימת 1,450 ערי וה-30 מחוזות
│   ├── bet-generator.ts       # מכין את מבנה הטפסים וההימורים הראשי
│   ├── odds-calculator.ts     # מנוע ה-Poisson ליחסים דינמיים
│   └── firebase.ts            # קונפיגורציית DB
└── pages/
    ├── AuthPage.tsx
    ├── BuildBet.tsx
    ├── Index.tsx
    ├── MyBets.tsx
    └── Profile.tsx
```
