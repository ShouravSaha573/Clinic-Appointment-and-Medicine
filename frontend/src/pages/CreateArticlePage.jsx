import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from '../store/useAuthStore';

const CreateArticlePage = () => {
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user has permission to create articles
  if (!authUser || (authUser.role !== 'doctor' && authUser.role !== 'admin' && !authUser.isAdmin)) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-base-content/60 mb-4">Only doctors and administrators can create articles.</p>
          <button onClick={() => navigate('/blog')} className="btn btn-primary">
            Back to Articles
          </button>
        </div>
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const articleData = {
        title: formData.title.trim(),
        content: formData.content.trim()
      };

      const response = await axiosInstance.post('/articles', articleData);
      
      // Redirect to the created article or blog list
      if (response.data._id) {
        navigate(`/articles/${response.data._id}`);
      } else {
        navigate('/blog');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create article');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Article</h1>
          <p className="text-base-content/60">
            Share your medical knowledge and health tips with patients
          </p>
        </div>

        {/* Form */}
        <div className="bg-base-100 rounded-lg shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="alert alert-error">
                <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Title */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Article Title *</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter a compelling title for your article"
                className="input input-bordered w-full"
                required
              />
            </div>

            {/* Content */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Article Content *</span>
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder="Write your article content here. Share valuable health tips, medical insights, or wellness advice..."
                className="textarea textarea-bordered h-64"
                rows={12}
                required
              />
              <div className="label">
                <span className="label-text-alt">
                  {formData.content.length} characters
                </span>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={loading || !formData.title.trim() || !formData.content.trim()}
                className="btn btn-primary flex-1"
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    Creating Article...
                  </>
                ) : (
                  'Publish Article'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => navigate('/blog')}
                className="btn btn-ghost"
                disabled={loading}
              >
                Cancel
              </button>
            </div>

            {/* Note about approval */}
            {authUser?.role === 'doctor' && (
              <div className="alert alert-info">
                <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Your article will be submitted for admin approval before being published.
                </span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateArticlePage;
