import { useState } from "react";
import { Settings } from "lucide-react";
import type { Platform } from "../../types";

const initialRates: { platform: Platform; label: string; rateKES: number }[] = [
  { platform: "tv_national", label: "TV Package (National)", rateKES: 0 },
  { platform: "tv_regional", label: "TV Package (Regional/Vernacular)", rateKES: 0 },
  { platform: "radio_national", label: "Radio Clip (National)", rateKES: 0 },
  { platform: "radio_vernacular", label: "Radio Clip (Vernacular Station)", rateKES: 0 },
  { platform: "website", label: "Website Article", rateKES: 0 },
  { platform: "social", label: "Social Media Post", rateKES: 0 },
];

export default function RateCard() {
  const [rates, setRates] = useState(initialRates);

  const updateRate = (platform: Platform, value: number) => {
    setRates(rates.map((r) => (r.platform === platform ? { ...r, rateKES: value } : r)));
  };

  const handleSave = () => {
    console.log("Saved rates:", rates);
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-bold flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5" /> Rate Card
      </h1>
      <div className="bg-white rounded-lg border shadow-sm divide-y">
        {rates.map((r) => (
          <div key={r.platform} className="p-4 flex items-center justify-between">
            <span>{r.label}</span>
            <input
              type="number"
              value={r.rateKES}
              onChange={(e) => updateRate(r.platform, Number(e.target.value))}
              className="w-28 border rounded-md px-2 py-1 text-right"
            />
          </div>
        ))}
      </div>
      <button onClick={handleSave} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
        Save Rate Card
      </button>
    </div>
  );
}
