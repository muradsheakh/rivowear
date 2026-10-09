"use client";

import { useEffect, useState } from "react";
import { api, type AdminReview } from "../../shared/api/client";
import Stars from "../../shared/components/Stars";
import { useAuth } from "../../shared/context/useAuth";

const AdminReviews = () => {
  const { token } = useAuth();
  const [reviews, setReviews] = useState<AdminReview[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api.admin.reviews(token).then((response) => setReviews(response.reviews)).catch((requestError: Error) => setError(requestError.message));
  }, [token]);

  const hide = (review: AdminReview) => {
    if (!token) return;
    api.admin.hideReview(token, review.id, !review.hidden)
      .then(() => setReviews((current) => current?.map((item) => (item.id === review.id ? { ...item, hidden: !item.hidden } : item)) ?? null))
      .catch((requestError: Error) => setError(requestError.message));
  };

  const remove = (review: AdminReview) => {
    if (!token || !window.confirm("Delete this review permanently?")) return;
    api.admin.deleteReview(token, review.id)
      .then(() => setReviews((current) => current?.filter((item) => item.id !== review.id) ?? null))
      .catch((requestError: Error) => setError(requestError.message));
  };

  if (error) return <p className="text-sm text-red-600" role="alert">{error}</p>;
  if (!reviews) return <p className="text-sm text-gray-500">Loading reviews...</p>;
  if (reviews.length === 0) return <p className="text-sm text-gray-500">No reviews yet. Customers can review after their order is delivered.</p>;

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <article key={review.id} className={`rounded-xl border bg-white p-5 text-sm ${review.hidden ? "border-red-200 opacity-70" : "border-gray-200"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3"><Stars value={review.rating} /><b>{review.userName}</b><span className="text-gray-500">on {review.productName}</span><span className="text-xs text-gray-400">{review.orderId}</span></div>
            <div className="flex gap-4">
              <button type="button" onClick={() => hide(review)} className="underline underline-offset-4">{review.hidden ? "Show" : "Hide"}</button>
              <button type="button" onClick={() => remove(review)} className="text-red-700 underline underline-offset-4">Delete</button>
            </div>
          </div>
          <p className="mt-2 text-gray-700">{review.comment}</p>
          {review.images.length > 0 && <div className="mt-3 flex gap-2">{review.images.map((image) => <a key={image} href={image} target="_blank" rel="noopener noreferrer"><img src={image} alt="Review" className="h-16 w-16 rounded object-cover" /></a>)}</div>}
          {review.hidden && <p className="mt-2 text-xs text-red-700">Hidden from the storefront.</p>}
        </article>
      ))}
    </div>
  );
};

export default AdminReviews;
