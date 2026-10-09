"use client";

import { useSearchParams } from "@/shared/router";

type Option = { label: string; value: string };
type ShopFiltersProps = { categories: Option[]; colors: { name: string; hex: string }[] };

const GENDERS: Option[] = [
  { label: "All", value: "" },
  { label: "Men", value: "men" },
  { label: "Women", value: "women" },
];

const chip = (active: boolean) =>
  `rounded-full border px-4 py-1.5 text-sm transition ${active ? "border-black bg-black text-white" : "border-gray-200 text-gray-700 hover:border-black"}`;

/** The filter bar changes the address; the server then renders the matching products (good for search engines and sharing). */
const ShopFilters = ({ categories, colors }: ShopFiltersProps) => {
  const [params, setParams] = useSearchParams();
  const get = (key: string) => params.get(key) ?? "";
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const color = get("color").toLowerCase();

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {GENDERS.map((item) => (
            <button key={item.label} type="button" onClick={() => update("gender", item.value)} className={chip(get("gender") === item.value)}>{item.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[{ label: "All", value: "" }, ...categories].map((item) => (
            <button key={item.label} type="button" onClick={() => update("category", item.value)} className={chip(get("category") === item.value)}>{item.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <input key={`min-${get("minPrice")}`} type="number" min={0} placeholder="Min ৳" defaultValue={get("minPrice")} onBlur={(event) => update("minPrice", event.target.value)} className="h-9 w-24 rounded-md border border-gray-200 px-2 outline-none focus:border-black" aria-label="Minimum price" />
          <span className="text-gray-400">to</span>
          <input key={`max-${get("maxPrice")}`} type="number" min={0} placeholder="Max ৳" defaultValue={get("maxPrice")} onBlur={(event) => update("maxPrice", event.target.value)} className="h-9 w-24 rounded-md border border-gray-200 px-2 outline-none focus:border-black" aria-label="Maximum price" />
        </div>
        <select value={get("sort") || "newest"} onChange={(event) => update("sort", event.target.value)} className="h-9 rounded-md border border-gray-200 px-2 text-sm outline-none focus:border-black sm:ml-auto" aria-label="Sort products">
          <option value="newest">Newest</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="rating">Top rated</option>
          <option value="name">Name</option>
        </select>
      </div>

      {colors.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-600">Color:</span>
          {colors.map((item) => (
            <button
              key={item.name}
              type="button"
              title={item.name}
              aria-label={`Filter by ${item.name}`}
              aria-pressed={color === item.name.toLowerCase()}
              onClick={() => update("color", color === item.name.toLowerCase() ? "" : item.name)}
              className={`h-7 w-7 rounded-full border-2 ${color === item.name.toLowerCase() ? "border-black ring-2 ring-black ring-offset-2" : "border-gray-300"}`}
              style={{ backgroundColor: item.hex }}
            />
          ))}
          <label className="ml-auto flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={get("inStock") === "true"} onChange={(event) => update("inStock", event.target.checked ? "true" : "")} /> In stock only
          </label>
        </div>
      )}
    </div>
  );
};

export default ShopFilters;
