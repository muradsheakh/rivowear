import { insertAdmin, adminExists } from "../repo/users.js";
import { countProducts, insertProduct } from "../repo/products.js";
import { saveSettings, settingsExist } from "../repo/misc.js";
import { hashPassword } from "../security.js";
import type { Gender, Product, Settings, Variant } from "../types.js";

const img = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=85`;
const PHOTO = {
  grayShirt: "1603252110481-7ba873bf42ab",
  blackShirt: "1596755389378-c31d21fd1273",
  whiteShirt: "1521572163474-6864f9cf17ab",
  navyShirt: "1563630423918-b58f07336ac9",
  offShoulder: "1515886657613-9f3515b0c78f",
  knit: "1551488831-00ddcb6c6bd3",
  joggers: "1512436991641-6745cdb1723f",
  linen: "1605763240000-7e93b172d754",
  trousers: "1541099649105-f69ad21f3246",
  relaxedTrouser: "1506629905607-d9d2f1f3b6a4",
};

const seedProduct = (
  id: string,
  name: string,
  price: number,
  category: string,
  gender: Gender,
  photos: [string, string],
  extra: Partial<Product> = {},
  stockMap: Record<string, number> = {},
): Product => {
  const product: Product = {
  id,
  name,
  description: `${name} crafted for everyday comfort. Soft-touch fabric, a clean silhouette and a durable finish that keeps its shape wash after wash.`,
  price,
  image: img(photos[0]),
  category,
  gender,
  brand: "Rivowear",
  material: "Cotton blend",
  sizes: ["S", "M", "L", "XL"],
  colors: [
    { name: "Black", hex: "#111827", images: [img(photos[0]), img(photos[1], 400)] },
    { name: "Gray", hex: "#6b7280", images: [img(photos[1]), img(photos[0], 400)] },
    { name: "Navy", hex: "#172554", images: [img(photos[0]), img(photos[1], 400)] },
  ],
  variants: [],
  stock: 0,
  isNewArrival: false,
  isBestSeller: false,
  createdAt: new Date().toISOString(),
  ...extra,
  };
  // Every color/size gets 6 in stock unless stockMap says otherwise ("Gray|XL": 0 means sold out).
  const variants: Variant[] = product.colors.flatMap((color) =>
    product.sizes.map((size) => ({ color: color.name, size, stock: stockMap[`${color.name}|${size}`] ?? 6 })),
  );
  return { ...product, variants, stock: variants.reduce((sum, variant) => sum + variant.stock, 0) };
};

export const seedProducts = (): Product[] => [
  seedProduct("shirt-slim-fit", "Slim-Fit Easy-Iron Shirt", 1450, "top-wear", "men", [PHOTO.grayShirt, PHOTO.whiteShirt], {
    description: "A slim-fit, easy-iron shirt in woven cotton fabric with a fitted silhouette. Features a turn-down collar, classic button placket, and a yoke at the back.",
    material: "Cotton",
    sizes: ["S", "M", "L", "XL", "XXL"],
    isBestSeller: true,
  }, {
    // Demo of partly sold-out stock: Black S is gone, Gray has only 2 L and no XL/XXL, Navy is fully sold out.
    "Black|S": 0, "Gray|L": 2, "Gray|XL": 0, "Gray|XXL": 0,
    "Navy|S": 0, "Navy|M": 0, "Navy|L": 0, "Navy|XL": 0, "Navy|XXL": 0,
  }),
  seedProduct("classic-black-shirt", "Classic Black Shirt", 1790, "top-wear", "men", [PHOTO.blackShirt, PHOTO.navyShirt], { isBestSeller: true }),
  seedProduct("everyday-trouser", "Everyday Relaxed Trouser", 2450, "bottom-wear", "men", [PHOTO.relaxedTrouser, PHOTO.trousers], { }),
  seedProduct("linen-shirt", "Relaxed Linen Shirt", 2200, "top-wear", "men", [PHOTO.linen, PHOTO.whiteShirt], { material: "Linen", isNewArrival: true }),
  seedProduct("navy-oxford", "Navy Oxford Shirt", 1990, "top-wear", "men", [PHOTO.navyShirt, PHOTO.grayShirt], {}),
  seedProduct("chino-trouser", "Everyday Trousers", 2490, "bottom-wear", "unisex", [PHOTO.trousers, PHOTO.relaxedTrouser], { isNewArrival: true }),
  seedProduct("off-shoulder-top", "Off-Shoulder Top", 1890, "top-wear", "women", [PHOTO.offShoulder, PHOTO.knit], { isNewArrival: true, isBestSeller: true }),
  seedProduct("knitted-crop-top", "Knitted Cropped Top", 1590, "top-wear", "women", [PHOTO.knit, PHOTO.offShoulder], { material: "Knit", isNewArrival: true }),
  seedProduct("high-rise-joggers", "High-Rise Joggers", 1690, "bottom-wear", "women", [PHOTO.joggers, PHOTO.trousers], { material: "French terry", isNewArrival: true, isBestSeller: true }),
  seedProduct("wide-leg-trouser", "Wide-Leg Trouser", 2790, "bottom-wear", "women", [PHOTO.trousers, PHOTO.joggers], {}),
  seedProduct("linen-blouse", "Linen Button Blouse", 2190, "top-wear", "women", [PHOTO.linen, PHOTO.offShoulder], { material: "Linen" }),
  seedProduct("lounge-joggers", "Lounge Joggers", 1590, "bottom-wear", "unisex", [PHOTO.joggers, PHOTO.relaxedTrouser], {}),
];

export const defaultSettings = (): Settings => ({
  storeName: "Rivowear",
  phone: "+8801701979554",
  email: "support@rivowear.com",
  address: "Dhaka, Bangladesh",
  whatsappNumber: "8801701979554",
  categories: [
    { slug: "top-wear", label: "Top wear" },
    { slug: "bottom-wear", label: "Bottom wear" },
  ],
  shipping: { insideDhaka: 70, outsideDhaka: 130, freeOver: 5000 },
  payments: {
    cod: true,
    sslcommerz: true,
    bkash: { enabled: true, number: "01700000000" },
    nagad: { enabled: true, number: "01800000000" },
  },
  invoiceNote: "Thank you for shopping with us. Exchange within 7 days with the invoice.",
  sms: { orderConfirmation: true, statusUpdates: true },
});


/** Fills an empty database with the first admin, default settings and demo products. Safe to run on every start. */
export const seedIfEmpty = async () => {
  if (!(await settingsExist())) await saveSettings(defaultSettings());
  if (!(await adminExists())) {
    const isProduction = process.env.NODE_ENV === "production";
    const contact = process.env.ADMIN_CONTACT || (isProduction ? "" : "admin@rivowear.com");
    const password = process.env.ADMIN_PASSWORD || (isProduction ? "" : "Admin@123");
    if (isProduction && (!contact || !password || password === "Admin@123")) {
      throw new Error("Set ADMIN_CONTACT and a unique ADMIN_PASSWORD before creating the first production admin.");
    }
    await insertAdmin(contact, await hashPassword(password));
    console.log("[db] created or promoted the first admin account");
  }
  if ((await countProducts()) === 0 && process.env.SEED_DEMO_PRODUCTS !== "false") {
    for (const product of seedProducts()) await insertProduct(product);
    console.log("[db] added demo products");
  }
};
