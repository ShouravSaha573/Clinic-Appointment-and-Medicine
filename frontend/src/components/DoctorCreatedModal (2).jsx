import { CheckCircle, Copy, Check } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const DoctorCreatedModal = ({ isOpen, onClose, doctor }) => {
  const [copied, setCopied] = useState(false);

  const copyDoctorId = async () => {
    try {
      await navigator.clipboard.writeText(doctor._id);
      setCopied(true);
      toast.success("Doctor ID copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy Doctor ID");
    }
  };

  if (!isOpen || !doctor) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <div className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          
          <h3 className="text-lg font-bold text-success mb-2">
            Doctor Added Successfully!
          </h3>
          
          <p className="text-gray-600 mb-6">
            The doctor profile has been created. Here are the details:
          </p>

          <div className="bg-base-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              {doctor.profileImage && (
                <div className="avatar">
                  <div className="w-12 h-12 rounded-full">
                    <img src={doctor.profileImage} alt={doctor.name} />
                  </div>
                </div>
              )}
              <div className="text-left">
                <div className="font-semibold">{doctor.name}</div>
                <div className="text-sm text-gray-600">{doctor.specialization}</div>
              </div>
            </div>
            
            <div className="text-left space-y-2 text-sm">
              <div><strong>Email:</strong> {doctor.email}</div>
              <div><strong>Phone:</strong> {doctor.phone}</div>
              <div><strong>Consultation Fee:</strong> ৳{doctor.consultationFee}</div>
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-primary mb-2">Doctor ID for Login</h4>
            <div className="flex items-center gap-2 justify-center">
              <code className="bg-base-100 px-3 py-2 rounded text-sm font-mono">
                {doctor._id}
              </code>
              <button
                onClick={copyDoctorId}
                className="btn btn-sm btn-outline"
                title="Copy Doctor ID"
              >
                {copied ? (
                  <Check className="size-4 text-success" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Share this ID with the doctor for account creation
            </p>
          </div>

          <div className="alert alert-info text-left">
            <div>
              <h4 className="font-semibold">Next Steps:</h4>
              <ul className="text-sm mt-1 space-y-1">
                <li>• Share the Doctor ID with the doctor</li>
                <li>• Doctor can sign up at <code>/doctor/signup</code></li>
                <li>• Doctor can search for their profile or use the ID directly</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="modal-action">
          <button onClick={onClose} className="btn btn-primary">
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorCreatedModal;
