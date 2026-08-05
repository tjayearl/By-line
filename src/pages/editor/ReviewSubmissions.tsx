import { CheckCircle, XCircle, RotateCcw } from "lucide-react";

const mockSubmissions = [
  { id: "1", title: "County Budget Story", correspondent: "Jane W.", status: "pending_review" },
];

export default function ReviewSubmissions() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">Review Submissions</h1>
      <div className="space-y-3">
        {mockSubmissions.map((s) => (
          <div key={s.id} className="bg-white p-4 rounded-lg border shadow-sm flex items-center justify-between">
            <div>
              <p className="font-medium">{s.title}</p>
              <p className="text-sm text-gray-500">{s.correspondent}</p>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-1 text-green-600 hover:underline">
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
              <button className="flex items-center gap-1 text-yellow-600 hover:underline">
                <RotateCcw className="w-4 h-4" /> Revise
              </button>
              <button className="flex items-center gap-1 text-red-600 hover:underline">
                <XCircle className="w-4 h-4" /> Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
