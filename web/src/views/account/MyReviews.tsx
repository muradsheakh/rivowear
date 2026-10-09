"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type MyReview } from "../../shared/api/client";
import Stars from "../../shared/components/Stars";
import { useAuth } from "../../shared/context/useAuth";

const MyReviews = () => {
  const { token } = useAuth();
  const [reviews, setReviews] = useState<MyReview[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ rating: 5, comment: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api.myReviews(token).then((response) => setReviews(response.reviews)).catch((requestError: Error) => setError(requestError.message));
  }, [token]);

  const save = (id: string) => {
    if (!token) return;
    setError("");
    api.editReview(token, id, draft.rating, draft.comment)
      .then(({ review }) => {
        setReviews((current) => current?.map((item) => (item.id === id ? { ...item, rating: review.rating, comment: review.comment } : item)) ?? null);
        setEditing(null);
      })
      .catch((requestError: Error) => setError(requestError.message));
  };

  const remove = (id: string) => {
    if (!token || !window.confirm("Delete this review?")) return;
    api.deleteMyReview(token, id)
      .then(() => setReviews((current) => current?.filter((item) => item.id !== id) ?? null))
      .catch((requestError: Error) => setError(requestError.message));
  };

  return (
    <div>
      <h2 className="text-lg font-semibold">My reviews</h2>
      <p className="mt-1 text-sm text-gray-500">Reviews you wrote for products you bought. Photos can&apos;t be changed after posting, but you can edit the rating and text.</p>
      {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
      {!reviews && !error && <p className="mt-6 text-sm text-gray-500">Loading...</p>}
      {reviews?.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          You haven&apos;t reviewed anything yet. After an order is delivered, open the product and share your experience.
          <div><Link href="/orders" className="mt-4 inline-block rounded-md bg-black px-5 py-2 text-white">Go to my orders</Link></div>
        </div>
      )}
      <div className="mt-5 space-y-4">
        {reviews?.map((review) => (
          <article key={review.id} className="rounded-xl border border-gray-200 bg-white p-5 text-sm">
            <div className="flex gap-4">
              {review.productImage && <img src={review.productImage} alt="" className="h-20 w-16 rounded object-cover" />}
              <div className="min-w-0 flex-1">
                <Link href={`/product/${review.productId}`} className="font-semibold underline-offset-4 hover:underline">{review.productName}</Link>
                <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}{review.hidden && <span className="ml-2 text-red-600">Hidden by the store</span>}</p>
                {editing === review.id ? (
                  <div className="mt-3 space-y-3">
                    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button key={value} type="button" role="radio" aria-checked={draft.rating === value} onClick={() => setDraft({ ...draft, rating: value })} className={`text-2xl ${value <= draft.rating ? "text-amber-500" : "text-gray-300"}`}>★</button>
                      ))}
                    </div>
                    <textarea value={draft.comment} onChange={(event) => setDraft({ ...draft, comment: event.target.value })} rows={3} maxLength={1500} className="w-full rounded-md border border-gray-200 px-3 py-2 outline-none focus:border-black" />
                    <div className="flex gap-3">
                      <button type="button" onClick={() => save(review.id)} className="rounded-md bg-black px-4 py-2 text-white">Save</button>
                      <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-gray-200 px-4 py-2">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-2"><Stars value={review.rating} /></div>
                    <p className="mt-2 text-gray-700">{review.comment}</p>
                    {review.images.length > 0 && <div className="mt-3 flex gap-2">{review.images.map((image) => <img key={image} src={image} alt="Your photo" className="h-14 w-14 rounded object-cover" />)}</div>}
                    <div className="mt-3 flex gap-4">
                      <button type="button" onClick={() => { setEditing(review.id); setDraft({ rating: review.rating, comment: review.comment }); }} className="underline underline-offset-4">Edit</button>
                      <button type="button" onClick={() => remove(review.id)} className="text-red-700 underline underline-offset-4">Delete</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default MyReviews;
