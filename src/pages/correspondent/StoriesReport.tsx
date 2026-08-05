import { FileDown, Banknote } from "lucide-react";

const mockClaims = [
  { id: "1", title: "County Budget Story", platform: "Website", amount: 3000, status: "pending" },
];

export default function StoriesReport() {
  const total = mockClaims.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Monthly Stories Report</h1>
        <button className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700">
          <FileDown className="w-4 h-4" /> Download PDF
        </button>
      </div>
      <div className="bg-white rounded-lg border shadow-sm divide-y">
        {mockClaims.map((c) => (
          <div key={c.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{c.title}</p>
              <p className="text-sm text-gray-500">{c.platform}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-medium">
                <Banknote className="w-4 h-4" /> KES {c.amount}
              </span>
              <span className={c.status === "paid" ? "text-green-600" : "text-yellow-600"}>
                {c.status}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-right mt-3 font-bold">Total: KES {total}</p>
    </div>
  );
}
