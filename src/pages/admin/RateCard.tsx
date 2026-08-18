import { useState, useEffect } from "react";
import { Settings, Save, CheckCircle2, Calculator } from "lucide-react";
import { loadStoredData, saveStoredData, DEFAULT_RATES } from "../../lib/dataStore";
import type { Platform, RateCardEntry } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function RateCard() {
  const [rates, setRates] = useState<RateCardEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  // Test Multi-platform sum calculator state
  const [selectedCalcPlatforms, setSelectedCalcPlatforms] = useState<Platform[]>(["tv_national", "radio_national"]);

  const { user } = useAuth();

// ONLY Super Admin and Managing Editor can access the Rate Card
if (!user || !["super_admin", "managing_editor"].includes(user.role)) {
  return <Navigate to="/" replace />;
}

  useEffect(() => {
    setRates(loadStoredData("byline_rates_v1", DEFAULT_RATES));
  }, []);

  const updateRate = (platform: Platform, value: number) => {
    setRates(rates.map((r) => (r.platform === platform ? { ...r, rateKES: value } : r)));
  };

  const handleSave = () => {
    saveStoredData("byline_rates_v1", rates);
    setMessage("Rate Card successfully updated & active across all automatic payment calculations!");
  };

  const toggleCalcPlatform = (p: Platform) => {
    if (selectedCalcPlatforms.includes(p)) {
      setSelectedCalcPlatforms(selectedCalcPlatforms.filter((item) => item !== p));
    } else {
      setSelectedCalcPlatforms([...selectedCalcPlatforms, p]);
    }
  };

  const calculatedSum = selectedCalcPlatforms.reduce((sum, p) => {
    const item = rates.find((r) => r.platform === p);
    return sum + (item ? item.rateKES : 0);
  }, 0);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-brand-navy text-white p-6 rounded-2xl shadow-md border-b-4 border-brand-gold flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-gold font-semibold text-xs uppercase tracking-wider">
            <Settings className="w-4 h-4" /> Section 6 & US-02 Rate Engine
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Rate Card Management Interface</h1>
          <p className="text-xs text-blue-200 mt-1">
            Set and update platform compensation rates in Kenya Shillings (KES). Applied automatically upon editorial confirmation.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="bg-brand-gold hover:bg-yellow-500 text-slate-900 font-bold px-4 py-2.5 rounded-xl shadow text-xs sm:text-sm flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Active Rate Card</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Rate Card Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between border-b-2 border-brand-gold">
            <h2 className="font-bold text-lg">Active Platform Rates (KES)</h2>
            <span className="text-xs text-brand-gold font-semibold">Managing Editor / Super Admin</span>
          </div>

          <div className="divide-y flex-1">
            {rates.map((r) => (
              <div key={r.platform} className="p-4 hover:bg-blue-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-brand-navy text-sm">{r.label}</span>
                    <span className="bg-blue-100 text-brand-navy text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                      {r.platform}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{r.notes}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-gray-500">KES</span>
                  <input
                    type="number"
                    value={r.rateKES}
                    onChange={(e) => updateRate(r.platform, Number(e.target.value))}
                    className="w-32 border-2 border-gray-300 focus:border-brand-navy font-mono font-bold text-right rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-gray-50"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-gray-50 border-t flex items-center justify-between">
            <span className="text-xs text-gray-500">Editable by Managing Editor or Super Admin</span>
            <button
              onClick={handleSave}
              className="bg-brand-navy hover:bg-blue-900 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow"
            >
              <Save className="w-3.5 h-3.5 text-brand-gold" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Multi-platform Sum Engine Demo (Section 6 requirement) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-brand-navy font-bold text-base border-b pb-2">
              <Calculator className="w-5 h-5 text-brand-gold" />
              <span>Multi-Platform Auto-Sum Calculator</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              If a single story airs on multiple platforms (e.g. both TV National and Radio National), Byline's payment calculation engine automatically sums all active platform rates:
            </p>

            <div className="space-y-2">
              {rates.map((r) => {
                const isSelected = selectedCalcPlatforms.includes(r.platform);
                return (
                  <button
                    type="button"
                    key={r.platform}
                    onClick={() => toggleCalcPlatform(r.platform)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition ${
                      isSelected
                        ? "bg-brand-navy text-white border-brand-navy shadow-sm"
                        : "bg-gray-50 text-slate-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>{r.label}</span>
                    <span className={`font-mono font-bold ${isSelected ? "text-brand-gold" : "text-brand-teal"}`}>
                      + KES {r.rateKES.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="bg-brand-gold text-slate-900 p-4 rounded-xl shadow border border-yellow-600 flex items-center justify-between mt-4">
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider block">Calculated Multi-Platform Total</span>
                <span className="text-xs font-medium text-slate-800">
                  {selectedCalcPlatforms.length} platform(s) selected
                </span>
              </div>
              <span className="text-2xl font-black">
                KES {calculatedSum.toLocaleString()}
              </span>
            </div>
          </div>

          {message && (
            <div className="p-4 bg-brand-teal text-white rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
