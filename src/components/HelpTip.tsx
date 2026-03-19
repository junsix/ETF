import { useState } from "react";

export default function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block ml-1">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-gray-400 border border-gray-300 rounded-full hover:text-gray-600 hover:border-gray-400 transition"
      >
        ?
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 left-0 top-6 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-xs text-gray-600 leading-relaxed">
            {text}
          </div>
        </>
      )}
    </span>
  );
}
