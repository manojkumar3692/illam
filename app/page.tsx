import Link from "next/link";
import {
  ArrowUpRight,
  Wallet,
  NotebookPen,
  ScanLine,
  Users,
  ArrowRight,
  House,
} from "lucide-react";
export default function Page() {
  return (
    <div className="public-page">
      <header className="public-header">
        <Link href="/" className="wordmark">
          illam<span>•</span>
        </Link>
        <Link href="/app?auth=login">
          Log in <ArrowUpRight size={17} />
        </Link>
      </header>
      <main>
        <section className="welcome-hero">
          <span className="eyebrow">FOR THE HOME YOU’RE BUILDING</span>
          <h1>
            A little less worry.
            <br />A home taking shape.
          </h1>
          <p>
            Money sent. Materials delivered. Work done.
            <br />
            Keep your whole build in one simple place.
          </p>
          <Link className="button primary" href="/app?auth=signup">
            Start your home <ArrowRight size={19} />
          </Link>
          <small>Free to use right now. No card needed.</small>
          <Link className="text-link" href="/app?demo=1">
            Take a look inside <ArrowUpRight size={16} />
          </Link>
        </section>
        <section className="build-preview" aria-label="Example home overview">
          <div className="preview-roof">
            <House size={29} />
            <span>YOUR HOME, ONE DAY AT A TIME</span>
          </div>
          <div className="preview-heading">
            <h2>From ground zero.</h2>
            <span className="badge">To the day you move in</span>
          </div>
          <div className="preview-steps">
            <span>Plan</span>
            <i />
            <span>Build</span>
            <i />
            <span>Move in</span>
          </div>
          <p>
            A clear picture of what’s spent, what’s needed next, and what’s
            happening on site.
          </p>
        </section>
        <section className="public-features">
          <span className="eyebrow">LESS CHASING. MORE CLARITY.</span>
          {[
            [
              Wallet,
              "Know where the money goes",
              "Record expenses and funds sent. See what’s left and which payments are coming up.",
            ],
            [
              ScanLine,
              "Turn paperwork into entries",
              "Read PDF bills, statements and bill photos. Review the extracted amounts before saving.",
            ],
            [
              NotebookPen,
              "Keep a daily site diary",
              "Follow progress, photos and material stock without digging through messages.",
            ],
            [
              Users,
              "Keep your people together",
              "Contractor, architect and family. Keep contacts and share access to your home.",
            ],
          ].map(([Icon, title, copy]) => {
            const I = Icon as typeof Wallet;
            return (
              <article key={String(title)}>
                <I size={25} />
                <div>
                  <h2>{String(title)}</h2>
                  <p>{String(copy)}</p>
                </div>
              </article>
            );
          })}
        </section>
        <Link href="/shop" className="shop-invite">
          <span className="eyebrow">THE ILLAM SHOP · COMING SOON</span>
          <h2>Everything your site needs.</h2>
          <p>Cement to cameras. Paint to a water load.</p>
          <span>
            Explore what’s coming <ArrowRight size={18} />
          </span>
        </Link>
        <section className="welcome-end">
          <h2>Your home starts here.</h2>
          <Link href="/app?auth=signup" className="button primary">
            Create your free account <ArrowRight size={18} />
          </Link>
          <p>Made for your phone. Add ILLAM to your home screen.</p>
        </section>
      </main>
      <footer className="public-footer">
        <span>illam • A place for your home.</span>
        <Link href="/app?auth=login">Open app</Link>
      </footer>
    </div>
  );
}
