import { Clock, CheckCircle2 } from "lucide-react";

const mockAssignments = [
  { id: "1", title: "County Budget Story", deadline: "2026-08-10", status: "In Progress" },
];

export default function CorrespondentDashboard() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">My Assignments</h1>
      <div className="space-y-3">
        {mockAssignments.map((a) => (
          <div key={a.id} className="bg-white p-4 rounded-lg border shadow-sm flex items-center justify-between">
            <div>
              <p className="font-medium">{a.title}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Clock className="w-4 h-4" /> Due {a.deadline}
              </p>
            </div>
            <span className="text-sm text-blue-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> {a.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
