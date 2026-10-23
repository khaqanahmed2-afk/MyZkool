import React from "react";
import { ArrowLeft } from "lucide-react";

export interface TransportPageHeaderProps {
  onBack: () => void;
  title: string;
  description: string;
  badge?: React.ReactNode;
}

export const TransportPageHeader: React.FC<TransportPageHeaderProps> = ({
  onBack,
  title,
  description,
  badge,
}) => {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6EAF3] bg-white text-xs font-bold text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-50 shadow-sm transition-colors cursor-pointer"
        title="Return to Transport Dashboard"
      >
        <ArrowLeft className="w-4 h-4 text-[#2158E0]" />
        <span>Back to Transport</span>
      </button>

      <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-[#141A2E] tracking-tight">
            {title}
          </h1>
          {badge}
        </div>
        <p className="text-xs text-[#5B6478]">
          {description}
        </p>
      </div>
    </div>
  );
};

export default TransportPageHeader;
