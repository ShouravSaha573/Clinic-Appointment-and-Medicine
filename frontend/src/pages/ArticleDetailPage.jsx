import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from '../store/useAuthStore';

const ArticleDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { authUser } = useAuthStore();

  const isAdmin = !!(authUser?.isAdmin || authUser?.role === "admin");

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/blog");
  };

useEffect(() => {
  const load = async () => {
    try {
      setLoading(true);
      setError("");

      // "id" here is actually slug from URL now
      const articleRes = await axiosInstance.get(`/articles/${id}`);
      const articleData = articleRes.data;
      setArticle(articleData);

      if (!isAdmin) {
        // comments endpoint expects ObjectId (articleId)
        const commentsRes = await axiosInstance.get(`/articles/${articleData._id}/comments`);
        setComments(commentsRes.data);
      } else {
        setComments([]);
      }
    } catch (err) {
      console.error(err);
      setError("Article not found");
    } finally {
      setLoading(false);
    }
  };

  load();
}, [id, isAdmin]);


  const handleLikeArticle = async () => {
    if (!authUser) {
      navigate('/login');
      return;
    }

    try {
      if (!article?._id) return;
      await axiosInstance.put(`/articles/${article._id}/like`);
      const articleRes = await axiosInstance.get(`/articles/${id}`); // reload by slug
      setArticle(articleRes.data);

    } catch (err) {
      console.error('Failed to like article:', err);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!authUser) {
      navigate('/login');
      return;
    }

    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      await axiosInstance.post(`/articles/${id}/comments`, {
        content: newComment
      });
      setNewComment('');
      fetchComments(); // Refresh comments
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (commentId) => {
    if (!authUser) {
      navigate('/login');
      return;
    }

    if (!replyContent.trim()) return;

    try {
      setSubmitting(true);
      await axiosInstance.post(`/articles/${id}/comments/${commentId}/reply`, {
        content: replyContent
      });
      setReplyContent('');
      setReplyTo(null);
      fetchComments(); // Refresh comments
    } catch (err) {
      console.error('Failed to submit reply:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    if (!authUser) {
      navigate('/login');
      return;
    }

    try {
      await axiosInstance.post(`/articles/${id}/comments/${commentId}/like`);
      fetchComments(); // Refresh comments
    } catch (err) {
      console.error('Failed to like comment:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderComments = (comments, depth = 0) => {
    return comments.map((comment) => (
      <div key={comment._id} className={`mb-4 ${depth > 0 ? 'ml-8 border-l-2 border-base-300 pl-4' : ''}`}>
        <div className="bg-base-100 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="avatar placeholder">
              <div className="bg-neutral text-neutral-content rounded-full w-8">
                <span className="text-xs">
                  {comment.author?.fullName?.[0] || 'U'}
                </span>
              </div>
            </div>
            <span className="font-medium">{comment.author?.fullName}</span>
            <span className="text-sm text-base-content/60">
              {formatDate(comment.createdAt)}
            </span>
          </div>
          
          <p className="text-base-content mb-3">{comment.content}</p>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleLikeComment(comment._id)}
              className={`btn btn-ghost btn-sm ${comment.likes?.includes(authUser?._id) ? 'text-primary' : ''}`}
            >
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
              </svg>
              {comment.likes?.length || 0}
            </button>
            
            {authUser && (
              <button
                onClick={() => setReplyTo(replyTo === comment._id ? null : comment._id)}
                className="btn btn-ghost btn-sm"
              >
                Reply
              </button>
            )}
          </div>
          
          {replyTo === comment._id && (
            <div className="mt-4">
              <textarea
                className="textarea textarea-bordered w-full"
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleSubmitReply(comment._id)}
                  disabled={submitting || !replyContent.trim()}
                  className="btn btn-primary btn-sm"
                >
                  {submitting ? 'Posting...' : 'Post Reply'}
                </button>
                <button
                  onClick={() => {
                    setReplyTo(null);
                    setReplyContent('');
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {renderComments(comment.replies, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <h2 className="text-2xl font-bold mb-2">Article Not Found</h2>
          <p className="text-base-content/60 mb-4">The article you're looking for doesn't exist.</p>
          <button type="button" className="btn btn-primary" onClick={handleBack}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8">
        {/* Article */}
        <article className="bg-base-100 rounded-lg shadow-xl p-8 mb-8">
          {/* Back Button */}
          <button type="button" onClick={handleBack} className="btn btn-outline btn-sm mt-2 mb-6">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-4">
            {article.categories?.map((category, index) => (
              <span key={index} className="badge badge-primary">
                {category}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold mb-6">{article.title}</h1>

          {/* Author and Meta Info */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-base-300">
            <div className="flex items-center gap-4">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-12">
                  <span className="text-lg">
                    {article.authorModel === 'Doctor' 
                      ? `Dr. ${article.authorDetails?.firstName?.[0] || 'D'}`
                      : article.authorDetails?.fullName?.[0] || 'A'
                    }
                  </span>
                </div>
              </div>
              <div>
                <div className="font-semibold">
                  {article.authorModel === 'Doctor' 
                    ? `Dr. ${article.authorDetails?.firstName} ${article.authorDetails?.lastName}`
                    : article.authorDetails?.fullName
                  }
                </div>
                <div className="text-sm text-base-content/60">
                  {article.authorModel === 'Doctor' && article.authorDetails?.specialization && (
                    <span>{article.authorDetails.specialization} • </span>
                  )}
                  {formatDate(article.publishedDate || article.createdAt)}
                </div>
              </div>
            </div>

            <button
              onClick={handleLikeArticle}
              className={`btn btn-outline ${article.likes?.includes(authUser?._id) ? 'btn-primary' : ''}`}
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
              </svg>
              {article.likes?.length || 0} Likes
            </button>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {article.content.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-4 text-base-content leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-8 pt-6 border-t border-base-300">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium text-base-content/60 mr-2">Tags:</span>
                {article.tags.map((tag, index) => (
                  <span key={index} className="badge badge-outline badge-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>

        {!isAdmin && (
          <>
            {/* Comments Section */}
            <div className="bg-base-100 rounded-lg shadow-xl p-8">
              <h2 className="text-2xl font-bold mb-6">Comments ({comments.length})</h2>

              {/* Add Comment Form */}
              {authUser ? (
                <form onSubmit={handleSubmitComment} className="mb-8">
                  <textarea
                    className="textarea textarea-bordered w-full mb-4"
                    placeholder="Share your thoughts about this article..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={4}
                  />
                  <button
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="btn btn-primary"
                  >
                    {submitting ? 'Posting...' : 'Post Comment'}
                  </button>
                </form>
              ) : (
                <div className="bg-base-200 rounded-lg p-6 mb-8 text-center">
                  <p className="mb-4">Please log in to comment on this article.</p>
                  <Link to="/login" className="btn btn-primary">
                    Login to Comment
                  </Link>
                </div>
              )}

              {/* Comments List */}
              {comments.length > 0 ? (
                <div>{renderComments(comments)}</div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">💬</div>
                  <p className="text-base-content/60">No comments yet. Be the first to share your thoughts!</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ArticleDetailPage;
