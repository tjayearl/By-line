import { useEffect, useState } from "react";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { db } from "../../lib/firebase";

interface SubmissionRow {
  id: string;
  title: string;
  correspondent: string;
  status: string;
}

export default function ReviewSubmissions() {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "submissions"), (snapshot) => {
      const rows = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title ?? "Untitled submission",
          correspondent: data.correspondentName ?? "Unknown correspondent",
          status: data.status ?? "pending_review",
        };
      });
      setSubmissions(rows);
    });

    return unsub;
  }, []);

  const updateStatus = async (submissionId: string, status: string) => {
    try {
      await updateDoc(doc(db, "submissions", submissionId), { status });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">Review Submissions</h1>
      <div className="space-y-3">
        {submissions.map((s) => (
          <div key={s.id} className="bg-white p-4 rounded-lg border shadow-sm flex items-center justify-between">
            <div>
              <p className="font-medium">{s.title}</p>
              <p className="text-sm text-gray-500">{s.correspondent}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => updateStatus(s.id, "approved")} className="flex items-center gap-1 text-green-600 hover:underline">
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
              <button onClick={() => updateStatus(s.id, "revision_needed")} className="flex items-center gap-1 text-yellow-600 hover:underline">
                <RotateCcw className="w-4 h-4" /> Revise
              </button>
              <button onClick={() => updateStatus(s.id, "declined")} className="flex items-center gap-1 text-red-600 hover:underline">
                <XCircle className="w-4 h-4" /> Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
