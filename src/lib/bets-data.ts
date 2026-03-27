export interface BetTemplate {
  id: string;
  emoji: string;
  title: string;
  description: string;
  multiplier: number;
  category: "common" | "dynamic";
}

export const BETS: BetTemplate[] = [
  { id: "b1", emoji: "🌙", title: "אזעקת לילה בשומרה", description: "אזעקה בשומרון בין 00:00-06:00", multiplier: 3.8, category: "common" },
  { id: "b2", emoji: "📊", title: "מעל 20 אזעקות היום", description: "סה\"כ מעל 20 אזעקות היום", multiplier: 1.1, category: "common" },
  { id: "b3", emoji: "📈", title: "אובר 10 במרכז היום", description: "מעל 10 אזעקות במרכז הארץ היום", multiplier: 1.1, category: "common" },
  { id: "b4", emoji: "🕊️", title: "שקט מעל שעה", description: "לא תהיה אזעקה במשך שעה", multiplier: 202.1, category: "dynamic" },
  { id: "b5", emoji: "📈", title: "אנדר 5 בדרום ב-3 שעות", description: "פחות מ-5 אזעקות בדרום ב-3 שעות", multiplier: 1.1, category: "common" },
  { id: "b6", emoji: "🌙", title: "לילה שקט בשרון", description: "אין אזעקות בשרון בין 00:00-06:00", multiplier: 3.8, category: "common" },
  { id: "b7", emoji: "🎯", title: "יום שקט - 0 אזעקות", description: "אפס אזעקות לאורך כל היום", multiplier: 378.4, category: "dynamic" },
  { id: "b8", emoji: "🎯", title: "אזעקה בשומרה", description: "תהיה אזעקה באזור השומרון", multiplier: 8.9, category: "common" },
  { id: "b9", emoji: "🌙", title: "+3 אזעקות לילה במרכז", description: "מעל 3 אזעקות לילה במרכז", multiplier: 4.4, category: "common" },
  { id: "b10", emoji: "🕊️", title: "אזעקה תוך 5 דקות", description: "תהיה אזעקה בתוך 5 דקות", multiplier: 1.1, category: "dynamic" },
  { id: "b11", emoji: "📈", title: "אנדר 3 בשעה הקרובה", description: "פחות מ-3 אזעקות בשעה הקרובה", multiplier: 248.1, category: "dynamic" },
  { id: "b12", emoji: "🌙", title: "לילה שקט בדרום", description: "אין אזעקות בדרום בין 00:00-06:00", multiplier: 10.4, category: "common" },
  { id: "b13", emoji: "🎯", title: "אובר 5 במרכז בשעה", description: "מעל 5 אזעקות במרכז תוך שעה", multiplier: 14.5, category: "dynamic" },
  { id: "b14", emoji: "🏙️", title: "אזעקה בת\"א", description: "תהיה אזעקה בתל אביב", multiplier: 2.4, category: "common" },
  { id: "b15", emoji: "🛡️", title: "אנדר 10 בצפון היום", description: "פחות מ-10 אזעקות בצפון היום", multiplier: 2.9, category: "common" },
  { id: "b16", emoji: "🕊️", title: "שקט +30 דקות", description: "לא תהיה אזעקה במשך 30 דקות", multiplier: 80.8, category: "dynamic" },
  { id: "b17", emoji: "🌙", title: "+5 אזעקות לילה כללי", description: "מעל 5 אזעקות לילה בכל הארץ", multiplier: 1.1, category: "common" },
  { id: "b18", emoji: "📈", title: "אובר 3 בעוטף עזה בשעה", description: "מעל 3 אזעקות בעוטף עזה תוך שעה", multiplier: 11, category: "dynamic" },
  { id: "b19", emoji: "🏠", title: "אזעקה בב\"ש ב-6 שעות", description: "אזעקה בבאר שבע תוך 6 שעות", multiplier: 1.9, category: "common" },
  { id: "b20", emoji: "📈", title: "אובר 20 בדרום היום", description: "מעל 20 אזעקות בדרום היום", multiplier: 74.3, category: "dynamic" },
  { id: "b21", emoji: "📈", title: "אובר 30 במרכז היום", description: "מעל 30 אזעקות במרכז היום", multiplier: 45.3, category: "dynamic" },
  { id: "b22", emoji: "📊", title: "אנדר 20 בכל הארץ ב-6 שע'", description: "פחות מ-20 אזעקות בכל הארץ ב-6 שעות", multiplier: 191.1, category: "dynamic" },
  { id: "b23", emoji: "🎲", title: "50-100 אזעקות היום", description: "בין 50 ל-100 אזעקות היום", multiplier: 378.4, category: "dynamic" },
  { id: "b24", emoji: "📈", title: "10-20 אזעקות היום", description: "בין 10 ל-20 אזעקות היום", multiplier: 378.4, category: "dynamic" },
  { id: "b25", emoji: "📈", title: "אובר 50 היום", description: "מעל 50 אזעקות היום", multiplier: 1.1, category: "common" },
  { id: "b26", emoji: "📈", title: "אובר 100 היום", description: "מעל 100 אזעקות היום", multiplier: 7, category: "common" },
];
