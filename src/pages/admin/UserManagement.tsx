import { useState, useEffect } from "react";
import {
  Users, UserPlus, Shield, ShieldCheck, Edit3, Trash2,
  Search, CheckCircle2, AlertCircle, RefreshCw,
  Building2, Mail, UserCheck, X, Send
} from "lucide-react";
import { doc, getDocs, collection, setDoc, deleteDoc } from "firebase/firestore";
import { db, createSecondaryUser } from "../../lib/firebase";
import { sendUserWelcomeAndActivationEmail, resendAccountActivation } from "../../lib/emailService";
import { loadStoredData, saveStoredData, INITIAL_CORRESPONDENTS } from "../../lib/dataStore";
import { usersList } from "../../data/mockData";
import type { Role, SystemUser, Correspondent } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { Navigate } from "react-router-dom";

const ROLE_CONFIG: Record<Role, { title: string; badgeClass: string; desc: string }> = {
  super_admin: {
    title: "Super Admin",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300",
    desc: "Head of Digital / Full access to all modules, rates, and user administration",
  },
  managing_editor: {
    title: "Managing Editor",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
    desc: "Editorial Leadership / Rate card management and publication sign-off",
  },
  editor: {
    title: "Desk Editor",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    desc: "Commissioning / Assignments, story review, proof of use verification",
  },
  correspondent: {
    title: "Correspondent",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    desc: "Field Journalist / Story filing, proof of publication, rate invoice claims",
  },
  finance: {
    title: "Finance Controller",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-300",
    desc: "Finance & Accounts / Verification of claims and payment processing",
  },
  digitalOps: {
    title: "Digital Ops Lead",
    badgeClass: "bg-cyan-100 text-cyan-800 border-cyan-300",
    desc: "Operations / Platform distribution, inventory, and airing logs",
  },
  adManager: {
    title: "Ad Operations Manager",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
    desc: "Digital AdBoard / Advertising and campaign order approvals",
  },
};

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);

  // Form State
  const [form, setForm] = useState<{
    name: string;
    email: string;
    password: string;
    role: Role;
    department: string;
    phone: string;
    idNumber: string;
    bankDetails: string;
    specialisation: string;
    county: string;
  }>({
    name: "",
    email: "",
    password: "Password123!",
    role: "editor",
    department: "Central News Desk",
    phone: "",
    idNumber: "",
    bankDetails: "",
    specialisation: "",
    county: "Nairobi",
  });

  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load all users from Firestore + Mock Data + Correspondents Store
  const fetchAllUsers = async () => {
    setRefreshing(true);
    try {
      const userMap = new Map<string, SystemUser>();
      const deletedEmails = new Set(
        loadStoredData<string[]>("byline_deleted_users_v1", []).map((e) => e.toLowerCase())
      );

      // 1. Load mock predefined users (skip if marked deleted)
      usersList.forEach((m) => {
        const key = m.email.toLowerCase();
        if (!deletedEmails.has(key)) {
          userMap.set(key, {
            id: m.id || `usr-${key}`,
            uid: m.uid || m.id || `usr-${key}`,
            name: m.name || m.email,
            email: m.email,
            role: m.role as Role,
            department: m.department || "KBC Digital",
            registeredAt: "2026-07-01T00:00:00Z",
            status: "active",
          });
        }
      });

      // 2. Load stored correspondents (skip if marked deleted)
      const storedCorrs = loadStoredData<Correspondent[]>("byline_correspondents_v1", INITIAL_CORRESPONDENTS);
      storedCorrs.forEach((c) => {
        const key = c.email.toLowerCase();
        if (!deletedEmails.has(key)) {
          userMap.set(key, {
            id: c.id,
            uid: c.id,
            name: c.name,
            email: c.email,
            role: "correspondent",
            department: c.county ? `${c.county} County Bureau` : "Regional Bureau",
            phone: c.phone,
            idNumber: c.idNumber,
            bankDetails: c.bankDetails,
            specialisation: c.specialisation,
            county: c.county,
            registeredAt: c.registeredAt,
            registeredBy: c.registeredBy,
            status: "active",
          });
        }
      });

      // 3. Load locally saved custom / updated users
      const customUsers = loadStoredData<SystemUser[]>("byline_custom_users_v1", []);
      customUsers.forEach((u) => {
        const key = u.email.toLowerCase();
        if (!deletedEmails.has(key)) {
          userMap.set(key, u);
        }
      });

      // 4. Fetch from Firestore users collection
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const email = (data.email || "").toLowerCase();
          if (email && !deletedEmails.has(email)) {
            userMap.set(email, {
              id: docSnap.id,
              uid: data.uid || docSnap.id,
              name: data.name || email,
              email: data.email,
              role: (data.role as Role) || "correspondent",
              department: data.department || (data.county ? `${data.county} County Bureau` : "General"),
              phone: data.phone || "",
              idNumber: data.idNumber || "",
              bankDetails: data.bankDetails || "",
              specialisation: data.specialisation || "",
              county: data.county || "",
              registeredAt: data.registeredAt || new Date().toISOString(),
              registeredBy: data.registeredBy,
              status: "active",
            });
          }
        });
      } catch (fsErr) {
        console.warn("Firestore fetch users warning:", fsErr);
      }

      setUsers(Array.from(userMap.values()));
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  // Strictly enforce super_admin access
  if (!user || user.role !== "super_admin") {
    return <Navigate to="/" replace />;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Open Create Modal
  const handleOpenAddModal = (presetRole?: Role) => {
    setForm({
      name: "",
      email: "",
      password: "Password123!",
      role: presetRole || "editor",
      department: presetRole === "super_admin" ? "Digital Directorate" : "Central News Desk",
      phone: "",
      idNumber: "",
      bankDetails: "",
      specialisation: "",
      county: "Nairobi",
    });
    setMessage(null);
    setIsAddModalOpen(true);
  };

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setFormLoading(true);

    try {
      const emailTrimmed = form.email.trim().toLowerCase();
      let createdUid = `usr-${Date.now()}`;

      // 1. Create user in Firebase Auth safely via secondary app
      try {
        createdUid = await createSecondaryUser(emailTrimmed, form.password);
      } catch (fbErr: any) {
        console.warn("Secondary auth user creation notice (saving to Firestore):", fbErr);
      }

      // 2. Write to Firestore `users` collection
      const userPayload: any = {
        uid: createdUid,
        name: form.name.trim(),
        email: emailTrimmed,
        role: form.role,
        department: form.department.trim(),
        phone: form.phone.trim(),
        registeredAt: new Date().toISOString(),
        registeredBy: user?.name || user?.email || "Super Admin",
        status: "active",
      };

      if (form.role === "correspondent") {
        userPayload.idNumber = form.idNumber;
        userPayload.bankDetails = form.bankDetails;
        userPayload.specialisation = form.specialisation;
        userPayload.county = form.county;
      }

      try {
        await setDoc(doc(db, "users", createdUid), userPayload);
      } catch (fsErr) {
        console.warn("Firestore save notice:", fsErr);
      }

      // 3. Save to local custom users store
      const customUsers = loadStoredData<SystemUser[]>("byline_custom_users_v1", []);
      const newSystemUser: SystemUser = {
        id: createdUid,
        uid: createdUid,
        name: form.name.trim(),
        email: emailTrimmed,
        role: form.role,
        department: form.department.trim(),
        phone: form.phone.trim(),
        idNumber: form.idNumber.trim(),
        bankDetails: form.bankDetails.trim(),
        specialisation: form.specialisation.trim(),
        county: form.county,
        registeredAt: new Date().toISOString(),
        registeredBy: user?.name || "Super Admin",
        status: "active",
      };
      saveStoredData(
        "byline_custom_users_v1",
        [newSystemUser, ...customUsers.filter((u) => u.email.toLowerCase() !== emailTrimmed)]
      );

      // 4. If correspondent, sync to stored correspondents
      if (form.role === "correspondent") {
        const storedCorrs = loadStoredData<Correspondent[]>("byline_correspondents_v1", INITIAL_CORRESPONDENTS);
        const newCorr: Correspondent = {
          id: createdUid,
          name: form.name.trim(),
          email: emailTrimmed,
          phone: form.phone.trim(),
          idNumber: form.idNumber.trim(),
          bankDetails: form.bankDetails.trim(),
          specialisation: form.specialisation.trim(),
          county: form.county || "Nairobi",
          registeredAt: new Date().toISOString(),
          registeredBy: user?.name || "Super Admin",
        };
        const updated = [newCorr, ...storedCorrs.filter((c) => c.email.toLowerCase() !== emailTrimmed)];
        saveStoredData("byline_correspondents_v1", updated);
      }

      // Remove from deleted set if re-created
      const deletedEmails = loadStoredData<string[]>("byline_deleted_users_v1", []);
      saveStoredData("byline_deleted_users_v1", deletedEmails.filter((e) => e.toLowerCase() !== emailTrimmed));

      // 5. Dispatch welcome email and account activation details
      await sendUserWelcomeAndActivationEmail({
        name: form.name.trim(),
        email: emailTrimmed,
        role: form.role,
        roleTitle: ROLE_CONFIG[form.role]?.title,
        password: form.password,
        registeredBy: user?.name || "Super Admin",
      });

      setMessage({
        type: "success",
        text: `Successfully registered ${ROLE_CONFIG[form.role]?.title || form.role} account for ${form.name}. Verification link and credentials dispatched to ${emailTrimmed} for activation.`,
      });

      setIsAddModalOpen(false);
      await fetchAllUsers();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err?.message || "Failed to create user." });
    } finally {
      setFormLoading(false);
    }
  };

  // Resend Activation Email
  const handleResendActivation = async (u: SystemUser) => {
    setMessage(null);
    const res = await resendAccountActivation(u.email, u.name);
    setMessage({
      type: res.success ? "success" : "error",
      text: res.message,
    });
  };

  // Open Edit Modal
  const handleEditClick = (u: SystemUser) => {
    setEditingUser(u);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      department: u.department || "",
      phone: u.phone || "",
      idNumber: u.idNumber || "",
      bankDetails: u.bankDetails || "",
      specialisation: u.specialisation || "",
      county: u.county || "Nairobi",
    });
    setMessage(null);
  };

  // Save Edit User
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormLoading(true);
    setMessage(null);

    try {
      const emailLower = editingUser.email.toLowerCase();
      const targetDocId = editingUser.uid || editingUser.id || `usr-${emailLower}`;

      const updateData: any = {
        uid: targetDocId,
        name: form.name.trim(),
        email: emailLower,
        role: form.role,
        department: form.department.trim(),
        phone: form.phone.trim(),
        updatedAt: new Date().toISOString(),
      };

      if (form.role === "correspondent") {
        updateData.idNumber = form.idNumber.trim();
        updateData.bankDetails = form.bankDetails.trim();
        updateData.specialisation = form.specialisation.trim();
        updateData.county = form.county;
      }

      // 1. Write to Firestore
      try {
        await setDoc(doc(db, "users", targetDocId), updateData, { merge: true });
      } catch (fsErr) {
        console.warn("Firestore update error:", fsErr);
      }

      // 2. Save in persistent custom users store
      const customUsers = loadStoredData<SystemUser[]>("byline_custom_users_v1", []);
      const updatedSystemUser: SystemUser = {
        ...editingUser,
        name: form.name.trim(),
        role: form.role,
        department: form.department.trim(),
        phone: form.phone.trim(),
        idNumber: form.idNumber.trim(),
        bankDetails: form.bankDetails.trim(),
        specialisation: form.specialisation.trim(),
        county: form.county,
      };

      const newCustomList = [
        updatedSystemUser,
        ...customUsers.filter((u) => u.email.toLowerCase() !== emailLower),
      ];
      saveStoredData("byline_custom_users_v1", newCustomList);

      // 3. Update correspondents store
      const storedCorrs = loadStoredData<Correspondent[]>("byline_correspondents_v1", INITIAL_CORRESPONDENTS);
      if (form.role === "correspondent") {
        const existingCorr = storedCorrs.find((c) => c.email.toLowerCase() === emailLower);
        const updatedCorr: Correspondent = {
          id: existingCorr?.id || targetDocId,
          name: form.name.trim(),
          email: emailLower,
          phone: form.phone.trim(),
          idNumber: form.idNumber.trim(),
          bankDetails: form.bankDetails.trim(),
          specialisation: form.specialisation.trim(),
          county: form.county || "Nairobi",
          registeredAt: existingCorr?.registeredAt || new Date().toISOString(),
          registeredBy: existingCorr?.registeredBy || user?.name || "Super Admin",
        };
        saveStoredData(
          "byline_correspondents_v1",
          [updatedCorr, ...storedCorrs.filter((c) => c.email.toLowerCase() !== emailLower)]
        );
      } else {
        // If changed from correspondent to another role, remove from correspondents list
        saveStoredData(
          "byline_correspondents_v1",
          storedCorrs.filter((c) => c.email.toLowerCase() !== emailLower)
        );
      }

      // 4. Update state directly for immediate UI feedback
      setUsers((prev) =>
        prev.map((u) => (u.email.toLowerCase() === emailLower ? { ...u, ...updatedSystemUser } : u))
      );

      setMessage({
        type: "success",
        text: `Updated account for ${editingUser.email} (New Role: ${ROLE_CONFIG[form.role]?.title || form.role}).`,
      });

      setEditingUser(null);
      await fetchAllUsers();
    } catch (err: any) {
      console.error("Update error:", err);
      setMessage({ type: "error", text: err?.message || "Failed to update user." });
    } finally {
      setFormLoading(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (u: SystemUser) => {
    if (u.email.toLowerCase() === user.email.toLowerCase()) {
      alert("You cannot delete your own active Super Admin account.");
      return;
    }

    if (!window.confirm(`Are you sure you want to revoke access and delete ${u.name} (${u.email})?`)) {
      return;
    }

    try {
      const emailLower = u.email.toLowerCase();

      // 1. Add email and IDs to persistent deleted set
      const deletedEmails = loadStoredData<string[]>("byline_deleted_users_v1", []);
      if (!deletedEmails.map((e) => e.toLowerCase()).includes(emailLower)) {
        saveStoredData("byline_deleted_users_v1", [...deletedEmails, emailLower]);
      }

      // 2. Remove from Firestore
      try {
        if (u.uid) await deleteDoc(doc(db, "users", u.uid));
        if (u.id && u.id !== u.uid) await deleteDoc(doc(db, "users", u.id));
      } catch (fsErr) {
        console.warn("Firestore delete notice:", fsErr);
      }

      // 3. Remove from custom users store
      const customUsers = loadStoredData<SystemUser[]>("byline_custom_users_v1", []);
      saveStoredData(
        "byline_custom_users_v1",
        customUsers.filter((item) => item.email.toLowerCase() !== emailLower)
      );

      // 4. Remove from stored correspondents
      const storedCorrs = loadStoredData<Correspondent[]>("byline_correspondents_v1", INITIAL_CORRESPONDENTS);
      saveStoredData(
        "byline_correspondents_v1",
        storedCorrs.filter((c) => c.email.toLowerCase() !== emailLower)
      );

      // 5. Update local state immediately
      setUsers((prev) => prev.filter((item) => item.email.toLowerCase() !== emailLower));

      setMessage({ type: "success", text: `Revoked access and deleted user ${u.email}.` });
    } catch (err: any) {
      console.error("Delete error:", err);
      setMessage({ type: "error", text: err?.message || "Failed to delete user." });
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.phone && u.phone.includes(searchTerm));

    const matchesRole =
      selectedRoleFilter === "all"
        ? true
        : selectedRoleFilter === "leadership"
        ? ["super_admin", "managing_editor", "editor"].includes(u.role)
        : selectedRoleFilter === "finance_ops"
        ? ["finance", "digitalOps", "adManager"].includes(u.role)
        : u.role === selectedRoleFilter;

    return matchesSearch && matchesRole;
  });

  const superAdminsCount = users.filter((u) => u.role === "super_admin").length;
  const editorialCount = users.filter((u) => ["managing_editor", "editor"].includes(u.role)).length;
  const correspondentsCount = users.filter((u) => u.role === "correspondent").length;
  const financeOpsCount = users.filter((u) => ["finance", "digitalOps", "adManager"].includes(u.role)).length;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-brand-navy text-white p-6 rounded-2xl shadow-lg border-b-4 border-brand-gold flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-gold font-semibold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Super Admin &bull; System of Record
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">
            User Administration & Access Control
          </h1>
          <p className="text-xs sm:text-sm text-blue-200 mt-1">
            Manage all user accounts across KBC: Super Admins, Managing Editors, Desk Editors, Correspondents, and Finance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAllUsers()}
            disabled={refreshing}
            className="p-2.5 bg-blue-900/60 hover:bg-blue-900 text-blue-200 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Refresh user list"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => handleOpenAddModal()}
            className="bg-brand-gold hover:bg-yellow-500 text-slate-900 font-bold px-4 py-2.5 rounded-xl shadow transition text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between shadow-sm border ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-red-50 text-red-900 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {message.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User Statistics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Super Admins</p>
            <h3 className="text-xl font-black text-purple-700 mt-0.5">{superAdminsCount}</h3>
            <p className="text-[10px] text-gray-400">Chief Digital & IT</p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-700 rounded-lg">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Editorial Desk</p>
            <h3 className="text-xl font-black text-blue-700 mt-0.5">{editorialCount}</h3>
            <p className="text-[10px] text-gray-400">Managing & Desk Editors</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Correspondents</p>
            <h3 className="text-xl font-black text-emerald-700 mt-0.5">{correspondentsCount}</h3>
            <p className="text-[10px] text-gray-400">Field Reporters</p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Finance & Ops</p>
            <h3 className="text-xl font-black text-indigo-700 mt-0.5">{financeOpsCount}</h3>
            <p className="text-[10px] text-gray-400">Claims & Distribution</p>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-gray-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-gray-50/50">
          {/* Role Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            {[
              { id: "all", label: `All Users (${users.length})` },
              { id: "super_admin", label: "Super Admin" },
              { id: "managing_editor", label: "Managing Editor" },
              { id: "editor", label: "Desk Editor" },
              { id: "correspondent", label: "Correspondent" },
              { id: "finance_ops", label: "Finance & Ops" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedRoleFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedRoleFilter === tab.id
                    ? "bg-brand-navy text-white shadow-sm"
                    : "bg-white text-gray-600 hover:bg-gray-200/70 border border-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-navy bg-white shadow-sm"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-byline">
            <thead>
              <tr className="bg-brand-navy text-white text-xs font-bold uppercase tracking-wider border-b-2 border-brand-gold">
                <th className="p-4">Staff Member</th>
                <th className="p-4">Role & Permissions</th>
                <th className="p-4">Department / Bureau</th>
                <th className="p-4">Contact Phone</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs sm:text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-brand-navy" />
                      <span>Loading user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No users found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleMeta = ROLE_CONFIG[u.role] || {
                    title: u.role,
                    badgeClass: "bg-gray-100 text-gray-800 border-gray-300",
                    desc: "",
                  };
                  const isCurrent = u.email.toLowerCase() === user.email.toLowerCase();

                  return (
                    <tr key={u.id || u.email} className="hover:bg-blue-50/40 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-navy/10 text-brand-navy font-bold flex items-center justify-center text-xs shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-brand-gold text-slate-900 font-bold px-1.5 py-0.2 rounded">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <span>{u.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${roleMeta.badgeClass}`}
                        >
                          {roleMeta.title}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-1 max-w-xs">{roleMeta.desc}</p>
                      </td>

                      <td className="p-4">
                        <div className="text-slate-800 font-medium">{u.department || "KBC Digital Directorate"}</div>
                        {u.county && <span className="text-[10px] text-gray-400">County: {u.county}</span>}
                      </td>

                      <td className="p-4 text-gray-600">
                        {u.phone ? (
                          <span className="font-mono text-xs">{u.phone}</span>
                        ) : (
                          <span className="text-gray-400 italic">Not provided</span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResendActivation(u)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition cursor-pointer"
                            title="Resend activation & login email"
                          >
                            <Send className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleEditClick(u)}
                            className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                            title="Edit user details & role"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {!isCurrent && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition cursor-pointer"
                              title="Revoke user access"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create User */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-200 overflow-hidden my-8">
            <div className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between border-b-2 border-brand-gold">
              <div className="flex items-center gap-2 font-bold text-lg">
                <UserPlus className="w-5 h-5 text-brand-gold" />
                <span>Create System User Account</span>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-300 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. Samuel Ochieng"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-navy focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. sochieng@kbc.co.ke"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-navy focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">System Role *</label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-navy focus:outline-none font-medium"
                  >
                    <option value="super_admin">Super Admin (Head of Digital / Full Access)</option>
                    <option value="managing_editor">Managing Editor (Rate Card & Sign-offs)</option>
                    <option value="editor">Desk Editor (Assignments & Review)</option>
                    <option value="correspondent">Correspondent (Field Reporting & Invoicing)</option>
                    <option value="finance">Finance Controller (Claims Settlement)</option>
                    <option value="digitalOps">Digital Operations Lead (Broadcast Logs)</option>
                    <option value="adManager">Ad Operations Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Initial Password *</label>
                  <input
                    type="text"
                    name="password"
                    value={form.password}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-navy focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Department / Bureau</label>
                  <input
                    type="text"
                    name="department"
                    value={form.department}
                    onChange={handleInputChange}
                    placeholder="e.g. Central News Desk"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-navy focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleInputChange}
                    placeholder="+254 7XX XXX XXX"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-navy focus:outline-none"
                  />
                </div>
              </div>

              {/* Correspondent Special Fields */}
              {form.role === "correspondent" && (
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                  <div className="text-xs font-bold text-emerald-900 uppercase">
                    Correspondent Accreditation & Bank Profile
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Assigned County</label>
                      <input
                        type="text"
                        name="county"
                        value={form.county}
                        onChange={handleInputChange}
                        placeholder="e.g. Nakuru, Kisumu, Mombasa"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">National ID Number</label>
                      <input
                        type="text"
                        name="idNumber"
                        value={form.idNumber}
                        onChange={handleInputChange}
                        placeholder="e.g. 29381029"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Bank / Payment Details</label>
                    <input
                      type="text"
                      name="bankDetails"
                      value={form.bankDetails}
                      onChange={handleInputChange}
                      placeholder="e.g. KCB Bank - A/C 1184920491 (Nakuru Branch)"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Beat / Specialisation</label>
                    <input
                      type="text"
                      name="specialisation"
                      value={form.specialisation}
                      onChange={handleInputChange}
                      placeholder="e.g. Agriculture, Devolution, Regional Politics"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-brand-navy hover:bg-blue-950 text-white font-bold px-5 py-2 text-xs sm:text-sm rounded-lg shadow transition flex items-center gap-2 cursor-pointer"
                >
                  {formLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>{formLoading ? "Creating..." : "Create User Account"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User Role & Info */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-200 overflow-hidden my-8">
            <div className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between border-b-2 border-brand-gold">
              <div className="flex items-center gap-2 font-bold text-lg">
                <Edit3 className="w-5 h-5 text-brand-gold" />
                <span>Edit User Account: {editingUser.email}</span>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-gray-300 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-navy focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">System Role *</label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-navy focus:outline-none font-medium"
                  >
                    <option value="super_admin">Super Admin (Full Platform Access)</option>
                    <option value="managing_editor">Managing Editor</option>
                    <option value="editor">Desk Editor</option>
                    <option value="correspondent">Correspondent</option>
                    <option value="finance">Finance Controller</option>
                    <option value="digitalOps">Digital Operations Lead</option>
                    <option value="adManager">Ad Operations Manager</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Department / Bureau</label>
                  <input
                    type="text"
                    name="department"
                    value={form.department}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-navy focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-navy focus:outline-none"
                  />
                </div>
              </div>

              {form.role === "correspondent" && (
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                  <div className="text-xs font-bold text-emerald-900 uppercase">
                    Correspondent Accreditation & Bank Profile
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">County</label>
                      <input
                        type="text"
                        name="county"
                        value={form.county}
                        onChange={handleInputChange}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">National ID</label>
                      <input
                        type="text"
                        name="idNumber"
                        value={form.idNumber}
                        onChange={handleInputChange}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Bank Details</label>
                    <input
                      type="text"
                      name="bankDetails"
                      value={form.bankDetails}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Specialisation / Beat</label>
                    <input
                      type="text"
                      name="specialisation"
                      value={form.specialisation}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-brand-navy hover:bg-blue-950 text-white font-bold px-5 py-2 text-xs sm:text-sm rounded-lg shadow transition flex items-center gap-2 cursor-pointer"
                >
                  {formLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{formLoading ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
