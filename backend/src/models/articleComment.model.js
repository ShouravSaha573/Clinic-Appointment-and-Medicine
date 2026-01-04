import mongoose from "mongoose";

const articleCommentSchema = new mongoose.Schema(
  {
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ArticleComment",
      default: null
    },
    replies: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "ArticleComment"
    }],
    likes: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      likedAt: {
        type: Date,
        default: Date.now
      }
    }],
    likesCount: {
      type: Number,
      default: 0
    },
    isApproved: {
      type: Boolean,
      default: true
    },
    isFlagged: {
      type: Boolean,
      default: false
    },
    flaggedBy: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      reason: String,
      flaggedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  {
    timestamps: true
  }
);

// Indexes
articleCommentSchema.index({ articleId: 1, createdAt: -1 });
articleCommentSchema.index({ userId: 1 });
articleCommentSchema.index({ parentComment: 1 });

const ArticleComment = mongoose.model("ArticleComment", articleCommentSchema);
export default ArticleComment;
