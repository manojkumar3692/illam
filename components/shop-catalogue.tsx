"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Camera,
  Paintbrush,
  Package,
  Hammer,
  HardHat,
  Lamp,
  Search,
  Droplets,
  Truck,
} from "lucide-react";
import {
  amazonSearch,
  filterShop,
  shopCategories,
  type ShopCategory,
} from "@/lib/shop";
const icons = {
  All: Package,
  CCTV: Camera,
  Cement: Package,
  Paint: Paintbrush,
  Equipment: Hammer,
  Safety: HardHat,
  Home: Lamp,
};
export default function ShopCatalogue() {
  const [category, setCategory] = useState<ShopCategory>("All");
  const [search, setSearch] = useState("");
  const picks = filterShop(category, search);
  return (
    <>
      <div className="catalogue-controls">
        <label className="catalogue-search">
          <Search size={19} />
          <input
            type="search"
            aria-label="Search shop"
            placeholder="Find cameras, paint, tools…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="catalogue-categories" aria-label="Shop categories">
          {shopCategories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="catalogue-heading">
        <h2>{category === "All" ? "Useful picks for your build" : category}</h2>
        <span role="status">{picks.length} items</span>
      </div>
      <div className="catalogue-grid">
        {picks.map((p) => {
          const Icon = icons[p.category];
          return (
            <article className="catalogue-card" key={p.name}>
              <div className={"catalogue-art art-" + p.category.toLowerCase()}>
                <Icon size={48} strokeWidth={1.3} />
                <span>{p.category}</span>
              </div>
              <div className="catalogue-body">
                {p.local && (
                  <small className="catalogue-local">
                    LOCAL SUPPLY RECOMMENDED
                  </small>
                )}
                <h3>{p.name}</h3>
                <p>{p.use}</p>
                <p className="catalogue-check">
                  <strong>Before you buy</strong>
                  {p.check}
                </p>
                {p.source && (
                  <a
                    className="catalogue-source"
                    href={p.source}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Manufacturer details ↗
                  </a>
                )}
                <a
                  className="catalogue-buy"
                  href={amazonSearch(p.query)}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  aria-label={"Search Amazon for " + p.name}
                >
                  Search on Amazon <ArrowUpRight size={18} />
                </a>
              </div>
            </article>
          );
        })}
      </div>
      {!picks.length && (
        <div className="catalogue-empty">
          <h3>No matching items yet</h3>
          <p>Try a different name or browse all categories.</p>
          <button
            className="button"
            onClick={() => {
              setCategory("All");
              setSearch("");
            }}
          >
            Show all items
          </button>
        </div>
      )}
      <section className="catalogue-local-services">
        <div>
          <Truck size={27} />
          <h3>Heavy materials, locally supplied.</h3>
          <p>
            Bricks, M-sand, jally and bulk cement are best planned with your
            site team and local suppliers.
          </p>
        </div>
        <div>
          <Droplets size={27} />
          <h3>Water-load booking</h3>
          <p>
            Coming soon. ILLAM does not take delivery bookings or payments yet.
          </p>
        </div>
      </section>
    </>
  );
}
