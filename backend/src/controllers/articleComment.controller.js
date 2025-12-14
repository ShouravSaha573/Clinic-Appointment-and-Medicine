import ArticleComment from "../models/articleComment.model.js";
import Article from "../models/article.model.js";

// Get comments for an article
export const getArticleComments = async (req, res) => {
  try {
    const { articleId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get parent comments (not replies)
    const comments = await ArticleComment.find({
      articleId,
      parentComment: null,
      isApproved: true
    })
      .populate("userId", "fullName profilePic")
      .populate({
        path: "replies",
        populate: {
          path: "userId",
          select: "fullName profilePic"
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalComments = await ArticleComment.countDocuments({
      articleId,
      parentComment: null,
      isApproved: true
    });

    const totalPages = Math.ceil(totalComments / limit);

    res.json({
      comments,
      pagination: {
        currentPage: page,
        totalPages,
        totalComments,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching article comments:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add comment to article
export const addArticleComment = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { content, parentComment } = req.body;
    const userId = req.user._id;

    // Verify article exists
    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    // If it's a reply, verify parent comment exists
    if (parentComment) {
      const parentCommentDoc = await ArticleComment.findById(parentComment);
      if (!parentCommentDoc) {
        return res.status(404).json({ message: "Parent comment not found" });
      }
    }

    const comment = new ArticleComment({
      articleId,
      userId,
      content,
      parentComment: parentComment || null
    });

    await comment.save();

    // If it's a reply, add to parent's replies array
    if (parentComment) {
      await ArticleComment.findByIdAndUpdate(
        parentComment,
        { $push: { replies: comment._id } }
      );
    }

    // Update article's comment count
    await Article.findByIdAndUpdate(
      articleId,
      { $inc: { commentsCount: 1 } }
    );

    // Populate user info for response
    await comment.populate("userId", "fullName profilePic");

    res.status(201).json({
      message: "Comment added successfully",
      comment
    });
  } catch (error) {
    console.error("Error adding article comment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update comment
export const updateArticleComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const comment = await ArticleComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user owns the comment or is admin
    if (comment.userId.toString() !== userId.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized to update this comment" });
    }

    comment.content = content;
    await comment.save();

    res.json({
      message: "Comment updated successfully",
      comment
    });
  } catch (error) {
    console.error("Error updating article comment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete comment
export const deleteArticleComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await ArticleComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user owns the comment or is admin
    if (comment.userId.toString() !== userId.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this comment" });
    }

    // If it's a parent comment, delete all replies too
    if (!comment.parentComment) {
      await ArticleComment.deleteMany({ parentComment: commentId });
      // Update comment count (parent + replies)
      const replyCount = comment.replies.length;
      await Article.findByIdAndUpdate(
        comment.articleId,
        { $inc: { commentsCount: -(replyCount + 1) } }
      );
    } else {
      // Remove from parent's replies array
      await ArticleComment.findByIdAndUpdate(
        comment.parentComment,
        { $pull: { replies: commentId } }
      );
      // Update comment count
      await Article.findByIdAndUpdate(
        comment.articleId,
        { $inc: { commentsCount: -1 } }
      );
    }

    await ArticleComment.findByIdAndDelete(commentId);

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting article comment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Like/Unlike comment
export const toggleCommentLike = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await ArticleComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const likeIndex = comment.likes.findIndex(
      like => like.userId.toString() === userId.toString()
    );

    if (likeIndex > -1) {
      // Unlike
      comment.likes.splice(likeIndex, 1);
      comment.likesCount = Math.max(0, comment.likesCount - 1);
    } else {
      // Like
      comment.likes.push({ userId });
      comment.likesCount += 1;
    }

    await comment.save();

    res.json({
      message: likeIndex > -1 ? "Comment unliked" : "Comment liked",
      likesCount: comment.likesCount,
      isLiked: likeIndex === -1
    });
  } catch (error) {
    console.error("Error toggling comment like:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Flag comment
export const flagComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const comment = await ArticleComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user already flagged this comment
    const alreadyFlagged = comment.flaggedBy.some(
      flag => flag.userId.toString() === userId.toString()
    );

    if (alreadyFlagged) {
      return res.status(400).json({ message: "You have already flagged this comment" });
    }

    comment.flaggedBy.push({
      userId,
      reason: reason || "Inappropriate content"
    });

    // Auto-hide comment if flagged by multiple users
    if (comment.flaggedBy.length >= 3) {
      comment.isFlagged = true;
    }

    await comment.save();

    res.json({
      message: "Comment flagged successfully",
      flagCount: comment.flaggedBy.length
    });
  } catch (error) {
    console.error("Error flagging comment:", error);
    res.status(500).json({ message: "Server error" });
  }
};
