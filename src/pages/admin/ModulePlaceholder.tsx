import React from "react";
import { useLocation } from "react-router-dom";
import { Wrench } from "lucide-react";

export default function ModulePlaceholder() {
  const location = useLocation();
  const pathParts = location.pathname.split("/").filter(Boolean);
  const moduleName = pathParts.length > 1 ? pathParts[1] : "Module";
  const formattedName =
    moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-sm p-10 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 border border-indigo-100">
          <Wrench className="w-8 h-8 text-indigo-600" />
        </div>

        <h1 className="text-2xl font-bold text-[#141A2E] font-heading mb-2">
          {formattedName} Management
        </h1>

        <p className="text-[#5B6478] max-w-md mx-auto mb-6">
          This module is being prepared for the next development phase. Setup
          your foundational school data in the meantime.
        </p>

        <button className="px-5 py-2.5 bg-[#F0F5FE] text-[#2158E0] hover:bg-blue-100 font-semibold rounded-lg text-sm transition-colors cursor-not-allowed">
          Coming Soon
        </button>
      </div>
    </div>
  );
}
