"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { api, type Product, type ProductColor, type Settings } from "../../shared/api/client";
import { useAuth } from "../../shared/context/useAuth";
import { money } from "../../shared/money";

const field = "h-10 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-black";

type AdminColor = ProductColor & { stock: Record<string, string> };

type FormState = {
  name: string;
  price: string;
  category: string;
  gender: Product["gender"];
  brand: string;
  material: string;
  sizes: string;
  description: string;
  isNewArrival: boolean;
  isBestSeller: boolean;
  colors: AdminColor[];
};

const emptyForm = (category: string): FormState => ({
  name: "", price: "", category, gender: "unisex", brand: "Rivowear", material: "", sizes: "S, M, L, XL", description: "",
  isNewArrival: false, isBestSeller: false, colors: [{ name: "Black", hex: "#111827", images: [], stock: {} }],
});

const toForm = (product: Product): FormState => ({
  name: product.name, price: String(product.price), category: product.category, gender: product.gender, brand: product.brand,
  material: product.material, sizes: product.sizes.join(", "), description: product.description,
  isNewArrival: product.isNewArrival, isBestSeller: product.isBestSeller, colors: product.colors.map((color) => ({
    ...color,
    images: [...color.images],
    stock: Object.fromEntries(product.sizes.map((size) => [size, String(product.variants.find((v) => v.color === color.name && v.size === size)?.stock ?? 0)])),
  })),
});

const AdminProducts = () => {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm("top-wear"));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const sizeList = form.sizes.split(",").map((size) => size.trim()).filter(Boolean);

  useEffect(() => {
    Promise.all([api.products(), api.settings()])
      .then(([list, config]) => {
        setProducts(list.products);
        setSettings(config.settings);
      })
      .catch((requestError: Error) => setError(requestError.message));
  }, []);

  const open = (target: Product | "new") => {
    setEditing(target);
    setForm(target === "new" ? emptyForm(settings?.categories[0]?.slug ?? "top-wear") : toForm(target));
    setError("");
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const setColor = (index: number, patch: Partial<AdminColor>) =>
    setForm((current) => ({ ...current, colors: current.colors.map((color, position) => (position === index ? { ...color, ...patch } : color)) }));

  const addPhotos = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!token || files.length === 0) return;
    setUploading(index);
    setError("");
    api.admin
      .uploadImages(token, files)
      .then((urls) => setForm((current) => ({ ...current, colors: current.colors.map((color, position) => (position === index ? { ...color, images: [...color.images, ...urls] } : color)) })))
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setUploading(null));
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!token || !editing) return;
    if (form.colors.some((color) => color.images.length === 0)) {
      setError("Every color needs at least one photo.");
      return;
    }
    const sizes = form.sizes.split(",").map((size) => size.trim()).filter(Boolean);
    const input = {
      name: form.name.trim(), description: form.description.trim(), price: Number(form.price), category: form.category,
      gender: form.gender, brand: form.brand.trim(), material: form.material.trim(),
      sizes,
      isNewArrival: form.isNewArrival, isBestSeller: form.isBestSeller,
      colors: form.colors.map(({ name, hex, images }) => ({ name: name.trim(), hex, images })),
      // One stock number for every color and size (blank means 0).
      variants: form.colors.flatMap((color) => sizes.map((size) => ({ color: color.name.trim(), size, stock: Math.max(0, Math.floor(Number(color.stock[size]) || 0)) }))),
    };
    setBusy(true);
    setError("");
    const request = editing === "new" ? api.admin.createProduct(token, input) : api.admin.updateProduct(token, editing.id, input);
    request
      .then(({ product }) => {
        setProducts((current) => (editing === "new" ? [product, ...(current ?? [])] : (current ?? []).map((item) => (item.id === product.id ? product : item))));
        setEditing(null);
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setBusy(false));
  };

  const remove = (product: Product) => {
    if (!token || !window.confirm(`Delete "${product.name}"?`)) return;
    api.admin
      .deleteProduct(token, product.id)
      .then(() => setProducts((current) => current?.filter((item) => item.id !== product.id) ?? null))
      .catch((requestError: Error) => setError(requestError.message));
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{products?.length ?? 0} products</p>
        <button type="button" onClick={() => open("new")} className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">Add product</button>
      </div>
      {error && !editing && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}

      {editing && (
        <form onSubmit={save} className="mt-6 grid gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">{editing === "new" ? "New product" : `Edit ${editing.name}`}</h2>
          <input required placeholder="Name" value={form.name} onChange={(event) => set("name", event.target.value)} className={field} />
          <input required type="number" min="1" step="1" placeholder="Price (৳)" value={form.price} onChange={(event) => set("price", event.target.value)} className={field} />
          <select value={form.category} onChange={(event) => set("category", event.target.value)} className={field} aria-label="Category">
            {settings?.categories.map((category) => <option key={category.slug} value={category.slug}>{category.label}</option>)}
          </select>
          <select value={form.gender} onChange={(event) => set("gender", event.target.value as Product["gender"])} className={field} aria-label="Gender">
            <option value="men">Men</option><option value="women">Women</option><option value="unisex">Unisex</option>
          </select>
          <input placeholder="Brand" value={form.brand} onChange={(event) => set("brand", event.target.value)} className={field} />
          <input placeholder="Material" value={form.material} onChange={(event) => set("material", event.target.value)} className={field} />
          <input required placeholder="Sizes (comma separated)" value={form.sizes} onChange={(event) => set("sizes", event.target.value)} className={field} />
          <textarea placeholder="Description" rows={3} value={form.description} onChange={(event) => set("description", event.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black sm:col-span-2" />

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Colors and photos</h3>
              <button type="button" onClick={() => set("colors", [...form.colors, { name: "", hex: "#9ca3af", images: [], stock: {} }])} className="text-sm underline underline-offset-4">+ Add color</button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Each color has its own photos. Customers see the photos change when they pick a color, and can filter the shop by color.</p>
            <div className="mt-3 space-y-4">
              {form.colors.map((color, index) => (
                <div key={index} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <input type="color" value={color.hex} onChange={(event) => setColor(index, { hex: event.target.value })} aria-label="Color swatch" className="h-10 w-12 cursor-pointer rounded border border-gray-200" />
                    <input required placeholder="Color name (e.g. Olive Green)" value={color.name} onChange={(event) => setColor(index, { name: event.target.value })} className={`${field} max-w-xs`} />
                    {form.colors.length > 1 && <button type="button" onClick={() => set("colors", form.colors.filter((_, position) => position !== index))} className="ml-auto text-sm text-red-700 underline underline-offset-4">Remove color</button>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {color.images.map((image, imageIndex) => (
                      <div key={image} className="relative">
                        <img src={image} alt="" className="h-20 w-16 rounded object-cover" />
                        <button type="button" aria-label="Remove photo" onClick={() => setColor(index, { images: color.images.filter((_, position) => position !== imageIndex) })} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-black text-xs text-white">×</button>
                        {imageIndex === 0 && <span className="absolute bottom-0 left-0 rounded-tr bg-black/70 px-1 text-[10px] text-white">Main</span>}
                      </div>
                    ))}
                    <label className="flex h-20 w-16 cursor-pointer items-center justify-center rounded border border-dashed border-gray-300 text-center text-xs text-gray-500 hover:border-black">
                      {uploading === index ? "Uploading..." : "+ Photos"}
                      <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(event) => addPhotos(index, event)} />
                    </label>
                  </div>
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <p className="text-xs font-medium text-gray-700">
                      Stock for {color.name || "this color"} by size
                      <span className="ml-2 font-normal text-gray-500">(0 = sold out, customers cannot order it)</span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {sizeList.map((size) => (
                        <label key={size} className="text-xs text-gray-600">
                          {size}
                          <input
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            value={color.stock[size] ?? ""}
                            placeholder="0"
                            onChange={(event) => setColor(index, { stock: { ...color.stock, [size]: event.target.value } })}
                            className="mt-1 block h-9 w-20 rounded-md border border-gray-200 px-2 text-sm outline-none focus:border-black"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isNewArrival} onChange={(event) => set("isNewArrival", event.target.checked)} /> New arrival</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isBestSeller} onChange={(event) => set("isBestSeller", event.target.checked)} /> Best seller</label>
          {error && <p className="text-sm text-red-600 sm:col-span-2" role="alert">{error}</p>}
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={busy || uploading !== null} className="rounded-md bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-60">{busy ? "Saving..." : "Save"}</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-gray-200 px-5 py-2 text-sm">Cancel</button>
          </div>
        </form>
      )}

      {!products && !error && <p className="mt-6 text-sm text-gray-500">Loading products...</p>}
      {products && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-175 text-left text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{["Product", "Colors", "Price", "Stock", ""].map((heading) => <th key={heading} className="px-5 py-3 font-medium">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3"><div className="flex items-center gap-3"><img src={product.image} alt="" className="h-12 w-10 rounded object-cover" /><div><p className="font-medium">{product.name}</p><p className="text-xs text-gray-500">{product.category.replace(/-/g, " ")} · {product.gender}{product.isNewArrival && " · new"}{product.isBestSeller && " · best seller"}</p></div></div></td>
                  <td className="px-5 py-3"><div className="flex gap-1">{product.colors.map((color) => <span key={color.name} title={color.name} className="h-4 w-4 rounded-full border border-gray-300" style={{ backgroundColor: color.hex }} />)}</div></td>
                  <td className="px-5 py-3">{money(product.price)}</td>
                  <td className="px-5 py-3">
                    <span className={product.stock === 0 ? "font-medium text-red-600" : ""}>{product.stock}</span>
                    {product.variants.some((variant) => variant.stock === 0) && (
                      <p className="text-xs text-red-600">{product.variants.filter((variant) => variant.stock === 0).length} of {product.variants.length} sold out</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap"><button type="button" onClick={() => open(product)} className="mr-4 underline underline-offset-4">Edit</button><button type="button" onClick={() => remove(product)} className="text-red-700 underline underline-offset-4">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default AdminProducts;
