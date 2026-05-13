import Link from "next/link";

interface Props {
  variant?: "full" | "compact";
}

export default function Footer({ variant = "full" }: Props) {
  const year = new Date().getFullYear();

  if (variant === "compact") {
    return (
      <footer className="bg-(--color-ivory) border-t border-(--color-cream) py-3 px-5 text-xs text-(--color-moss)/80">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>© {year} OpenHouse Map</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/privacy" className="hover:text-(--color-deep)">
              פרטיות
            </Link>
            <Link href="/terms" className="hover:text-(--color-deep)">
              תנאי שימוש
            </Link>
            <Link href="/accessibility" className="hover:text-(--color-deep)">
              נגישות
            </Link>
            <Link href="/cookies" className="hover:text-(--color-deep)">
              עוגיות
            </Link>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-(--color-ivory) border-t border-(--color-cream) px-5 py-8">
      <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
        <div>
          <h3 className="text-lg font-bold text-(--color-deep) mb-1">
            OpenHouse Map
          </h3>
          <p className="text-sm text-(--color-moss) leading-relaxed">
            המפה הארצית של הבתים הפתוחים בישראל.
            <br />
            כל ה-Open House־ים, מכל חברות התיווך, במקום אחד.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-(--color-deep) mb-2">
            מידע משפטי
          </h4>
          <ul className="space-y-1.5 text-sm text-(--color-moss)">
            <li>
              <Link href="/privacy" className="hover:text-(--color-deep)">
                מדיניות פרטיות
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-(--color-deep)">
                תנאי שימוש
              </Link>
            </li>
            <li>
              <Link href="/accessibility" className="hover:text-(--color-deep)">
                הצהרת נגישות
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="hover:text-(--color-deep)">
                מדיניות עוגיות
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-(--color-deep) mb-2">
            יצירת קשר
          </h4>
          <ul className="space-y-1.5 text-sm text-(--color-moss)">
            <li>
              <a
                href="mailto:openhousemap@gmail.com"
                className="hover:text-(--color-deep)"
              >
                openhousemap@gmail.com
              </a>
            </li>
            <li>
              <span className="text-(--color-moss)/70">
                רכז נגישות: Edmont
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-6 pt-4 border-t border-(--color-cream) text-xs text-(--color-moss)/70 flex flex-wrap justify-between gap-2">
        <span>© {year} OpenHouse Map · AdmontREM</span>
        <span>נבנה בישראל</span>
      </div>
    </footer>
  );
}
