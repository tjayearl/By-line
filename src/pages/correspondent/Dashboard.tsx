import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, UploadCloud, ArrowRight } from "lucide-react";
import { loadStoredData, INITIAL_ASSIGNMENTS } from "../../lib/dataStore";
import { useAuth } from "../../context/AuthContext";
import type { Assignment } from "../../types";
import EditorialDirectiveNotice from "../../components/EditorialDirectiveNotice";

export default function CorrespondentDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    const loadedAsg = loadStoredData("byline_assignments_v1", INITIAL_ASSIGNMENTS);
    setAssignments(loadedAsg);
  }, []);

  const myAssignments = assignments.filter((a) => a.correspondentId === user?.uid || true);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-brand-navy text-white p-6 rounded-2xl shadow-md border-b-4 border-brand-gold flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-gold font-semibold text-xs uppercase tracking-wider">
            <Clock className="w-4 h-4" /> US-05 Field Reporter Assignments Portal
          </div>
          <h1 className="text-2xl font-black text-white mt-1">My Assigned Stories</h1>
          <p className="text-xs text-blue-200 mt-1">
            Review commissioned story briefs, deadlines, and target platforms.
          </p>
        </div>

        <Link
          to="/submit"
          className="bg-brand-gold hover:bg-yellow-500 text-slate-900 font-bold px-4 py-2.5 rounded-xl shadow text-xs sm:text-sm flex items-center gap-2"
        >
          <UploadCloud className="w-4 h-4" />
          <span>File Story Submission</span>
        </Link>
      </div>

      <EditorialDirectiveNotice />

      {/* Assignments List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between border-b-2 border-brand-gold">
          <h2 className="font-bold text-lg">Commissioned Story Assignments ({myAssignments.length})</h2>
          <span className="text-xs text-brand-gold font-semibold">Field Assignments</span>
        </div>

        <div className="divide-y">
          {myAssignments.map((asg) => (
            <div key={asg.id} className="p-6 hover:bg-blue-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="bg-brand-navy text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                    {asg.id}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">Assigned by: {asg.assignedBy}</span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{asg.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed bg-brand-offwhite p-3 rounded-xl border">
                  {asg.brief}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-bold text-slate-700">Target Platforms:</span>
                  {asg.targetPlatforms?.map((p) => (
                    <span key={p} className="bg-blue-100 text-brand-navy text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                      {p.replace("_", " ").toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Filing Deadline</span>
                  <span className="text-xs font-bold text-brand-red">
                    {new Date(asg.deadline).toLocaleString()}
                  </span>
                </div>

                <Link
                  to="/submit"
                  className="bg-brand-navy hover:bg-blue-900 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow transition"
                >
                  <span>Submit Filing</span>
                  <ArrowRight className="w-3.5 h-3.5 text-brand-gold" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
