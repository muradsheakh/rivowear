import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { imageUpload, isOwnUpload, uploadUrl } from "../lib/upload.js";
import { auth, currentUser, param } from "../middleware.js";
import { deleteOwnReview, hasReviewed, insertReview, visibleReviews } from "../repo/misc.js";
import { findPurchaseOrderId } from "../repo/orders.js";
import { getProduct, productExists } from "../repo/products.js";

const router = Router();

// A customer may review a product only after buying it (delivered, unless REVIEW_REQUIRES_DELIVERY=false).
const countedStatuses = () => (config.reviewRequiresDelivery ? ["Delivered"] : ["Pending", "Processing", "Shipped", "Delivered"]);

router.get("/products/:id/reviews", async (request, response) => {
  const product = await getProduct(param(request, "id"));
  if (!product) {
    response.status(404).json({ message: "Product not found." });
    return;
  }
  const visible = await visibleReviews(product.id);
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: visible.filter((review) => review.rating === stars).length }));
  response.json({
    reviews: visible.map(({ id, userName, rating, comment, images, createdAt }) => ({ id, userName, rating, comment, images, createdAt })),
    summary: { average: product.rating.average, count: product.rating.count, distribution },
  });
});

router.get("/products/:id/review-status", auth, async (request, response) => {
  const user = currentUser(response);
  const productId = param(request, "id");
  const reviewed = await hasReviewed(user.id, productId);
  const bought = await findPurchaseOrderId(user.id, productId, countedStatuses());
  const boughtAny = await findPurchaseOrderId(user.id, productId, ["Pending", "Processing", "Shipped", "Delivered"]);
  response.json({
    canReview: Boolean(bought) && !reviewed,
    hasReviewed: reviewed,
    reason: reviewed
      ? "You have already reviewed this product."
      : bought
        ? ""
        : boughtAny
          ? "You can review this product after your order is delivered."
          : "Only customers who bought this product can review it.",
  });
});

router.post("/uploads/review", auth, imageUpload.array("images", 4), (request, response) => {
  const files = (request.files as Express.Multer.File[] | undefined) ?? [];
  response.status(201).json({ urls: files.map((file) => uploadUrl(file.filename)) });
});

router.post("/products/:id/reviews", auth, async (request, response) => {
  const user = currentUser(response);
  const productId = param(request, "id");
  const parsed = z
    .object({
      rating: z.number().int().min(1).max(5),
      comment: z.string().trim().min(3, "Please write a short comment.").max(1500),
      images: z.array(z.string()).max(4).default([]),
    })
    .safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid review." });
    return;
  }
  if (!(await productExists(productId))) {
    response.status(404).json({ message: "Product not found." });
    return;
  }
  if (await hasReviewed(user.id, productId)) {
    response.status(409).json({ message: "You have already reviewed this product." });
    return;
  }
  const orderId = await findPurchaseOrderId(user.id, productId, countedStatuses());
  if (!orderId) {
    response.status(403).json({ message: "Only customers who received this product can review it." });
    return;
  }
  // Only images uploaded through our own endpoint are accepted.
  if (!parsed.data.images.every(isOwnUpload)) {
    response.status(400).json({ message: "Invalid image." });
    return;
  }
  try {
    const review = await insertReview({ productId, userId: user.id, userName: user.name, orderId, rating: parsed.data.rating, comment: parsed.data.comment, images: parsed.data.images });
    response.status(201).json({ review });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      response.status(409).json({ message: "You have already reviewed this product." });
      return;
    }
    throw error;
  }
});

router.delete("/reviews/:id", auth, async (request, response) => {
  if (!(await deleteOwnReview(param(request, "id"), currentUser(response).id))) {
    response.status(404).json({ message: "Review not found." });
    return;
  }
  response.status(204).send();
});

export default router;
