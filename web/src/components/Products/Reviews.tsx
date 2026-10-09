"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { api, type Review, type ReviewSummary } from "../../shared/api/client";
import Stars from "../../shared/components/Stars";
import { useAuth } from "../../shared/context/useAuth";

const Reviews = ({ productId }: { productId: string }) => {
  const { token } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [status, setStatus] = useState<{ canReview: boolean; reason: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    api.reviews(productId).then((response) => {
      setReviews(response.reviews);
      setSummary(response.summary);
    }).catch(() => undefined);
  }, [productId, version]);

  useEffect(() => {
    if (!token) return;
    api.reviewStatus(token, productId).then(setStatus).catch(() => undefined);
  }, [token, productId, version]);

  const pickFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []).slice(0, 4);
    if (picked.some((file) => file.size > 4 * 1024 * 1024)) {
      setError("Each image must be under 4 MB.");
      return;
    }
    setError("");
    setFiles(picked);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const images = files.length ? await api.uploadReviewImages(token, files) : [];
      await api.addReview(token, productId, { rating, comment, images });
      setComment("");
      setFiles([]);
      setVersion((current) => current + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not post your review.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-14 border-t border-gray-100 pt-10" id="reviews">
      <h2 className="text-2xl font-semibold tracking-tight">Customer reviews</h2>

      {summary && summary.count > 0 ? (
        <div className="mt-5 flex flex-wrap items-center gap-8">
          <div>
            <p className="text-4xl font-bold">{summary.average}</p>
            <Stars value={summary.average} size="h-5 w-5" />
            <p className="mt-1 text-xs text-gray-500">{summary.count} review{summary.count > 1 && "s"}</p>
          </div>
          <div className="min-w-48 flex-1 space-y-1 sm:max-w-xs">
            {summary.distribution.map((row) => (
              <div key={row.stars} className="flex items-center gap-2 text-xs text-gray-600">
                <span className="w-3">{row.stars}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-gray-100">
                  <div className="h-full bg-amber-400" style={{ width: `${(row.count / summary.count) * 100}%` }} />
                </div>
                <span className="w-5 text-right">{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-500">No reviews yet.</p>
      )}

      <div className="mt-6 rounded-xl border border-gray-200 p-5">
        {!token && (
          <p className="text-sm text-gray-600">
            <Link href="/login" className="font-medium underline">Log in</Link> to review products you have bought.
          </p>
        )}
        {token && status && !status.canReview && <p className="text-sm text-gray-600">{status.reason}</p>}
        {token && status?.canReview && (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <p className="text-sm font-medium">Your rating</p>
              <div className="mt-1 flex gap-1" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    onClick={() => setRating(value)}
                    className={`text-2xl ${value <= rating ? "text-amber-500" : "text-gray-300"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <textarea
              required
              minLength={3}
              maxLength={1500}
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="How was the fit, fabric and quality?"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
            />
            <div>
              <label className="text-sm font-medium">
                Photos (up to 4)
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={pickFiles} className="mt-1 block text-sm" />
              </label>
              {files.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {files.map((file) => (
                    <img key={file.name + file.size} src={URL.createObjectURL(file)} alt="" className="h-14 w-14 rounded object-cover" />
                  ))}
                </div>
              )}
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className="rounded-md bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-60">
              {busy ? "Posting..." : "Post review"}
            </button>
          </form>
        )}
      </div>

      <div className="mt-6 space-y-6">
        {reviews.map((review) => (
          <article key={review.id} className="border-b border-gray-100 pb-6">
            <div className="flex items-center gap-3">
              <Stars value={review.rating} />
              <span className="text-sm font-medium">{review.userName}</span>
              <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
              <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">Verified purchase</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-700">{review.comment}</p>
            {review.images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {review.images.map((image) => (
                  <button key={image} type="button" onClick={() => setZoom(image)} aria-label="View review photo">
                    <img src={image} alt="Customer photo" loading="lazy" className="h-20 w-20 rounded-lg object-cover" />
                  </button>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {zoom && (
        <button type="button" onClick={() => setZoom(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" aria-label="Close photo">
          <img src={zoom} alt="Customer photo" className="max-h-full max-w-full rounded-lg" />
        </button>
      )}
    </section>
  );
};

export default Reviews;
