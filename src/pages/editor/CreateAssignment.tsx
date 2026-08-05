import { useState } from "react";
import { FilePlus } from "lucide-react";
import type { Platform } from "../../types";

const PLATFORMS: Platform[] = ["tv_national", "tv_regional", "radio_national", "radio_vernacular", "website", "social"];

export default function CreateAssignment() {
  const [form, setForm] = useState({
    title: "", brief: "", targetPlatform: "website" as Platform, deadline: "", correspondentId: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("New assignment:", form);
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-bold flex items-center gap-2 mb-4">
        <FilePlus className="w-5 h-5" /> Create Assignment
      </h1>
      <form onSubmit={handleSubmit} className="space-y-3 bg-white p-6 rounded-lg shadow-sm border">
        <input
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full border rounded-md px-3 py-2"
          required
        />
        <textarea
          placeholder="Brief"
          value={form.brief}
          onChange={(e) => setForm({ ...form, brief: e.target.value })}
          className="w-full border rounded-md px-3 py-2"
          rows={4}
          required
        />
        <select
          value={form.targetPlatform}
          onChange={(e) => setForm({ ...form, targetPlatform: e.target.value as Platform })}
          className="w-full border rounded-md px-3 py-2"
        >
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input
          type="date"
          value={form.deadline}
          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          className="w-full border rounded-md px-3 py-2"
          required
        />
        <input
          placeholder="Correspondent ID"
          value={form.correspondentId}
          onChange={(e) => setForm({ ...form, correspondentId: e.target.value })}
          className="w-full border rounded-md px-3 py-2"
          required
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Create & Dispatch
        </button>
      </form>
    </div>
  );
}
