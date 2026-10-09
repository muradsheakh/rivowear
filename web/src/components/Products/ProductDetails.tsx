"use client";

import { money } from "../../shared/money";
import { useEffect, useRef, useState } from "react";
import { FaHeart, FaRegHeart, FaWhatsapp } from "react-icons/fa";
import Reviews from "./Reviews";
import Stars from "../../shared/components/Stars";
import { whatsappLink } from "../../shared/whatsapp";
import { useSettings } from "../../shared/context/useSettings";
import { useWishlist } from "../../shared/context/useWishlist";
import { useCart } from "../../context/useCart";
import { api, type Product, type Variant } from "../../shared/api/client";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const ProductDetails = ({ product, showReviews = false }: { product: Product; showReviews?: boolean }) => {
  const settings = useSettings();
  const wishlist = useWishlist();
  const wished = wishlist.ids.includes(product.id);
  const { addToCart, cartProducts } = useCart();

  // Stock is kept for each color AND size, so one sold-out size or color never hides the rest.
  // The page may come from a short-lived cache, so the latest stock is fetched again as soon as it opens.
  const [variants, setVariants] = useState<Variant[]>(product.variants);
  useEffect(() => {
    const refresh = () => api.product(product.id).then((response) => setVariants(response.product.variants)).catch(() => undefined);
    void refresh();
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [product.id]);

  const stockOf = (color: string, size: string) => variants.find((v) => v.color === color && v.size === size)?.stock ?? 0;
  const colorStock = (color: string) => product.sizes.reduce((sum, size) => sum + stockOf(color, size), 0);

  const firstColor = product.colors.find((color) => colorStock(color.name) > 0) ?? product.colors[0];
  const [selectedColor, setSelectedColor] = useState(firstColor?.name ?? "Default");
  const [chosenSize, setChosenSize] = useState<string | null>(
    () => product.sizes.find((size) => stockOf(firstColor?.name ?? "Default", size) > 0) ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(firstColor?.images[0] ?? product.image);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);
  const selectedColorData =
    product.colors.find((color) => color.name === selectedColor) ??
    product.colors[0] ?? { name: "Default", hex: "#111827", images: [product.image] };

  const colorSoldOut = colorStock(selectedColor) === 0;
  // If the chosen size is not available in the chosen color, nothing is selected and the customer is told why.
  const sizeUnavailable = chosenSize !== null && stockOf(selectedColor, chosenSize) === 0;
  const size = chosenSize !== null && !sizeUnavailable ? chosenSize : null;
  const variantStock = size ? stockOf(selectedColor, size) : 0;
  const inCart = size ? (cartProducts.find((item) => item.productId === product.id && item.color === selectedColor && item.size === size)?.quantity ?? 0) : 0;
  const remaining = Math.max(0, variantStock - inCart);
  const shownQuantity = Math.min(quantity, Math.max(remaining, 1));

  const handleAddToCart = () => {
    if (!size || remaining === 0) return;
    addToCart(
      { productId: product.id, name: product.name, price: product.price, size, color: selectedColor, image: selectedImage, maxStock: variantStock },
      shownQuantity,
    );
    setQuantity(1);
    setToastVisible(true);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastVisible(false), 1800);
  };

  const status = (() => {
    if (variants.every((variant) => variant.stock === 0)) return { text: "Out of stock", tone: "text-red-600" };
    if (colorSoldOut) return { text: `${selectedColor} is sold out in every size. Please choose another color.`, tone: "text-red-600" };
    if (sizeUnavailable) return { text: `Size ${chosenSize} is not available in ${selectedColor}. Please choose another size.`, tone: "text-red-600" };
    if (!size) return { text: "Please select a size.", tone: "text-gray-600" };
    if (remaining === 0) return { text: `You already have all ${variantStock} available in your cart.`, tone: "text-amber-600" };
    if (variantStock <= 5) return { text: `Only ${variantStock} left in ${selectedColor}, size ${size}.`, tone: "text-amber-600" };
    return { text: "In stock", tone: "text-green-700" };
  })();
  const buttonLabel = variants.every((variant) => variant.stock === 0) || colorSoldOut ? "SOLD OUT" : !size ? "SELECT A SIZE" : remaining === 0 ? "ALL IN CART" : "ADD TO CART";

  return (
    <section className="mx-auto max-w-6xl px-6 py-8 sm:py-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] lg:gap-10">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="order-2 flex shrink-0 flex-row gap-3 overflow-x-auto lg:order-1 lg:w-16 lg:flex-col">
            {selectedColorData.images.map((image) => (
              <button
                key={image}
                type="button"
                onClick={() => setSelectedImage(image)}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${
                  selectedImage === image
                    ? "border-gray-900"
                    : "border-gray-200"
                }`}
                aria-label={`View ${product.name}`}
              >
                <img
                  src={image}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
          <div className="order-1 aspect-4/5 min-w-0 flex-1 overflow-hidden rounded-lg lg:order-2">
            <img
              src={selectedImage}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-2xl font-bold text-gray-950 sm:text-3xl">
              {product.name}
            </h3>
            <button
              type="button"
              onClick={() => void wishlist.toggle(product.id)}
              aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={wished}
              className="mt-1 text-2xl text-rose-600"
            >
              {wished ? <FaHeart /> : <FaRegHeart />}
            </button>
          </div>
          {product.rating && product.rating.count > 0 && (
            <a href="#reviews" className="mt-2 inline-block">
              <Stars value={product.rating.average} count={product.rating.count} />
            </a>
          )}
          <p className="mt-2 text-lg text-gray-700">
            {money(product.price)}
          </p>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            {product.description}
          </p>

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-medium text-gray-800">
              Color: {selectedColor}
              {colorSoldOut && <span className="ml-2 text-red-600">(sold out)</span>}
            </legend>
            <div className="flex flex-wrap gap-3">
              {product.colors.map((color) => {
                const soldOut = colorStock(color.name) === 0;
                return (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => {
                      setSelectedColor(color.name);
                      setSelectedImage(color.images[0] ?? product.image);
                      setQuantity(1);
                    }}
                    style={{ backgroundColor: color.hex }}
                    title={soldOut ? `${color.name} (sold out)` : color.name}
                    className={`relative h-8 w-8 overflow-hidden rounded-full border-2 ${soldOut ? "opacity-50" : ""} ${
                      selectedColor === color.name ? "border-gray-400 ring-2 ring-gray-900 ring-offset-2" : "border-white"
                    }`}
                    aria-label={`Select ${color.name}${soldOut ? " (sold out)" : ""}`}
                    aria-pressed={selectedColor === color.name}
                  >
                    {soldOut && <span className="absolute top-1/2 left-1/2 h-0.5 w-11 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white mix-blend-difference" />}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-medium text-gray-800">Size{size ? `: ${size}` : ""}</legend>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((item) => {
                const available = stockOf(selectedColor, item) > 0;
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={!available}
                    onClick={() => {
                      setChosenSize(item);
                      setQuantity(1);
                    }}
                    title={available ? undefined : `${item} is sold out in ${selectedColor}`}
                    className={`rounded border px-4 py-2 text-sm ${
                      size === item
                        ? "border-gray-900 bg-gray-900 text-white"
                        : available
                          ? "border-gray-200 hover:border-gray-900"
                          : "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300 line-through"
                    }`}
                    aria-pressed={size === item}
                    aria-label={available ? item : `${item} (sold out in ${selectedColor})`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5">
            <span className="mb-2 block text-sm font-medium text-gray-800">
              Quantity
            </span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() =>
                  setQuantity((current) => Math.max(1, current - 1))
                }
                className="h-8 w-8 rounded bg-gray-100 text-lg"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span>{shownQuantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((current) => Math.min(Math.max(remaining, 1), current + 1))}
                className="h-8 w-8 rounded bg-gray-100 text-lg"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={colorSoldOut || !size || remaining === 0}
            className="mt-6 disabled:cursor-not-allowed disabled:opacity-50 rounded bg-gray-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            {buttonLabel}
          </button>

          <p className={`mt-3 text-sm ${status.tone}`} role="status">
            {status.text}
          </p>
          {settings?.whatsappNumber && (
            <a
              href={whatsappLink(settings.whatsappNumber, `Hi! I have a question about "${product.name}" (${SITE}/product/${product.id})`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:underline"
            >
              <FaWhatsapp className="h-5 w-5" /> Ask about this product on WhatsApp
            </a>
          )}

          <div className="mt-10 border-t pt-5">
            <h4 className="font-semibold">Characteristics:</h4>
            <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm text-gray-600">
              <dt>Brand</dt>
              <dd>{product.brand}</dd>
              <dt>Category</dt>
              <dd className="capitalize">{product.category.replace(/-/g, " ")}</dd>
              <dt>Material</dt>
              <dd>{product.material}</dd>
            </dl>
          </div>
        </div>
      </div>
      {showReviews && <Reviews productId={product.id} />}
      {toastVisible && (
        <div
          className="fixed top-6 right-6 z-50 rounded-lg bg-gray-950 px-4 py-3 text-sm font-medium text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          {product.name} added to cart
        </div>
      )}
      
    </section>
  );
};

export default ProductDetails;
