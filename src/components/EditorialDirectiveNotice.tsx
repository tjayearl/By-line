import { AlertTriangle } from "lucide-react";

export default function EditorialDirectiveNotice() {
  return (
    <div className="bg-brand-red text-white p-4 rounded-xl shadow-md border-l-8 border-brand-gold mb-6">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-white/10 rounded-lg shrink-0 mt-0.5">
          <AlertTriangle className="w-6 h-6 text-brand-gold" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg uppercase tracking-wide text-white">
              Editorial Directive — Don't Start Reporting Without 3 Things:
            </h3>
            <span className="bg-brand-gold text-slate-900 text-xs px-2 py-0.5 rounded font-black uppercase">
              Mandatory
            </span>
          </div>
          <p className="text-sm text-red-100 mt-1">
            KBC newsroom compliance policy requires every freelance filing to have verified commissioning metadata before field activity begins:
          </p>
          <ul className="mt-2 grid sm:grid-cols-3 gap-2 text-xs font-semibold">
            <li className="bg-black/20 p-2 rounded flex items-center gap-2 border border-white/10">
              <span className="w-5 h-5 bg-brand-gold text-slate-900 rounded-full flex items-center justify-center font-bold text-xs shrink-0">1</span>
              <span>Commissioned Assignment (Byline ID)</span>
            </li>
            <li className="bg-black/20 p-2 rounded flex items-center gap-2 border border-white/10">
              <span className="w-5 h-5 bg-brand-gold text-slate-900 rounded-full flex items-center justify-center font-bold text-xs shrink-0">2</span>
              <span>Target Platform Target (TV, Radio, Web, Social)</span>
            </li>
            <li className="bg-black/20 p-2 rounded flex items-center gap-2 border border-white/10">
              <span className="w-5 h-5 bg-brand-gold text-slate-900 rounded-full flex items-center justify-center font-bold text-xs shrink-0">3</span>
              <span>Approved Filing Deadline</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
