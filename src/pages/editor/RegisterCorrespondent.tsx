import { useState } from "react";
import { UserPlus } from "lucide-react";

export default function RegisterCorrespondent() {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", idNumber: "", bankDetails: "", specialisation: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("New correspondent:", form);
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-bold flex items-center gap-2 mb-4">
        <UserPlus className="w-5 h-5" /> Register Correspondent
      </h1>
      <form onSubmit={handleSubmit} className="space-y-3 bg-white p-6 rounded-lg shadow-sm border">
        {["name", "email", "phone", "idNumber", "bankDetails", "specialisation"].map((field) => (
          <input
            key={field}
            name={field}
            placeholder={field}
            value={(form as any)[field]}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2"
            required
          />
        ))}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Register
        </button>
      </form>
    </div>
  );
}
