import express from "express";
import {
  getPublishedArticles,
  getArticleBySlug,
  getFeaturedArticles,
  getArticlesByCategory,
  getArticleAwarenessVisibility,
  getArticleAwarenessVisibilityForAdmin,
  setArticleAwarenessVisibilityForAdmin,
  createArticle,
  getUserArticles,
  updateArticle,
  deleteArticle,
  toggleArticleLike,
  getAllArticlesForAdmin,
  approveArticle,
  getArticleStats
} from "../controllers/article.controller.js";
import {
  getArticleComments,
  addArticleComment,
  updateArticleComment,
  deleteArticleComment,
  toggleCommentLike,
  flagComment
} from "../controllers/articleComment.controller.js";
import { protectRoute } from "../middlewares/protectRoute.js";

const router = express.Router();

// Public routes
router.get("/", getPublishedArticles);
router.get("/featured", getFeaturedArticles);
router.get("/stats", getArticleStats);
router.get("/category/:category", getArticlesByCategory);
router.get("/awareness/visibility", getArticleAwarenessVisibility);


// Comment routes (public read, protected write)
router.get("/:articleId/comments", getArticleComments);
router.post("/:articleId/comments", protectRoute, addArticleComment);
router.put("/comments/:commentId", protectRoute, updateArticleComment);
router.delete("/comments/:commentId", protectRoute, deleteArticleComment);
router.put("/comments/:commentId/like", protectRoute, toggleCommentLike);
router.put("/comments/:commentId/flag", protectRoute, flagComment);

// Protected routes - for doctors and admins
router.post("/", protectRoute, createArticle);
router.get("/user/my-articles", protectRoute, getUserArticles);
router.put("/:id", protectRoute, updateArticle);
router.delete("/:id", protectRoute, deleteArticle);
router.put("/:id/like", protectRoute, toggleArticleLike);

// Admin only routes
router.get("/admin/all", protectRoute, getAllArticlesForAdmin);
router.put("/admin/:id/approve", protectRoute, approveArticle);
router.get("/admin/awareness/visibility", protectRoute, getArticleAwarenessVisibilityForAdmin);
router.put("/admin/awareness/visibility", protectRoute, setArticleAwarenessVisibilityForAdmin);


router.get("/:slug", getArticleBySlug);

export default router;
