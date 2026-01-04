import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { useMedicineStore } from "../store/useMedicineStore";
import { useCartStore } from "../store/useCartStore";
import { ShoppingCartIcon, SearchIcon, FilterIcon, Eye, X } from "lucide-react";
import toast from "react-hot-toast";

// Custom debounce hook
const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const getSortParams = (value) => {
  if (value === "-price") return { sortBy: "price", sortOrder: "desc" };
  if (value === "price") return { sortBy: "price", sortOrder: "asc" };
  if (value === "createdAt") return { sortBy: "createdAt", sortOrder: "desc" };
  return { sortBy: "name", sortOrder: "asc" };
};

// Memoized Medicine Card Component to prevent unnecessary re-renders
const MedicineCard = memo(({ medicine, onView, onAddToCart, cartLoading, isExpiringSoon }) => (
  <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
    {/* Medicine Image */}
    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 rounded-t-lg">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-blue-400 text-6xl">💊</div>
      </div>
      {typeof medicine.image === "string" && medicine.image.trim() ? (
        <img
          src={medicine.image}
          alt={medicine.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </div>

    <div className="p-6">
      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
        {medicine.name}
      </h3>
      {medicine.genericName && (
        <p className="text-sm text-gray-600 mb-2">
          Generic: {medicine.genericName}
        </p>
      )}
      {medicine.manufacturer && (
        <p className="text-sm text-gray-600 mb-2">
          Manufacturer: {medicine.manufacturer}
        </p>
      )}
      {medicine.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {medicine.description}
        </p>
      )}
      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mb-3">
        {medicine.category}
      </span>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl font-bold text-gray-900">
          ৳{medicine.price}
        </span>
        <span className="text-sm text-gray-600">
          per {medicine.unit}
        </span>
      </div>
      <div className="mb-4">
        {medicine.stock > 0 ? (
          <div className="flex items-center justify-between">
            <span className="text-green-600 text-sm font-medium">
              In Stock ({medicine.stock})
            </span>
            {isExpiringSoon(medicine.expiryDate) && (
              <span className="text-orange-600 text-xs">
                Expires Soon
              </span>
            )}
          </div>
        ) : (
          <span className="text-red-600 text-sm font-medium">
            Out of Stock
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onView(medicine)}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <Eye className="w-4 h-4" />
          View
        </button>
        <button
          onClick={() => onAddToCart(medicine)}
          disabled={medicine.stock === 0 || cartLoading}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors ${
            medicine.stock === 0
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          <ShoppingCartIcon className="w-4 h-4" />
          {medicine.stock === 0 ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
    </div>
  </div>
));

MedicineCard.displayName = "MedicineCard";


const MedicinePage = () => {
  const {
    medicines,
    isLoading,
    pagination,
    fetchMedicines,
    fetchCategories, 
    searchMedicines,
    categories,
    selectedCategory,
    setSelectedCategory,
  } = useMedicineStore();


  const { addToCart, isLoading: cartLoading } = useCartStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("name");
  const [viewMedicine, setViewMedicine] = useState(null);
  
  // Track if initial fetch is done
  const initialFetchDone = useRef(false);

  // Debounce search term for auto-search
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Initial fetch - only once
  useEffect(() => {
    if (!initialFetchDone.current) {
      fetchCategories();
      fetchMedicines(1);
      initialFetchDone.current = true;
    }
  }, []);

  // Memoized filter function to prevent unnecessary re-renders
  const getFilterParams = useCallback(() => {
    const { sortBy: sBy, sortOrder } = getSortParams(sortBy);
    return {
      category: selectedCategory === "all" ? undefined : selectedCategory,
      minPrice: priceRange.min ? parseFloat(priceRange.min) : undefined,
      maxPrice: priceRange.max ? parseFloat(priceRange.max) : undefined,
      sortBy: sBy,
      sortOrder,
      search: searchTerm.trim() || undefined,
    };
  }, [selectedCategory, priceRange.min, priceRange.max, sortBy, searchTerm]);


  const handleSearch = useCallback((e) => {
    e.preventDefault();
    const { sortBy: sBy, sortOrder } = getSortParams(sortBy);

    fetchMedicines(1, {
      category: selectedCategory === "all" ? undefined : selectedCategory,
      minPrice: priceRange.min ? parseFloat(priceRange.min) : undefined,
      maxPrice: priceRange.max ? parseFloat(priceRange.max) : undefined,
      sortBy: sBy,
      sortOrder,
      search: searchTerm.trim() || undefined,
    });
  }, [fetchMedicines, selectedCategory, priceRange.min, priceRange.max, sortBy, searchTerm]);



  const handleAddToCart = useCallback(async (medicine) => {
    if (medicine.stock === 0) {
      toast.error("This medicine is out of stock");
      return;
    }
    await addToCart(medicine._id, 1);
  }, [addToCart]);

  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
    const { sortBy: sBy, sortOrder } = getSortParams(sortBy);

    fetchMedicines(1, {
      category: category === "all" ? undefined : category,
      minPrice: priceRange.min ? parseFloat(priceRange.min) : undefined,
      maxPrice: priceRange.max ? parseFloat(priceRange.max) : undefined,
      sortBy: sBy,
      sortOrder,
      search: searchTerm.trim() || undefined,
    });
  }, [setSelectedCategory, fetchMedicines, sortBy, priceRange.min, priceRange.max, searchTerm]);


  const handlePriceFilter = useCallback(() => {
    const { sortBy: sBy, sortOrder } = getSortParams(sortBy);

    fetchMedicines(1, {
      category: selectedCategory === "all" ? undefined : selectedCategory,
      minPrice: priceRange.min ? parseFloat(priceRange.min) : undefined,
      maxPrice: priceRange.max ? parseFloat(priceRange.max) : undefined,
      sortBy: sBy,
      sortOrder,
      search: searchTerm.trim() || undefined,
    });
  }, [fetchMedicines, selectedCategory, priceRange.min, priceRange.max, sortBy, searchTerm]);


  const handlePageChange = useCallback((page) => {
    const { sortBy: sBy, sortOrder } = getSortParams(sortBy);

    fetchMedicines(page, {
      category: selectedCategory === "all" ? undefined : selectedCategory,
      minPrice: priceRange.min ? parseFloat(priceRange.min) : undefined,
      maxPrice: priceRange.max ? parseFloat(priceRange.max) : undefined,
      sortBy: sBy,
      sortOrder,
      search: searchTerm.trim() || undefined,
    });
  }, [fetchMedicines, selectedCategory, priceRange.min, priceRange.max, sortBy, searchTerm]);


  const isExpiringSoon = useCallback((expiryDate) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const monthsFromNow = new Date();
    monthsFromNow.setMonth(today.getMonth() + 6);
    return expiry <= monthsFromNow;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Medicine Catalog</h1>
          <p className="text-gray-600">Browse and order medicines with doorstep delivery</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search medicines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FilterIcon className="w-5 h-5" />
              Filters
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}

                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Price (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Price (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="1000"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="name">Name</option>
                    <option value="price">Price: Low to High</option>
                    <option value="-price">Price: High to Low</option>
                    <option value="createdAt">Newest First</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={handlePriceFilter}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Medicine Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
                <div className="animate-pulse">
                  <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : medicines.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 text-6xl mb-4">💊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No medicines found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {medicines.map((medicine) => (
              <MedicineCard
                key={medicine._id}
                medicine={medicine}
                onView={setViewMedicine}
                onAddToCart={handleAddToCart}
                cartLoading={cartLoading}
                isExpiringSoon={isExpiringSoon}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-12 flex justify-center">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.current - 1)}
                disabled={!pagination.hasPrev}
                className={`px-3 py-2 rounded-lg ${
                  pagination.hasPrev
                    ? "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                Previous
              </button>

              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 rounded-lg ${
                    page === pagination.current
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(pagination.current + 1)}
                disabled={!pagination.hasNext}
                className={`px-3 py-2 rounded-lg ${
                  pagination.hasNext
                    ? "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* View Medicine Modal */}
      {viewMedicine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Medicine Details</h2>
              <button
                onClick={() => setViewMedicine(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Medicine Image */}
              <div className="relative h-64 overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg mb-6">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-blue-400 text-8xl">💊</div>
                </div>
                {typeof viewMedicine.image === "string" && viewMedicine.image.trim() && (
                  <img
                    src={viewMedicine.image}
                    alt={viewMedicine.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                )}
              </div>

              {/* Medicine Name & Category */}
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{viewMedicine.name}</h3>
                <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                  {viewMedicine.category}
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {viewMedicine.genericName && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Generic Name</p>
                    <p className="font-medium text-gray-900">{viewMedicine.genericName}</p>
                  </div>
                )}
                {viewMedicine.brand && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Brand</p>
                    <p className="font-medium text-gray-900">{viewMedicine.brand}</p>
                  </div>
                )}
                {viewMedicine.manufacturer && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Manufacturer</p>
                    <p className="font-medium text-gray-900">{viewMedicine.manufacturer}</p>
                  </div>
                )}
                {viewMedicine.strength && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Strength</p>
                    <p className="font-medium text-gray-900">{viewMedicine.strength}</p>
                  </div>
                )}
                {viewMedicine.form && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Form</p>
                    <p className="font-medium text-gray-900">{viewMedicine.form}</p>
                  </div>
                )}
                {viewMedicine.unit && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Unit</p>
                    <p className="font-medium text-gray-900">{viewMedicine.unit}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {viewMedicine.description && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600 leading-relaxed">{viewMedicine.description}</p>
                </div>
              )}

              {/* Price & Stock */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Price</p>
                    <p className="text-3xl font-bold text-gray-900">৳{viewMedicine.price}</p>
                    {viewMedicine.discountPrice && viewMedicine.discountPrice < viewMedicine.price && (
                      <p className="text-sm text-gray-500 line-through">৳{viewMedicine.discountPrice}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Availability</p>
                    {viewMedicine.stock > 0 ? (
                      <p className="text-lg font-semibold text-green-600">In Stock ({viewMedicine.stock})</p>
                    ) : (
                      <p className="text-lg font-semibold text-red-600">Out of Stock</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Expiry Date */}
              {viewMedicine.expiryDate && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-1">Expiry Date</p>
                  <p className={`font-medium ${
                    new Date(viewMedicine.expiryDate) < new Date() ? 'text-red-600' :
                    isExpiringSoon(viewMedicine.expiryDate) ? 'text-orange-600' : 'text-gray-900'
                  }`}>
                    {new Date(viewMedicine.expiryDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    {new Date(viewMedicine.expiryDate) < new Date() && ' (EXPIRED)'}
                    {isExpiringSoon(viewMedicine.expiryDate) && new Date(viewMedicine.expiryDate) >= new Date() && ' (Expiring Soon)'}
                  </p>
                </div>
              )}

              {/* Add to Cart Button */}
              <button
                onClick={() => {
                  handleAddToCart(viewMedicine);
                  setViewMedicine(null);
                }}
                disabled={viewMedicine.stock === 0 || cartLoading}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-lg transition-colors ${
                  viewMedicine.stock === 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <ShoppingCartIcon className="w-5 h-5" />
                {viewMedicine.stock === 0 ? "Out of Stock" : "Add to Cart"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicinePage;
