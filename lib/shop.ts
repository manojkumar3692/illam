export const shopCategories = [
  "All",
  "CCTV",
  "Cement",
  "Paint",
  "Equipment",
  "Safety",
  "Home",
] as const;
export type ShopCategory = (typeof shopCategories)[number];
export const affiliateTag = "manojkuma073b-21";
export function amazonSearch(query: string) {
  const url = new URL("https://www.amazon.in/s");
  url.searchParams.set("k", query);
  url.searchParams.set("tag", affiliateTag);
  url.searchParams.set("linkCode", "ll2");
  return url.toString();
}
export type ShopPick = {
  name: string;
  category: ShopCategory;
  use: string;
  check: string;
  query: string;
  source?: string;
  local?: boolean;
};
export const shopPicks: ShopPick[] = [
  {
    name: "Qubo outdoor camera",
    category: "CCTV",
    use: "A starting point for keeping an eye on the site entrance.",
    check: "Check outdoor rating, power, Wi-Fi coverage and recording storage.",
    query: "Qubo outdoor security camera",
    source: "https://www.quboworld.com/pages/security-bundles",
  },
  {
    name: "CCTV recording essentials",
    category: "CCTV",
    use: "Storage for the footage you may need later.",
    check:
      "Match endurance microSD capacity to your camera’s supported specification.",
    query: "high endurance microSD security camera",
  },
  {
    name: "UltraTech PPC cement",
    category: "Cement",
    use: "Discuss the required cement type with your site engineer.",
    check:
      "Local supplier recommended for bulk orders. Confirm grade, fresh stock and delivery cost.",
    query: "UltraTech PPC cement",
    source:
      "https://www.ultratechcement.com/for-homebuilders/products/overview/ppc",
    local: true,
  },
  {
    name: "Asian Paints Tractor Emulsion",
    category: "Paint",
    use: "An interior wall finish to shortlist for your rooms.",
    check: "Choose the exact shade, pack size and primer with your painter.",
    query: "Asian Paints Tractor Emulsion",
    source:
      "https://www.asianpaints.com/paint-products/interior-wall-paints/tractor.html",
  },
  {
    name: "Asian Paints Apex Ultima Protek",
    category: "Paint",
    use: "An exterior paint system to discuss before finishing the outside.",
    check: "Confirm surface preparation and the full coating system required.",
    query: "Asian Paints Apex Ultima Protek",
    source:
      "https://www.asianpaints.com/content/ap/en/home/paint-products/exterior-wall-paints/apex-ultima-protek.html",
  },
  {
    name: "SmartCare Damp Proof",
    category: "Paint",
    use: "Waterproofing to consider while planning your terrace work.",
    check: "Have your applicator confirm surface suitability and coverage.",
    query: "Asian Paints SmartCare Damp Proof",
    source:
      "https://www.asianpaints.com/content/ap/en/home/waterproofing-products/smartcare-damp-proof.html",
  },
  {
    name: "Bosch GSB 600 impact drill",
    category: "Equipment",
    use: "A tool to shortlist for drilling and installation work.",
    check:
      "Compare kit contents and suitable drill bits for your wall material.",
    query: "Bosch GSB 600 Professional impact drill",
    source:
      "https://www.bosch-professional.com/in/en/products/gsb-600-06011A03F1",
  },
  {
    name: "Measuring tape & spirit level",
    category: "Equipment",
    use: "Everyday measuring and alignment tools for the site.",
    check: "Choose readable markings and a length that suits the job.",
    query: "measuring tape spirit level construction",
  },
  {
    name: "Concrete vibrator",
    category: "Equipment",
    use: "Compare equipment options with the contractor before a concrete pour.",
    check:
      "Confirm specifications, power supply and whether local rental is better value.",
    query: "concrete vibrator construction machine",
  },
  {
    name: "Site helmet",
    category: "Safety",
    use: "Include head protection in your site essentials.",
    check:
      "Choose the applicable certified protection and correct fit for the work.",
    query: "BIS certified industrial safety helmet",
  },
  {
    name: "Safety shoes & work gloves",
    category: "Safety",
    use: "Personal protection for people working on site.",
    check:
      "Match protection, sizing and grip to the task; check certification with the seller.",
    query: "construction safety shoes work gloves",
  },
  {
    name: "Rechargeable work light",
    category: "Home",
    use: "Portable lighting for inspections and finishing work.",
    check:
      "Check runtime, charging and suitability for the conditions on your site.",
    query: "rechargeable LED work light",
  },
  {
    name: "Door hardware",
    category: "Home",
    use: "Shortlist handles and door stops as rooms take shape.",
    check: "Confirm door thickness, dimensions and finish before ordering.",
    query: "door handle door stopper hardware",
  },
];
export function filterShop(category: ShopCategory, search: string) {
  const query = search.trim().toLowerCase();
  return shopPicks.filter(
    (p) =>
      (category === "All" || p.category === category) &&
      `${p.name} ${p.category} ${p.use}`.toLowerCase().includes(query),
  );
}
