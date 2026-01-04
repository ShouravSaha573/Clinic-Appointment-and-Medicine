import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from '../store/useAuthStore';

const BlogPage = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [showDiseaseStats, setShowDiseaseStats] = useState(false);
  const [diseaseStats, setDiseaseStats] = useState(null);
  const [diseaseStatsLoading, setDiseaseStatsLoading] = useState(false);
  const { authUser } = useAuthStore();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);

    return () => clearTimeout(handle);
  }, [searchTerm]);

  useEffect(() => {
    fetchArticles(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    const fetchDiseaseAwareness = async () => {
      try {
        const visibilityRes = await axiosInstance.get("/articles/awareness/visibility");
        const enabled = Boolean(visibilityRes.data?.enabled);
        setShowDiseaseStats(enabled);

        if (!enabled) {
          setDiseaseStats(null);
          return;
        }

        setDiseaseStatsLoading(true);
        const statsRes = await axiosInstance.get("/external/disease-stats");
        let nextStats = statsRes.data || null;

        const looksLegacyCovidOnly =
          nextStats &&
          typeof nextStats === "object" &&
          !Object.prototype.hasOwnProperty.call(nextStats, "covid") &&
          !Object.prototype.hasOwnProperty.call(nextStats, "malariaBangladesh") &&
          (Object.prototype.hasOwnProperty.call(nextStats, "cases") ||
            Object.prototype.hasOwnProperty.call(nextStats, "deaths") ||
            Object.prototype.hasOwnProperty.call(nextStats, "updated"));

        if (looksLegacyCovidOnly) {
          const statsRes2 = await axiosInstance.get("/external/disease-stats");
          nextStats = statsRes2.data || nextStats;
        }

        setDiseaseStats(nextStats);
      } catch (err) {
        setShowDiseaseStats(false);
        setDiseaseStats(null);
        console.error(err);
      } finally {
        setDiseaseStatsLoading(false);
      }
    };

    fetchDiseaseAwareness();
  }, []);

  const fetchArticles = async (term) => {
    try {
      setError('');
      if (loading) {
        setLoading(true);
      } else {
        setIsSearching(true);
      }
      const params = new URLSearchParams();
      if (term) params.append('search', term);
      
      const response = await axiosInstance.get(`/articles?${params}`);
      setArticles(response.data.articles);
    } catch (err) {
      setError('Failed to fetch articles');
      console.error(err);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatNumber = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    return n.toLocaleString("en-US");
  };

  const covidStats = diseaseStats?.covid || diseaseStats;
  const malariaBDStats = diseaseStats?.malariaBangladesh || null;
  const measlesBDStats = diseaseStats?.measlesBangladesh || null;
  const rabiesBDDeathsStats = diseaseStats?.rabiesBangladeshDeaths || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header Section */}
      <div className="bg-primary text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4 text-sky-200 text-outline-thin">Health Tips & Articles</h1>
          <p className="text-xl font-semibold opacity-100 max-w-2xl mx-auto text-black">
            Stay informed with the latest health tips, medical insights, and wellness advice from our expert doctors
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button type="button" onClick={handleBack} className="btn btn-outline btn-sm mb-6">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Controls Section */}
        <div className="mb-8 space-y-4 lg:space-y-0 lg:flex lg:items-center lg:justify-between">
          {/* Search */}
          <div className="form-control w-full max-w-md">
            <input
              type="text"
              placeholder="Search articles..."
              className="input input-bordered w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Create Article Button for Doctors/Admins */}
          {(authUser?.role === 'doctor' || authUser?.role === 'admin' || authUser?.isAdmin) && (
            <Link to="/create-article" className="btn btn-primary">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Write Article
            </Link>
          )}
        </div>

        {/* Disease Stats Awareness Card (Admin-controlled) */}
        {showDiseaseStats && (
          <div className="mb-8">
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="card-title flex items-center gap-2">
                      <span>COVID-19 Stats (Disease.sh)</span>
                      <span className="badge badge-info badge-sm">Global</span>
                    </h3>
                    <p className="text-sm text-base-content/70">
                      Awareness info shown by admin setting
                    </p>
                  </div>
                  {covidStats?.updated ? (
                    <div className="text-xs text-base-content/60">
                      Updated: {new Date(covidStats.updated).toLocaleString("en-US")}
                    </div>
                  ) : null}
                </div>

                {diseaseStatsLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="loading loading-spinner loading-sm"></span>
                    <span className="text-sm text-base-content/70">Loading stats...</span>
                  </div>
                ) : covidStats ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Cases</div>
                      <div className="stat-value text-xl">{formatNumber(covidStats.cases)}</div>
                      <div className="stat-desc">Today: {formatNumber(covidStats.todayCases)}</div>
                    </div>
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Deaths</div>
                      <div className="stat-value text-xl">{formatNumber(covidStats.deaths)}</div>
                      <div className="stat-desc">Today: {formatNumber(covidStats.todayDeaths)}</div>
                    </div>
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Recovered</div>
                      <div className="stat-value text-xl">{formatNumber(covidStats.recovered)}</div>
                      <div className="stat-desc">Today: {formatNumber(covidStats.todayRecovered)}</div>
                    </div>
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Active</div>
                      <div className="stat-value text-xl">{formatNumber(covidStats.active)}</div>
                      <div className="stat-desc">Critical: {formatNumber(covidStats.critical)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-base-content/70">
                    Stats unavailable right now.
                  </div>
                )}

                <div className="divider"></div>

                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">Bangladesh Disease Stats (WHO GHO)</h3>
                        <span className="badge badge-success badge-sm">Bangladesh</span>
                      </div>
                      <p className="text-sm text-base-content/70">Latest available (often annual)</p>
                    </div>
                  </div>

                  {diseaseStatsLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="loading loading-spinner loading-sm"></span>
                      <span className="text-sm text-base-content/70">Loading stats...</span>
                    </div>
                  ) : malariaBDStats || measlesBDStats || rabiesBDDeathsStats ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {malariaBDStats ? (
                        <div className="stat bg-base-200 rounded-lg">
                          <div className="stat-title">Malaria cases</div>
                          <div className="stat-value text-xl">{formatNumber(malariaBDStats.cases)}</div>
                          <div className="stat-desc">Year: {malariaBDStats.year ?? "—"}</div>
                        </div>
                      ) : null}

                      {measlesBDStats ? (
                        <div className="stat bg-base-200 rounded-lg">
                          <div className="stat-title">Measles cases</div>
                          <div className="stat-value text-xl">{formatNumber(measlesBDStats.cases)}</div>
                          <div className="stat-desc">Year: {measlesBDStats.year ?? "—"}</div>
                        </div>
                      ) : null}

                      {rabiesBDDeathsStats ? (
                        <div className="stat bg-base-200 rounded-lg">
                          <div className="stat-title">Rabies deaths</div>
                          <div className="stat-value text-xl">{formatNumber(rabiesBDDeathsStats.deaths)}</div>
                          <div className="stat-desc">Year: {rabiesBDDeathsStats.year ?? "—"}</div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-sm text-base-content/70">Stats unavailable right now.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Background Search Indicator */}
        {isSearching && (
          <div className="mb-4 flex items-center gap-2 text-sm text-base-content/60">
            <span className="loading loading-spinner loading-xs"></span>
            <span>Searching...</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="alert alert-error mb-6">
            <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Articles Grid */}
        {articles.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <div key={article._id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="card-body">
                  <h2 className="card-title text-lg hover:text-primary transition-colors">
                    <Link to={`/articles/${article._id}`}>
                      {article.title}
                    </Link>
                  </h2>
                  
                  <p className="text-base-content/70 line-clamp-3">
                    {article.content ? `${article.content.substring(0, 150)}...` : ""}
                  </p>
                  
                  <div className="flex items-center justify-between mt-4 text-sm text-base-content/60">
                    <div className="flex items-center gap-2">
                      {article.authorModel === 'Doctor' && (
                        <div className="avatar placeholder">
                          <div className="bg-neutral text-neutral-content rounded-full w-8">
                            <span className="text-xs">
                              {`Dr. ${article.authorDetails?.firstName?.[0] || 'D'}`}
                            </span>
                          </div>
                        </div>
                      )}
                      <span>
                        {article.authorModel === 'Doctor' 
                          ? `Dr. ${article.authorDetails?.firstName} ${article.authorDetails?.lastName}`
                          : article.authorDetails?.fullName
                        }
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span>{formatDate(article.publishedDate || article.createdAt)}</span>
                    </div>
                  </div>
                  
                  <div className="card-actions justify-end mt-4">
                    <Link to={`/articles/${article._id}`} className="btn btn-primary btn-sm">
                      Read More
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-2xl font-semibold mb-2">No Articles Found</h3>
            <p className="text-base-content/60 mb-6">
              {searchTerm 
                ? 'Try adjusting your search criteria'
                : 'No health articles have been published yet'
              }
            </p>
            {(authUser?.role === 'doctor' || authUser?.role === 'admin' || authUser?.isAdmin) && (
              <Link to="/create-article" className="btn btn-primary">
                Write the First Article
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogPage;
