import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const toDateInputValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const normalizeCategory = (value) => {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "Antibiotic";
  // Backward-compat: some older data uses plural.
  if (raw.toLowerCase() === "vitamins") return "Vitamin";
  if (raw.toLowerCase() === "antibiotics") return "Antibiotic";
  return raw;
};

const DEFAULT_CATEGORIES = [
  "Antibiotic",
  "Pain Relief",
  "Cold & Flu",
  "Vitamin",
  "Cardiac",
  "Diabetes",
  "Blood Pressure",
  "Digestive",
  "Respiratory",
  "Skin Care",
  "Mental Health",
  "Others",
];

const mergeUniqueStrings = (values) => {
  const out = [];
  const seen = new Set();
  for (const v of values) {
    const s = typeof v === "string" ? v.trim() : "";
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
};

const AddMedicineModal = ({ isOpen, onClose, medicine = null, onMedicineCreated }) => {
  const isEditing = !!medicine;
  
  const [formData, setFormData] = useState({
    name: medicine?.name || "",
    manufacturer: medicine?.manufacturer || "",
    price: medicine?.price || "",
    category: normalizeCategory(medicine?.category) || "Antibiotic",
    description: medicine?.description || "",
    image: medicine?.image || "",
    stock:
      medicine?.stock !== undefined && medicine?.stock !== null
        ? String(medicine.stock)
        : isEditing
          ? ""
          : "100",
    expiryDate: toDateInputValue(medicine?.expiryDate) || toDateInputValue(Date.now() + 365 * 24 * 60 * 60 * 1000),
  });

  const [categoryMode, setCategoryMode] = useState("select"); // 'select' | 'custom'
  const [customCategory, setCustomCategory] = useState("");
  const [availableCategories, setAvailableCategories] = useState(DEFAULT_CATEGORIES);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const initialCategory = normalizeCategory(medicine?.category) || "Antibiotic";

    setFormData({
      name: medicine?.name || "",
      manufacturer: medicine?.manufacturer || "",
      price: medicine?.price || "",
      category: initialCategory,
      description: medicine?.description || "",
      image: medicine?.image || "",
      stock:
        medicine?.stock !== undefined && medicine?.stock !== null
          ? String(medicine.stock)
          : isEditing
            ? ""
            : "100",
      expiryDate: toDateInputValue(medicine?.expiryDate) || toDateInputValue(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    // If editing a medicine with a category not in our defaults, show it via the custom option.
    const isDefault = DEFAULT_CATEGORIES.some((c) => c.toLowerCase() === String(initialCategory).toLowerCase());
    if (!isDefault && initialCategory) {
      setCategoryMode("custom");
      setCustomCategory(initialCategory);
    } else {
      setCategoryMode("select");
      setCustomCategory("");
    }
  }, [isOpen, medicine]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await axiosInstance.get("/medicines/categories");
        const fromApi = Array.isArray(res.data) ? res.data : [];
        const merged = mergeUniqueStrings([...DEFAULT_CATEGORIES, ...fromApi]);
        if (!cancelled) setAvailableCategories(merged.length ? merged : DEFAULT_CATEGORIES);
      } catch {
        if (!cancelled) setAvailableCategories(DEFAULT_CATEGORIES);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const categoriesForSelect = useMemo(() => {
    const current = normalizeCategory(medicine?.category);
    return mergeUniqueStrings([...(availableCategories || []), current]);
  }, [availableCategories, medicine]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "category") {
      if (value === "__new__") {
        setCategoryMode("custom");
        setCustomCategory("");
        return;
      }
      setCategoryMode("select");
    }
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      e.target.value = "";
      return;
    }

    // Client-side guard (backend also has guards)
    const maxBytes = 3 * 1024 * 1024; // 3MB
    if (file.size > maxBytes) {
      toast.error("Image is too large. Please use an image under 3MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        image: typeof reader.result === "string" ? reader.result : "",
      }));
    };
    reader.onerror = () => {
      toast.error("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const parsedPrice = parseFloat(String(formData.price));
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        toast.error("Price must be a non-negative number");
        return;
      }

      // For updates, send only the fields we allow editing to avoid
      // overwriting existing required fields (stock/expiry were previously overwritten).
      const finalCategory =
        categoryMode === "custom" ? String(customCategory || "").trim() : String(formData.category || "").trim();
      if (!finalCategory) {
        toast.error("Category is required");
        return;
      }

      const updatePayload = {
        name: formData.name,
        manufacturer: formData.manufacturer,
        price: parsedPrice,
        category: finalCategory,
        description: formData.description,
        image: formData.image,
      };

      if (isEditing) {
        const stockNumber = Number(formData.stock);
        if (formData.stock !== "") {
          if (!Number.isFinite(stockNumber) || stockNumber < 0) {
            toast.error("Stock must be a non-negative number");
            return;
          }
          updatePayload.stock = stockNumber;
        }

        if (formData.expiryDate) {
          const expiry = new Date(formData.expiryDate);
          if (Number.isNaN(expiry.getTime())) {
            toast.error("Expiry date is invalid");
            return;
          }
          updatePayload.expiryDate = expiry;
        }

        if (medicine?.genericName === medicine?.name || !medicine?.genericName) {
          updatePayload.genericName = formData.name;
        }
      }

      // For creates, fill required fields with defaults.
      const createStockRaw = String(formData.stock ?? "").trim();
      const createStockNumber = createStockRaw === "" ? 100 : Number(createStockRaw);
      if (!Number.isFinite(createStockNumber) || createStockNumber < 0) {
        toast.error("Stock must be a non-negative number");
        return;
      }

      const createPayload = {
        ...updatePayload,
        genericName: formData.name,
        brand: "Generic",
        form: "Tablet",
        strength: "Standard",
        stock: Math.floor(createStockNumber),
        minStock: 10,
        dosage: "As directed by physician",
        batchNumber: `BATCH-${Date.now()}`,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        prescriptionRequired: false,
      };

      let response;
      if (isEditing) {
        response = await axiosInstance.put(`/medicines/${medicine._id}`, updatePayload);
        toast.success("Medicine updated successfully");
      } else {
        response = await axiosInstance.post("/medicines", createPayload);
        toast.success("Medicine created successfully");
      }

      onMedicineCreated(response.data.medicine);
      onClose();
    } catch (error) {
      console.error("Error saving medicine:", error);
      toast.error(error.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} medicine`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">
            {isEditing ? "Edit Medicine" : "Add New Medicine"}
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Medicine Name */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Medicine Name *</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="input input-bordered w-full"
              required
              placeholder="Enter medicine name"
            />
          </div>

          {/* Manufacturer and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text font-medium">Manufacturer *</span>
              </label>
              <input
                type="text"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleInputChange}
                className="input input-bordered w-full"
                required
                placeholder="Enter manufacturer name"
              />
            </div>
            <div>
              <label className="label">
                <span className="label-text font-medium">Category *</span>
              </label>
              <select
                name="category"
                value={categoryMode === "custom" ? "__new__" : formData.category}
                onChange={handleInputChange}
                className="select select-bordered w-full"
              >
                {categoriesForSelect.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
                <option value="__new__">Create new category…</option>
              </select>

              {categoryMode === "custom" && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="input input-bordered w-full"
                    placeholder="Type new category name"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Price (৳) *</span>
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="input input-bordered w-full"
              required
              placeholder="Enter price in BDT"
            />
          </div>

          {/* Stock (Create + Edit) and Expiry (Edit only) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text font-medium">Stock{isEditing ? "" : " *"}</span>
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                min="0"
                step="1"
                className="input input-bordered w-full"
                placeholder="Enter stock quantity"
                required={!isEditing}
              />
            </div>

            {isEditing && (
              <div>
                <label className="label">
                  <span className="label-text font-medium">Expiry Date</span>
                </label>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Description *</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="textarea textarea-bordered w-full h-24"
              required
              placeholder="Enter medicine description and usage instructions"
            />
          </div>

          {/* Image */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Medicine Picture</span>
            </label>

            <div className="flex flex-col gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="file-input file-input-bordered w-full"
              />

              {formData.image ? (
                <div className="flex items-center gap-4">
                  <div className="avatar">
                    <div className="mask mask-squircle w-20 h-20">
                      <img
                        src={formData.image}
                        alt="Medicine preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => setFormData((prev) => ({ ...prev, image: "" }))}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Optional: upload a medicine photo.</p>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  {isEditing ? "Update Medicine" : "Create Medicine"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMedicineModal;
