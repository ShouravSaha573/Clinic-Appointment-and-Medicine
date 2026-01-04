import { useState } from "react";
import { Search, User, CheckCircle } from "lucide-react";
import { axiosInstance } from "../lib/axios.js";

const DoctorIdSearch = ({ onDoctorSelect, selectedDoctorId }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const searchDoctors = async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axiosInstance.get(`/doctors?search=${encodeURIComponent(term)}`);
      setSearchResults(response.data.doctors || []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      searchDoctors(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const selectDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    onDoctorSelect(doctor._id);
    setSearchResults([]);
    setSearchTerm(doctor.name);
  };

  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-medium">Find Your Doctor Profile</span>
      </label>
      
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          className="input input-bordered w-full pl-10"
          placeholder="Search by doctor name, email, or specialization..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <Search className="size-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="loading loading-spinner loading-sm"></div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {searchResults.map((doctor) => (
            <button
              key={doctor._id}
              type="button"
              onClick={() => selectDoctor(doctor)}
              className="w-full p-3 text-left hover:bg-base-200 border-b border-base-200 last:border-b-0 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="avatar">
                  <div className="w-10 h-10 rounded-full">
                    <img 
                      src={doctor.profileImage || "/api/placeholder/40/40"} 
                      alt={doctor.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{doctor.name}</div>
                  <div className="text-xs text-gray-600">{doctor.specialization}</div>
                  <div className="text-xs text-gray-500">{doctor.email}</div>
                </div>
                <div className="text-xs text-gray-400">
                  {doctor.experience} years exp.
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected Doctor Display */}
      {selectedDoctor && selectedDoctorId && (
        <div className="mt-3 p-3 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle className="size-4" />
            <span className="text-sm font-medium">Selected Doctor Profile</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="avatar">
              <div className="w-12 h-12 rounded-full">
                <img 
                  src={selectedDoctor.profileImage || "/api/placeholder/48/48"} 
                  alt={selectedDoctor.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <div className="font-semibold">{selectedDoctor.name}</div>
              <div className="text-sm text-gray-600">{selectedDoctor.specialization}</div>
              <div className="text-xs text-gray-500">ID: {selectedDoctorId}</div>
            </div>
          </div>
        </div>
      )}

      {/* Manual ID Input */}
      <div className="mt-4">
        <div className="divider text-xs">OR</div>
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder="Enter Doctor ID manually"
          value={selectedDoctorId || ""}
          onChange={(e) => {
            onDoctorSelect(e.target.value);
            setSelectedDoctor(null);
            setSearchTerm("");
          }}
        />
        <div className="label">
          <span className="label-text-alt text-gray-500">
            Get your Doctor ID from the admin or search above
          </span>
        </div>
      </div>
    </div>
  );
};

export default DoctorIdSearch;
