# ניהול הוצאות הבית

אפליקציית Web פרטית לניהול הוצאות הבית (Next.js + Supabase). מסמכי האפיון נמצאים ב-`spec/`.

## הפעלה מקומית

1. דרישה: Node.js 20 ומעלה.
2. התקנה: `npm install`
3. הגדרות: מלאו את `.env` בפרטי פרויקט **Supabase Development** בלבד (שמות המשתנים מופיעים ב-`.env.example`). `SUPABASE_ENV` חייב להיות `development`, ו-`SITE_URL` הוא `http://localhost:3000`.
4. מסד נתונים (פעם אחת, ובכל פעם שנוסף Migration): `npm run db:push`
5. הרצה: `npm run dev`, ואז לפתוח בדפדפן את http://localhost:3000 (דווקא `localhost`, לא `127.0.0.1`).

## בדיקות

כל הבדיקות רצות מול פרויקט Supabase Development בענן. אין צורך ב-Docker או במסד נתונים מקומי.

| פקודה | מה היא בודקת |
|---|---|
| `npm test` | לוגיקה ורכיבי מסך, בלי רשת |
| `npm run test:integration` | הרשאות (RLS), חסימת הרשמה, בדיקת Session ו-30 יום, מול Development |
| `npm run test:e2e` | תרחישי דפדפן במחשב ובטלפון (מפעיל את השרת לבד; בהרצה ראשונה צריך גם `npx playwright install chromium`) |
| `npm run test:reset` | מוחק נתוני בדיקה מ-Development |

בדיקות לעולם לא רצות מול Production. הסקריפטים מסרבים לרוץ כש-`SUPABASE_ENV` אינו `development`.
