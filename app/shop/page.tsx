import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Paintbrush,
  BrickWall,
  Package,
  Droplets,
  Lamp,
} from "lucide-react";
export default function Shop() {
  return (
    <div className="public-page shop-page">
      <header className="public-header">
        <Link href="/app#more">
          <ArrowLeft size={19} /> Back to your home
        </Link>
        <Link href="/" className="wordmark">
          illam<span>•</span>
        </Link>
      </header>
      <main>
        <section className="shop-intro">
          <span className="eyebrow">ILLAM SHOP</span>
          <h1>
            For every corner.
            <br />
            For every stage.
          </h1>
          <p>Site essentials, without the running around.</p>
          <span className="badge">Coming soon</span>
          <p className="muted">
            A preview of what we’re planning. Shopping and delivery requests
            aren’t available yet.
          </p>
        </section>
        <div className="shop-grid">
          {[
            [
              Camera,
              "Site cameras",
              "CCTV & home security",
              "Keep an eye on your home, wherever you are.",
            ],
            [
              Package,
              "Build the basics",
              "Cement & supplies",
              "The essentials that keep your site moving.",
            ],
            [
              BrickWall,
              "One brick at a time",
              "Bricks & blocks",
              "Materials for the walls taking shape.",
            ],
            [
              Paintbrush,
              "Make it yours",
              "Paint & finishes",
              "Colour, care and the finishing touches.",
            ],
            [
              Lamp,
              "The small things",
              "Home essentials",
              "Useful little additions for everyday living.",
            ],
            [
              Droplets,
              "Water for the work",
              "Water-load requests",
              "Plan a tanker delivery when your site needs it.",
            ],
          ].map(([Icon, kicker, title, description]) => {
            const I = Icon as typeof Camera;
            return (
              <article className="shop-tile" key={String(title)}>
                <div className="shop-art">
                  <I size={56} strokeWidth={1.25} />
                </div>
                <small>{String(kicker)}</small>
                <h2>{String(title)}</h2>
                <p>{String(description)}</p>
                <span className="badge">Coming soon</span>
              </article>
            );
          })}
        </div>
        <p className="shop-disclaimer">
          Availability, delivery areas and prices will be shared when the shop
          opens. No orders or requests are being collected.
        </p>
      </main>
    </div>
  );
}
