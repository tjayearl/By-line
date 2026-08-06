import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { UserPlus } from "lucide-react";
import { db } from "../../lib/firebase";

export default function RegisterCorrespondent() {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", idNumber: "", bankDetails: "", specialisation: "",
  });
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    try {
      await addDoc(collection(db, "correspondents"), {
        ...form,
        createdAt: new Date().toISOString(),
      });
      setMessage("Correspondent registered successfully.");
      setForm({ name: "", email: "", phone: "", idNumber: "", bankDetails: "", specialisation: "" });
    } catch (error) {
      setMessage("Failed to register correspondent.");
      console.error(error);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-bold flex items-center gap-2 mb-4">
        <UserPlus className="w-5 h-5" /> Register Correspondent
      </h1>
      <form onSubmit={handleSubmit} className="space-y-3 bg-white p-6 rounded-lg shadow-sm border">
        {(["name", "email", "phone", "idNumber", "bankDetails", "specialisation"] as const).map((field) => (
          <input
            key={field}
            name={field}
            placeholder={field}
            value={form[field]}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2"
            required
          />
        ))}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Register
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-green-600">{message}</p>}
    </div>
  );
}
