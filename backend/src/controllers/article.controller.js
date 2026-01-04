import Article from "../models/article.model.js";
import ArticleComment from "../models/articleComment.model.js";
import User from "../models/user.model.js";
import Doctor from "../models/doctor.model.js";
import mongoose from "mongoose";
import AppSetting from "../models/appSetting.model.js";

const AWARENESS_SETTING_KEY = "articles.diseaseStatsVisible";

const getAwarenessSetting = async () => {
  const doc = await AppSetting.findOne({ key: AWARENESS_SETTING_KEY });
  return { enabled: Boolean(doc?.enabled) };
};

const setAwarenessSetting = async (enabled) => {
  const safeEnabled = Boolean(enabled);
  const doc = await AppSetting.findOneAndUpdate(
    { key: AWARENESS_SETTING_KEY },
    { $set: { enabled: safeEnabled } },
    { new: true, upsert: true }
  );
  return { enabled: Boolean(doc?.enabled) };
};

// Get all published articles (public)
export const getPublishedArticles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    const search = req.query.search;
    const sortBy = req.query.sortBy || "publishedAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;

    // Build query
    const query = {
      status: "published",
      isApproved: true
    };

    if (category && category !== "all") {
      // Remove category filtering since we removed categories from model
      // query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } }
      ];
    }

    const articles = await Article.find(query)
      .populate("author", "fullName profilePic")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .select("-content"); // Exclude full content for list view

    const totalArticles = await Article.countDocuments(query);
    const totalPages = Math.ceil(totalArticles / limit);

    res.json({
      articles,
      pagination: {
        currentPage: page,
        totalPages,
        totalArticles,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single article by slug (public)
export const getArticleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // Support fetching by either slug OR Mongo ObjectId.
    // The frontend currently navigates using an article id.
    let article = null;

    if (mongoose.Types.ObjectId.isValid(slug) && String(slug).length === 24) {
      article = await Article.findOne({
        _id: slug,
        status: "published",
        isApproved: true
      }).populate("author", "fullName profilePic");
    }

    if (!article) {
      article = await Article.findOne({
        slug,
        status: "published",
        isApproved: true
      }).populate("author", "fullName profilePic");
    }

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    // Increment view count
    article.views += 1;
    await article.save();

    res.json(article);
  } catch (error) {
    console.error("Error fetching article:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get featured articles (public)
export const getFeaturedArticles = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const articles = await Article.find({
      status: "published",
      isApproved: true,
      isFeatured: true
    })
      .populate("author", "fullName profilePic")
      .sort({ publishedAt: -1 })
      .limit(limit)
      .select("-content");

    res.json(articles);
  } catch (error) {
    console.error("Error fetching featured articles:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get articles by category (public) - Deprecated since categories removed
export const getArticlesByCategory = async (req, res) => {
  try {
    // Since categories are removed, redirect to general article listing
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const articles = await Article.find({
      status: "published",
      isApproved: true
    })
      .populate("author", "fullName profilePic")
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-content");

    const totalArticles = await Article.countDocuments({
      status: "published",
      isApproved: true
    });

    const totalPages = Math.ceil(totalArticles / limit);

    res.json({
      articles,
      pagination: {
        currentPage: page,
        totalPages,
        totalArticles,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Public: whether the awareness card should be shown on user article page
export const getArticleAwarenessVisibility = async (req, res) => {
  try {
    const setting = await getAwarenessSetting();
    return res.json(setting);
  } catch (error) {
    console.error("Error getting awareness visibility:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: get current visibility
export const getArticleAwarenessVisibilityForAdmin = async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const setting = await getAwarenessSetting();
    return res.json(setting);
  } catch (error) {
    console.error("Error getting awareness visibility (admin):", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: update visibility
export const setArticleAwarenessVisibilityForAdmin = async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { enabled } = req.body;
    const setting = await setAwarenessSetting(enabled);
    return res.json(setting);
  } catch (error) {
    console.error("Error setting awareness visibility (admin):", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Create new article (doctors and admins only)
export const createArticle = async (req, res) => {
  try {
    const {
      title,
      content,
      featuredImage,
      status
    } = req.body;

    const userId = req.user._id;
    const userRole = req.user.role || "patient";

    // Check if user is doctor or admin
    let author, authorModel, authorName, authorSpecialization = "";

    if (req.user.isAdmin) {
      author = userId;
      authorModel = "User";
      authorName = req.user.fullName;
    } else if (userRole === "doctor") {
      // If it's a doctor request, find doctor profile
      const doctor = await Doctor.findOne({ userId });
      if (!doctor) {
        return res.status(403).json({ message: "Doctor profile not found" });
      }
      author = doctor._id;
      authorModel = "Doctor";
      authorName = doctor.name;
      authorSpecialization = doctor.specialization;
    } else {
      return res.status(403).json({ message: "Only doctors and admins can create articles" });
    }

    const article = new Article({
      title,
      content,
      author,
      authorModel,
      authorName,
      authorSpecialization,
      featuredImage: featuredImage || "",
      status: req.user.isAdmin ? "published" : "draft", // Auto-publish admin articles
      isApproved: req.user.isAdmin // Auto-approve admin articles
    });

    await article.save();

    res.status(201).json({
      message: "Article created successfully",
      article
    });
  } catch (error) {
    console.error("Error creating article:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user's articles (doctors and admins)
export const getUserArticles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const skip = (page - 1) * limit;

    const userId = req.user._id;
    let authorQuery;

    if (req.user.isAdmin) {
      authorQuery = { author: userId, authorModel: "User" };
    } else {
      // Find doctor profile
      const doctor = await Doctor.findOne({ userId });
      if (!doctor) {
        return res.status(404).json({ message: "Doctor profile not found" });
      }
      authorQuery = { author: doctor._id, authorModel: "Doctor" };
    }

    const query = { ...authorQuery };
    if (status) {
      query.status = status;
    }

    const articles = await Article.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalArticles = await Article.countDocuments(query);
    const totalPages = Math.ceil(totalArticles / limit);

    res.json({
      articles,
      pagination: {
        currentPage: page,
        totalPages,
        totalArticles,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching user articles:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update article
export const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user._id;

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    // Check ownership
    let hasPermission = false;
    if (req.user.isAdmin) {
      hasPermission = true;
    } else {
      const doctor = await Doctor.findOne({ userId });
      if (doctor && article.author.toString() === doctor._id.toString()) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return res.status(403).json({ message: "Not authorized to update this article" });
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        article[key] = updates[key];
      }
    });

    // If status is changed to published, need approval (unless admin)
    if (updates.status === "published" && !req.user.isAdmin) {
      article.isApproved = false;
    }

    await article.save();

    res.json({
      message: "Article updated successfully",
      article
    });
  } catch (error) {
    console.error("Error updating article:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete article
export const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    // Check ownership
    let hasPermission = false;
    if (req.user.isAdmin) {
      hasPermission = true;
    } else {
      const doctor = await Doctor.findOne({ userId });
      if (doctor && article.author.toString() === doctor._id.toString()) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return res.status(403).json({ message: "Not authorized to delete this article" });
    }

    await Article.findByIdAndDelete(id);
    await ArticleComment.deleteMany({ articleId: id });

    res.json({ message: "Article deleted successfully" });
  } catch (error) {
    console.error("Error deleting article:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Like/Unlike article
export const toggleArticleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    const likeIndex = article.likes.findIndex(
      like => like.userId.toString() === userId.toString()
    );

    if (likeIndex > -1) {
      // Unlike
      article.likes.splice(likeIndex, 1);
      article.likesCount = Math.max(0, article.likesCount - 1);
    } else {
      // Like
      article.likes.push({ userId });
      article.likesCount += 1;
    }

    await article.save();

    res.json({
      message: likeIndex > -1 ? "Article unliked" : "Article liked",
      likesCount: article.likesCount,
      isLiked: likeIndex === -1
    });
  } catch (error) {
    console.error("Error toggling article like:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: Get all articles for approval
export const getAllArticlesForAdmin = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const isApproved = req.query.isApproved;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;
    if (isApproved !== undefined) query.isApproved = isApproved === 'true';

    const articles = await Article.find(query)
      .populate("author", "fullName profilePic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalArticles = await Article.countDocuments(query);
    const totalPages = Math.ceil(totalArticles / limit);

    res.json({
      articles,
      pagination: {
        currentPage: page,
        totalPages,
        totalArticles,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching articles for admin:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: Approve/Reject article
export const approveArticle = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { id } = req.params;
    const { isApproved } = req.body;

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    article.isApproved = isApproved;
    article.approvedBy = req.user._id;
    article.approvedAt = new Date();

    await article.save();

    res.json({
      message: `Article ${isApproved ? 'approved' : 'rejected'} successfully`,
      article
    });
  } catch (error) {
    console.error("Error approving article:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get article stats - Simplified since categories removed
export const getArticleStats = async (req, res) => {
  try {
    const totalArticles = await Article.countDocuments({
      status: "published",
      isApproved: true
    });

    const totalViews = await Article.aggregate([
      {
        $match: {
          status: "published",
          isApproved: true
        }
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$views" }
        }
      }
    ]);

    res.json({
      totalArticles,
      totalViews: totalViews[0]?.totalViews || 0
    });
  } catch (error) {
    console.error("Error fetching article stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};
