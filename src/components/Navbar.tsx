import { LogOut, Newspaper } from "lucide-react";
import { signOut } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";

export default function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 font-bold text-lg">
        <Newspaper className="w-5 h-5 text-blue-600" />
        Byline
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-500">{user?.name || user?.email} - {user?.role}</span>
        <button onClick={() => signOut(auth)} className="flex items-center gap-1 text-red-600 hover:underline">
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </nav>
  );
}
