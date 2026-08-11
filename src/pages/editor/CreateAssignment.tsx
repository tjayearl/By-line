import { useState, useEffect } from "react";
import { FilePlus, Send } from "lucide-react";
import { loadStoredData, saveStoredData, INITIAL_ASSIGNMENTS, INITIAL_CORRESPONDENTS } from "../../lib/dataStore";
import type { Assignment, Correspondent, Platform } from "../../types";
import EditorialDirectiveNotice from "../../components/EditorialDirectiveNotice";

const PLATFORM_OPTIONS: { key: Platform; label: string; icon: string }[] = [
  { key: "tv_national", label: "TV Package (National)", icon: "📺" },
  { key: "tv_regional", label: "TV Package (Regional/Vernacular)", icon: "📡" },
  { key: "radio_national", label: "Radio Clip (National)", icon: "📻" },
  { key: "radio_vernacular", label: "Radio Clip (Vernacular)", icon: "🎙️" },
  { key: "website", label: "Website Article", icon: "🌐" },
  { key: "social", label: "Social Media Post", icon: "📱" },
];

export default function CreateAssignment() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [correspondents, setCorrespondents] = useState<Correspondent[]>([]);
  const [form, setForm] = useState({
    title: "",
    brief: "",
    deadline: "",
    correspondentId: "",
  });
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["tv_national"]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setAssignments(loadStoredData("byline_assignments_v1", INITIAL_ASSIGNMENTS));
    const loadedCorrs = loadStoredData("byline_correspondents_v1", INITIAL_CORRESPONDENTS);
    setCorrespondents(loadedCorrs);
    if (loadedCorrs.length > 0) {
      setForm((prev) => ({ ...prev, correspondentId: loadedCorrs[0].id }));
    }
  }, []);

  const togglePlatform = (p: Platform) => {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((item) => item !== p));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.correspondentId) return;

    const assignedCorr = correspondents.find((c) => c.id === form.correspondentId);

    const newAssignment: Assignment = {
      id: `ASG-2026-${String(assignments.length + 1).padStart(3, "0")}`,
      title: form.title,
      brief: form.brief,
      targetPlatforms: selectedPlatforms,
      deadline: form.deadline || new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
      correspondentId: form.correspondentId,
      correspondentName: assignedCorr ? assignedCorr.name : "Assigned Correspondent",
      assignedBy: "Desk Editor",
      createdAt: new Date().toISOString(),
      status: "assigned",
    };

    const updated = [newAssignment, ...assignments];
    setAssignments(updated);
    saveStoredData("byline_assignments_v1", updated);

    setMessage(`Assignment "${newAssignment.title}" successfully dispatched to ${newAssignment.correspondentName}. Notification logged!`);
    setForm({ title: "", brief: "", deadline: "", correspondentId: correspondents[0]?.id || "" });
    setSelectedPlatforms(["tv_national"]);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-brand-navy text-white p-6 rounded-2xl shadow-md border-b-4 border-brand-gold flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-gold font-semibold text-xs uppercase tracking-wider">
            <FilePlus className="w-4 h-4" /> US-04 Commissioning Workflow
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Create Story Assignment</h1>
          <p className="text-xs text-blue-200 mt-1">
            Dispatch formal story assignments to registered field correspondents with platform targets.
          </p>
        </div>
      </div>

      <EditorialDirectiveNotice />

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Assignment Form */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-brand-navy mb-4 flex items-center gap-2 border-b pb-2">
            <Send className="w-5 h-5 text-brand-gold" />
            <span>Story Commission Details</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assign To Correspondent</label>
              <select
                value={form.correspondentId}
                onChange={(e) => setForm({ ...form, correspondentId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy bg-white"
                required
              >
                {correspondents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.county || "Correspondent"}) - {c.specialisation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Story Title / Headline</label>
              <input
                placeholder="e.g. Nakuru Pyrethrum Farmers Revival Initiative"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Editorial Brief & Angle</label>
              <textarea
                placeholder="Detailed coverage instructions, required interviews, soundbites, or key focus points..."
                value={form.brief}
                onChange={(e) => setForm({ ...form, brief: e.target.value })}
                rows={4}
                className="w-full border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Target Platform(s)</label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORM_OPTIONS.map((p) => {
                  const isSelected = selectedPlatforms.includes(p.key);
                  return (
                    <button
                      type="button"
                      key={p.key}
                      onClick={() => togglePlatform(p.key)}
                      className={`p-2 rounded-lg border text-left text-xs font-semibold flex items-center gap-1.5 transition ${
                        isSelected
                          ? "bg-brand-navy text-white border-brand-navy shadow-sm"
                          : "bg-gray-50 text-slate-700 hover:bg-gray-100"
                      }`}
                    >
                      <span>{p.icon}</span>
                      <span className="truncate">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Submission Deadline</label>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-brand-navy hover:bg-blue-900 text-white font-bold py-2.5 rounded-xl shadow transition flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4 text-brand-gold" />
              <span>Dispatch Story Assignment</span>
            </button>
          </form>

          {message && (
            <div className="mt-4 p-3 bg-brand-teal text-white rounded-lg text-xs font-semibold">
              {message}
            </div>
          )}
        </div>

        {/* Dispatched Assignments List Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between border-b-2 border-brand-gold">
            <h2 className="font-bold text-lg">Dispatched Assignments ({assignments.length})</h2>
            <span className="text-xs text-brand-gold font-semibold">Live Commissions</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse table-byline">
              <thead>
                <tr className="bg-gray-100 text-xs font-bold uppercase tracking-wider text-slate-700 border-b">
                  <th className="p-3.5">ID & Title</th>
                  <th className="p-3.5">Assigned Reporter</th>
                  <th className="p-3.5">Target Platforms</th>
                  <th className="p-3.5">Deadline</th>
                  <th className="p-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {assignments.map((asg) => (
                  <tr key={asg.id} className="hover:bg-blue-50/40 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-brand-navy text-sm">{asg.title}</div>
                      <div className="text-gray-500 font-mono text-[11px] mt-0.5">{asg.id}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-slate-800">{asg.correspondentName}</span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {asg.targetPlatforms?.map((p) => (
                          <span key={p} className="bg-blue-100 text-brand-navy text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                            {p.replace("_", " ").toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5 text-gray-600 font-medium">
                      {new Date(asg.deadline).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right">
                      {asg.status === "completed" && (
                        <span className="bg-brand-teal text-white text-[10px] font-bold px-2 py-1 rounded-full">
                          Completed
                        </span>
                      )}
                      {asg.status === "submitted" && (
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                          Filed
                        </span>
                      )}
                      {asg.status === "assigned" && (
                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                          Assigned
                        </span>
                      )}
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
