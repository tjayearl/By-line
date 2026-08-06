import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Clock, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";

interface AssignmentRow {
  id: string;
  title: string;
  deadline: string;
  status: string;
}

export default function CorrespondentDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(collection(db, "assignments"), where("correspondentId", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const rows = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title ?? "Untitled assignment",
          deadline: data.deadline ?? "No deadline",
          status: data.status ?? "pending_review",
        };
      });
      setAssignments(rows);
    });

    return unsub;
  }, [user?.uid]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">My Assignments</h1>
      <div className="space-y-3">
        {assignments.map((a) => (
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
