import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import ShopCatalogue from "@/components/shop-catalogue";
export const metadata = {
  title: "Shop · ILLAM",
  description:
    "Useful cameras, paint, tools and site essentials for your home build.",
};
export default function Shop() {
  return (
    <div className="public-page shop-page">
      <header className="public-header">
        <Link href="/app#more">
          <ArrowLeft size={19} /> Back to project
        </Link>
        <Link href="/" className="wordmark">
          illam<span>•</span>
        </Link>
      </header>
      <main>
        <section className="shop-intro catalogue-intro">
          <span className="eyebrow">ILLAM SHOP · FOR THE WHOLE TEAM</span>
          <h1>
            Good things.
            <br />
            For the home you’re building.
          </h1>
          <p>
            Cameras for peace of mind. Tools for the work. Finishes that feel
            like home.
          </p>
          <div className="catalogue-note">
            Browse together. Buy on Amazon <ArrowUpRight size={16} />
          </div>
        </section>
        <aside className="catalogue-disclosure">
          As an Amazon Associate I earn from qualifying purchases. These are
          curated starting points, not a bestseller ranking. Links open Amazon
          search results; check the exact item, seller, price and delivery
          availability there.
        </aside>
        <ShopCatalogue />
        <p className="shop-disclaimer">
          Shopping is open to owners, architects, contractors, family and
          friends. Purchases happen on Amazon and are not automatically added to
          your project expenses or stock.
        </p>
      </main>
    </div>
  );
}
