import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  lastUpdated: string;
  draft?: boolean;
  children: React.ReactNode;
}

export default function LegalShell({
  title,
  subtitle,
  lastUpdated,
  draft = false,
  children,
}: Props) {
  return (
    <main className="min-h-screen bg-(--color-ivory) text-(--color-deep)">
      <div className="max-w-3xl mx-auto px-5 py-10 md:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-(--color-moss) hover:text-(--color-deep) mb-6 font-medium"
        >
          <ArrowRight className="w-4 h-4" />
          חזרה למפה
        </Link>

        <header className="mb-8 pb-6 border-b border-(--color-cream)">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-(--color-deep)">
            {title}
          </h1>
          {subtitle && (
            <p className="text-base text-(--color-moss) font-medium">
              {subtitle}
            </p>
          )}
          <div className="mt-4 flex items-center gap-3 text-xs text-(--color-moss)/80">
            <span>עודכן לאחרונה: {lastUpdated}</span>
            {draft && (
              <span className="px-2 py-0.5 rounded-full bg-(--color-gold)/15 text-(--color-gold) font-medium">
                טיוטה — בהמתנה לבדיקה משפטית
              </span>
            )}
          </div>
        </header>

        <article className="legal-prose">{children}</article>

        <footer className="mt-12 pt-6 border-t border-(--color-cream) text-sm text-(--color-moss) flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/privacy" className="hover:text-(--color-deep)">
            מדיניות פרטיות
          </Link>
          <Link href="/terms" className="hover:text-(--color-deep)">
            תנאי שימוש
          </Link>
          <Link href="/accessibility" className="hover:text-(--color-deep)">
            הצהרת נגישות
          </Link>
          <Link href="/cookies" className="hover:text-(--color-deep)">
            מדיניות עוגיות
          </Link>
        </footer>
      </div>

      <style>{`
        .legal-prose h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          color: var(--color-deep);
          letter-spacing: -0.01em;
        }
        .legal-prose h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          color: var(--color-deep);
        }
        .legal-prose p {
          line-height: 1.7;
          margin-bottom: 0.85rem;
          color: var(--color-deep);
        }
        .legal-prose ul {
          margin: 0.5rem 0 1rem;
          padding-inline-start: 1.25rem;
          line-height: 1.7;
        }
        .legal-prose li {
          margin-bottom: 0.35rem;
        }
        .legal-prose strong {
          font-weight: 600;
          color: var(--color-deep);
        }
        .legal-prose a {
          color: var(--color-moss);
          text-decoration: underline;
        }
        .legal-prose a:hover {
          color: var(--color-deep);
        }
      `}</style>
    </main>
  );
}
