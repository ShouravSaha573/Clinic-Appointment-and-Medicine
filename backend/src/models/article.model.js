import mongoose from "mongoose";

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true
      // Removed required: true - will be auto-generated
    },
    content: {
      type: String,
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'authorModel'
    },
    authorModel: {
      type: String,
      required: true,
      enum: ['User', 'Doctor']
    },
    authorName: {
      type: String,
      required: true
    },
    authorSpecialization: {
      type: String,
      default: ""
    },
    featuredImage: {
      type: String,
      default: ""
    },
    readingTime: {
      type: Number, // in minutes
      // Removed required: true - will be auto-calculated
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft"
    },
    isApproved: {
      type: Boolean,
      default: false
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    approvedAt: {
      type: Date
    },
    publishedAt: {
      type: Date
    },
    views: {
      type: Number,
      default: 0
    },
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
    commentsCount: {
      type: Number,
      default: 0
    },
    isFeatured: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries
//articleSchema.index({ slug: 1 });
articleSchema.index({ status: 1, isApproved: 1 });
articleSchema.index({ publishedAt: -1 });
articleSchema.index({ views: -1 });
articleSchema.index({ likesCount: -1 });
articleSchema.index({ isFeatured: 1 });

// Virtual for like status
articleSchema.virtual('isLiked').get(function() {
  return this.likes && this.likes.length > 0;
});

// Pre-save middleware to generate slug
articleSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Add timestamp to ensure uniqueness
    if (this.isNew) {
      this.slug += '-' + Date.now();
    }
  }
  next();
});

// Pre-save middleware to calculate reading time
articleSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    const wordsPerMinute = 200;
    const wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.ceil(wordCount / wordsPerMinute);
  }
  next();
});

// Pre-save middleware to set published date
articleSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

const Article = mongoose.model("Article", articleSchema);
export default Article;
