import Link from "next/link";
import LegalShell from "@/components/layout/LegalShell";

export const metadata = {
  title: "מדיניות עוגיות",
  description:
    "מדיניות העוגיות (Cookies) של OpenHouse Map — אילו עוגיות אנו משתמשים בהן ולמה.",
};

export default function CookiesPage() {
  return (
    <LegalShell
      title="מדיניות עוגיות"
      subtitle="OpenHouse Map — איך אנחנו משתמשים בעוגיות"
      lastUpdated="15 במאי 2026"
    >
      <p>
        מסמך זה מסביר אילו עוגיות (Cookies) ואחסון מקומי משמשים אותנו בשירות
        OpenHouse Map (להלן: <strong>&quot;השירות&quot;</strong>), מה הם עושים
        ואיך תוכל לשלוט בהם. מדיניות זו משלימה את{" "}
        <Link href="/privacy">מדיניות הפרטיות</Link>.
      </p>

      <h2>1. מהן עוגיות?</h2>
      <p>
        עוגיות הן קבצי טקסט קטנים שאתר שולח לדפדפן שלך כדי לזכור מידע בין
        ביקורים — למשל אם נכנסת לחשבון, באיזו שפה אתה משתמש, או אילו הגדרות
        בחרת.
      </p>
      <p>
        בנוסף לעוגיות אנו משתמשים גם ב-<strong>אחסון מקומי</strong>{" "}
        (localStorage) של הדפדפן לאותן מטרות, ובעיקר לזכירת העדפות.
      </p>

      <h2>2. אילו עוגיות אנחנו משתמשים</h2>

      <h3>2.1 עוגיות הכרחיות (Essential)</h3>
      <p>
        עוגיות אלה דרושות לפעולת השירות. בלעדיהן השירות לא יעבוד כראוי. הן אינן
        דורשות הסכמה.
      </p>
      <ul>
        <li>
          <strong>Firebase Auth Session</strong> — שמירת מצב התחברות לאחר login
          (Google / Apple / טלפון). יוצא תוקף אחרי שעה ומתחדש אוטומטית כל עוד
          אתה פעיל.
        </li>
        <li>
          <strong>locale</strong> — שפת הממשק שבחרת (עברית / English / Русский /
          Français).
        </li>
        <li>
          <strong>cookie-consent</strong> — שומר את בחירתך בבאנר העוגיות (כדי
          לא להציג שוב).
        </li>
      </ul>

      <h3>2.2 עוגיות פונקציונליות (Functional)</h3>
      <p>
        עוגיות אלו משפרות את חוויית השימוש אך אינן הכרחיות. אנו משתמשים בהן רק
        לאחר הסכמתך.
      </p>
      <ul>
        <li>
          <strong>theme</strong> — מצב כהה / בהיר אם בחרת ידנית (אחרת — לפי
          הגדרת המערכת).
        </li>
        <li>
          <strong>favourites-cache</strong> — תכולת רשימת המועדפים שלך לטעינה
          מהירה.
        </li>
        <li>
          <strong>last-viewed-events</strong> — היסטוריית עיון מקומית לקיצור
          חוזרות מהירות.
        </li>
      </ul>

      <h3>2.3 עוגיות אנליטיקה (Analytics)</h3>
      <p>
        כרגע <strong>איננו משתמשים בעוגיות אנליטיקה צד שלישי</strong> (כמו
        Google Analytics). אם בעתיד נוסיף, נעדכן מסמך זה ונבקש הסכמה מחודשת.
      </p>

      <h3>2.4 עוגיות צד שלישי</h3>
      <p>השירות מטעין משאבים מספקי תשתית, שמפעילים עוגיות משלהם:</p>
      <ul>
        <li>
          <strong>Google Firebase</strong> — לאימות משתמשים. עוגיות לגוגל אינן
          נוגעות אם אינך מחובר לחשבון Google.
        </li>
        <li>
          <strong>MapTiler / OpenStreetMap</strong> — אריחי המפה. ייתכן ויטענו
          עוגיות לזיהוי שימוש ב-CDN. ספקי המפה מצהירים שאינם מזהים אישית.
        </li>
        <li>
          <strong>Vercel</strong> — אחסון האתר. ייתכן שעוגיות פנימיות לניתוב
          (load balancing).
        </li>
      </ul>

      <h2>3. כמה זמן נשמרות העוגיות</h2>
      <ul>
        <li>
          <strong>עוגיות הפעלה (Session)</strong> — נמחקות בסגירת הדפדפן.
        </li>
        <li>
          <strong>עוגיות מתמשכות (Persistent)</strong> — נשמרות עד שנה מהשמירה,
          אלא אם תמחק אותן ידנית או דרך באנר העוגיות.
        </li>
        <li>
          <strong>Firebase Auth</strong> — מתחדש בכל פעולה. אתה יכול להתנתק בכל
          עת מתוך הדאשבורד.
        </li>
      </ul>

      <h2>4. איך תוכל לשלוט בעוגיות</h2>

      <h3>4.1 דרך הבאנר באתר</h3>
      <p>
        בעת הביקור הראשון יוצג באנר עוגיות. תוכל לבחור:
      </p>
      <ul>
        <li>
          <strong>הסכמה לכל</strong> — מאפשר את כל הסוגים מלבד עוגיות שלא קיימות
          אצלנו עדיין
        </li>
        <li>
          <strong>הכרחיות בלבד</strong> — רק עוגיות שאינן דורשות הסכמה
        </li>
        <li>
          <strong>שינוי בחירה</strong> בכל עת — לחץ על &quot;העדפות עוגיות&quot;
          בתחתית הדף
        </li>
      </ul>

      <h3>4.2 דרך הדפדפן</h3>
      <p>בכל דפדפן ניתן למחוק עוגיות ולחסום עתידיות. מדריכים:</p>
      <ul>
        <li>
          <a
            href="https://support.google.com/chrome/answer/95647?hl=he"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Chrome
          </a>
        </li>
        <li>
          <a
            href="https://support.mozilla.org/he/kb/cookies"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mozilla Firefox
          </a>
        </li>
        <li>
          <a
            href="https://support.apple.com/he-il/guide/safari/sfri11471/mac"
            target="_blank"
            rel="noopener noreferrer"
          >
            Safari (Mac)
          </a>
        </li>
        <li>
          <a
            href="https://support.microsoft.com/he-il/microsoft-edge"
            target="_blank"
            rel="noopener noreferrer"
          >
            Microsoft Edge
          </a>
        </li>
      </ul>

      <p>
        <strong>שים לב:</strong> חסימת עוגיות הכרחיות תמנע ממך להתחבר לחשבון
        ולפרסם אירועים.
      </p>

      <h2>5. שינויים במדיניות</h2>
      <p>
        אנו רשאים לעדכן מסמך זה מעת לעת. שינויים מהותיים יוצגו בבאנר ובדף
        הראשי.
      </p>

      <h2>6. יצירת קשר</h2>
      <p>
        לכל שאלה על עוגיות:{" "}
        <a href="mailto:openhousemap@gmail.com">openhousemap@gmail.com</a>
      </p>
    </LegalShell>
  );
}
