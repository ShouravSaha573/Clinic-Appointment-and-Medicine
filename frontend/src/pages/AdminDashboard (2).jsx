import { useEffect, useState } from "react";
import {
  Users,
  Stethoscope,
  UserCheck,
  UserX,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  BarChart3,
} from "lucide-react";
import { useAdminStore } from "../store/useAdminStore";
import { useAuthStore } from "../store/useAuthStore";
import DoctorCreatedModal from "../components/DoctorCreatedModal";
import toast from "react-hot-toast";

const AdminDashboard = () => {
  const { authUser } = useAuthStore();
  const {
    stats,
    doctors,
    isLoading,
    fetchStats,
    fetchDoctors,
    addDoctor,
    updateDoctor,
    toggleDoctorStatus,
    deleteDoctor,
  } = useAdminStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [doctorForm, setDoctorForm] = useState({
    name: "",
    specialization: "",
    qualification: "",
    experience: "",
    phone: "",
    email: "",
    bio: "",
    consultationFee: "",
    profileImage: "",
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdDoctor, setCreatedDoctor] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchDoctors().catch((err) =>
      console.error("Failed to fetch doctors in admin dashboard:", err)
    );
  }, [fetchStats, fetchDoctors]);

  const resetForm = () => {
    setDoctorForm({
      name: "",
      specialization: "",
      qualification: "",
      experience: "",
      phone: "",
      email: "",
      bio: "",
      consultationFee: "",
      profileImage: "",
    });
    setEditingDoctor(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !doctorForm.name ||
      !doctorForm.specialization ||
      !doctorForm.qualification ||
      !doctorForm.experience ||
      !doctorForm.phone ||
      !doctorForm.email ||
      !doctorForm.consultationFee
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const result = editingDoctor
      ? await updateDoctor(editingDoctor._id, doctorForm)
      : await addDoctor(doctorForm);

    if (result?.success) {
      setShowAddModal(false);
      resetForm();
      fetchStats();
      fetchDoctors();

      if (!editingDoctor && result.doctor) {
        setCreatedDoctor(result.doctor);
        setShowSuccessModal(true);
      }
    }
  };

  const handleToggleStatus = async (doctorId) => {
    await toggleDoctorStatus(doctorId);
    fetchStats();
    fetchDoctors();
  };

  const handleDeleteDoctor = async (doctorId) => {
    if (
      !window.confirm(
        "Are you sure you want to deactivate this doctor? This can be reversed later."
      )
    ) {
      return;
    }
    await deleteDoctor(doctorId);
    fetchStats();
    fetchDoctors();
  };

  const filteredDoctors = doctors.filter((doctor) => {
    const matchName =
      !searchTerm ||
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSpec =
      !specializationFilter ||
      doctor.specialization === specializationFilter;
    const matchStatus =
      !statusFilter ||
      (statusFilter === "true" ? doctor.isActive : !doctor.isActive);
    return matchName && matchSpec && matchStatus;
  });

  const safeStats = stats || {};

  return (
    <div className="min-h-screen bg-base-200 pt-20 pb-10">
      <div className="container mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Admin dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage doctors, monitor system usage, and control access.
            </p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>Signed in as</p>
            <p className="font-semibold text-gray-800">
              {authUser?.fullName || authUser?.email}
            </p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-figure text-primary">
              <Stethoscope className="size-8" />
            </div>
            <div className="stat-title">Total doctors</div>
            <div className="stat-value text-primary">
              {safeStats.doctors?.total || 0}
            </div>
            <div className="stat-desc">
              Active: {safeStats.doctors?.active || 0}
            </div>
          </div>

          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-figure text-secondary">
              <Users className="size-8" />
            </div>
            <div className="stat-title">Users</div>
            <div className="stat-value text-secondary">
              {safeStats.users?.total || 0}
            </div>
            <div className="stat-desc">
              Admins: {safeStats.users?.admins || 0}
            </div>
          </div>

          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-figure text-accent">
              <UserCheck className="size-8" />
            </div>
            <div className="stat-title">Active doctors</div>
            <div className="stat-value text-accent">
              {safeStats.doctors?.active || 0}
            </div>
            <div className="stat-desc">Visible in booking</div>
          </div>

          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-figure text-info">
              <BarChart3 className="size-8" />
            </div>
            <div className="stat-title">Inactive doctors</div>
            <div className="stat-value text-info">
              {safeStats.doctors?.inactive || 0}
            </div>
            <div className="stat-desc">Not available for booking</div>
          </div>
        </div>

        {/* Doctor management header */}
        <div className="bg-base-100 rounded-lg shadow p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Doctor management
            </h2>
            <p className="text-sm text-gray-600">
              Add, edit, and control which doctors are available for online
              booking.
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="btn btn-primary gap-2"
          >
            <Plus className="size-4" />
            Add doctor
          </button>
        </div>

        {/* Filters */}
        <div className="bg-base-100 rounded-lg shadow p-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <Search className="size-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by doctor name"
              className="input input-bordered input-sm w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="size-4 text-gray-500" />
            <select
              className="select select-bordered select-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All status</option>
              <option value="true">Active only</option>
              <option value="false">Inactive only</option>
            </select>
          </div>
        </div>

        {/* Doctor table */}
        <div className="bg-base-100 rounded-lg shadow overflow-x-auto">
          {isLoading ? (
            <div className="p-6 text-center">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No doctors found. Add your first doctor to enable booking.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Specialization</th>
                  <th>Experience</th>
                  <th>Fee (BDT)</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doctor) => (
                  <tr key={doctor._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar">
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                            <Stethoscope className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            Dr. {doctor.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {doctor.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{doctor.specialization}</td>
                    <td>{doctor.experience || "-"} yrs</td>
                    <td>{doctor.consultationFee || "-"} </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span
                          className={`badge ${
                            doctor.isActive ? "badge-success" : "badge-ghost"
                          }`}
                        >
                          {doctor.isActive ? "Active" : "Inactive"}
                        </span>
                        <button
                          onClick={() => handleToggleStatus(doctor._id)}
                          className="btn btn-ghost btn-xs"
                          title="Toggle active status"
                        >
                          {doctor.isActive ? (
                            <ToggleRight className="size-4 text-green-500" />
                          ) : (
                            <ToggleLeft className="size-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => {
                            setEditingDoctor(doctor);
                            setDoctorForm({
                              name: doctor.name || "",
                              specialization: doctor.specialization || "",
                              qualification: doctor.qualification || "",
                              experience: doctor.experience || "",
                              phone: doctor.phone || "",
                              email: doctor.email || "",
                              bio: doctor.bio || "",
                              consultationFee: doctor.consultationFee || "",
                              profileImage: doctor.profileImage || "",
                            });
                            setShowAddModal(true);
                          }}
                        >
                          <Edit className="size-4" />
                        </button>
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => handleDeleteDoctor(doctor._id)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Add/Edit doctor modal */}
        {showAddModal && (
          <div className="modal modal-open">
            <div className="modal-box w-11/12 max-w-2xl">
              <h3 className="font-bold text-lg mb-4">
                {editingDoctor ? "Edit doctor" : "Add new doctor"}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Name *</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={doctorForm.name}
                      onChange={(e) =>
                        setDoctorForm({ ...doctorForm, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Specialization *</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={doctorForm.specialization}
                      onChange={(e) =>
                        setDoctorForm({
                          ...doctorForm,
                          specialization: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Qualification *</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={doctorForm.qualification}
                      onChange={(e) =>
                        setDoctorForm({
                          ...doctorForm,
                          qualification: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Experience (years) *</span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered"
                      value={doctorForm.experience}
                      onChange={(e) =>
                        setDoctorForm({
                          ...doctorForm,
                          experience: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Phone *</span>
                    </label>
                    <input
                      type="tel"
                      className="input input-bordered"
                      value={doctorForm.phone}
                      onChange={(e) =>
                        setDoctorForm({ ...doctorForm, phone: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Email *</span>
                    </label>
                    <input
                      type="email"
                      className="input input-bordered"
                      value={doctorForm.email}
                      onChange={(e) =>
                        setDoctorForm({ ...doctorForm, email: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">
                        Consultation fee (BDT) *
                      </span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered"
                      value={doctorForm.consultationFee}
                      onChange={(e) =>
                        setDoctorForm({
                          ...doctorForm,
                          consultationFee: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Profile image URL</span>
                    </label>
                    <input
                      type="url"
                      className="input input-bordered"
                      value={doctorForm.profileImage}
                      onChange={(e) =>
                        setDoctorForm({
                          ...doctorForm,
                          profileImage: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Short bio</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered"
                    rows={3}
                    value={doctorForm.bio}
                    onChange={(e) =>
                      setDoctorForm({ ...doctorForm, bio: e.target.value })
                    }
                  />
                </div>

                <div className="modal-action">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingDoctor ? "Save changes" : "Create doctor"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Doctor created success modal */}
        <DoctorCreatedModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setCreatedDoctor(null);
          }}
          doctor={createdDoctor}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
