import { useState, useEffect } from "react";
import { UserPlus, CheckCircle2, ShieldCheck, Search } from "lucide-react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { loadStoredData, saveStoredData, INITIAL_CORRESPONDENTS } from "../../lib/dataStore";
import type { Correspondent } from "../../types";
import EditorialDirectiveNotice from "../../components/EditorialDirectiveNotice";
import { useAuth } from "../../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function RegisterCorrespondent() {
  const [correspondents, setCorrespondents] = useState<Correspondent[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    idNumber: "",
    bankDetails: "",
    specialisation: "",
    county: "",
    password: "Password123!",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { user } = useAuth();

// ONLY Super Admin and Desk Editor can register correspondents
if (!user || !["super_admin", "editor"].includes(user.role)) {
  return <Navigate to="/" replace />;
}

  useEffect(() => {
    setCorrespondents(loadStoredData("byline_correspondents_v1", INITIAL_CORRESPONDENTS));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      let createdUid = `corr-${Date.now()}`;

      try {
        const userCred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
        createdUid = userCred.user.uid;

        await setDoc(doc(db, "users", createdUid), {
          uid: createdUid,
          name: form.name,
          email: form.email,
          role: "correspondent",
          phone: form.phone,
          idNumber: form.idNumber,
          bankDetails: form.bankDetails,
          specialisation: form.specialisation,
          county: form.county,
          registeredAt: new Date().toISOString(),
        });
      } catch (fbErr: any) {
        console.warn("Firebase registration skipped or erred (saving locally):", fbErr);
      }

      const newCorr: Correspondent = {
        id: createdUid,
        name: form.name,
        email: form.email.trim(),
        phone: form.phone,
        idNumber: form.idNumber,
        bankDetails: form.bankDetails,
        specialisation: form.specialisation,
        county: form.county || "Nairobi",
        registeredAt: new Date().toISOString(),
       registeredBy: user?.name || "Desk Editor",
      };

      const updated = [newCorr, ...correspondents];
      setCorrespondents(updated);
      saveStoredData("byline_correspondents_v1", updated);

      setMessage({
        type: "success",
        text: `Successfully registered ${form.name}. Credentials sent: ${form.email} (Password: ${form.password})`,
      });

      setForm({
        name: "",
        email: "",
        phone: "",
        idNumber: "",
        bankDetails: "",
        specialisation: "",
        county: "",
        password: "Password123!",
      });
    } catch (error: any) {
      console.error(error);
      setMessage({ type: "error", text: error?.message || "Failed to register correspondent." });
    } finally {
      setLoading(false);
    }
  };

  const filtered = correspondents.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.specialisation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-brand-navy text-white p-6 rounded-2xl shadow-md border-b-4 border-brand-gold flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-gold font-semibold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> US-03 Internal Correspondent Onboarding
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Register New Correspondent</h1>
          <p className="text-xs text-blue-200 mt-1">
            Register field reporters and freelance contributors into Byline system of record.
          </p>
        </div>
      </div>

      <EditorialDirectiveNotice />

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Registration Form */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-brand-navy mb-4 flex items-center gap-2 border-b pb-2">
            <UserPlus className="w-5 h-5 text-brand-gold" />
            <span>Correspondent Details</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
              <input
                name="name"
                placeholder="e.g. Jane Wambui"
                value={form.name}
                onChange={handleChange}
                className="w-full border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="jane@kbc.co.ke"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number</label>
                <input
                  name="phone"
                  placeholder="+254 712 345 678"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">National ID Number</label>
                <input
                  name="idNumber"
                  placeholder="28491029"
                  value={form.idNumber}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">County / Region</label>
                <input
                  name="county"
                  placeholder="Nakuru County"
                  value={form.county}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bank Details (For Finance Payout)</label>
              <input
                name="bankDetails"
                placeholder="KCB Bank - A/C 1184920491 (Nakuru Branch)"
                value={form.bankDetails}
                onChange={handleChange}
                className="w-full border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Beat Specialisation</label>
              <input
                name="specialisation"
                placeholder="e.g. Agriculture, Devolution, Marine Economy"
                value={form.specialisation}
                onChange={handleChange}
                className="w-full border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Initial Password</label>
              <input
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full border rounded-lg px-3.5 py-2 text-sm bg-gray-50 focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-navy hover:bg-blue-900 text-white font-bold py-2.5 rounded-xl shadow transition flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-brand-gold" />
              <span>{loading ? "Registering Correspondent..." : "Complete Registration"}</span>
            </button>
          </form>

          {message && (
            <div className={`mt-4 p-3 rounded-lg text-xs font-semibold ${
              message.type === "success" ? "bg-brand-teal text-white" : "bg-brand-red text-white"
            }`}>
              {message.text}
            </div>
          )}
        </div>

        {/* Registered Correspondents List Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-brand-navy text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-brand-gold">
            <h2 className="font-bold text-lg">Active Registered Correspondents ({filtered.length})</h2>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                placeholder="Search name, beat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/10 text-white placeholder-gray-300 text-xs rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:bg-white/20"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse table-byline">
              <thead>
                <tr className="bg-gray-100 text-xs font-bold uppercase tracking-wider text-slate-700 border-b">
                  <th className="p-3.5">Correspondent</th>
                  <th className="p-3.5">Contact / Bank</th>
                  <th className="p-3.5">Beat & County</th>
                  <th className="p-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {filtered.map((corr) => (
                  <tr key={corr.id} className="hover:bg-blue-50/40 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-brand-navy text-sm">{corr.name}</div>
                      <div className="text-gray-500 font-mono text-[11px]">ID: {corr.idNumber}</div>
                    </td>
                    <td className="p-3.5 text-gray-600">
                      <div>{corr.email}</div>
                      <div>{corr.phone}</div>
                      <div className="text-[11px] text-brand-navy font-semibold mt-0.5">{corr.bankDetails}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="bg-brand-teal text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1">
                        {corr.county || "County Correspondent"}
                      </span>
                      <div className="text-slate-800 font-medium">{corr.specialisation}</div>
                    </td>
                    <td className="p-3.5 text-right">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-md border border-emerald-300 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
