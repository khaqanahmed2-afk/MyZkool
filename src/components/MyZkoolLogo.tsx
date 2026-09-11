import React from "react";

interface MyZkoolLogoProps {
  size?: number | string;
  className?: string;
  showText?: boolean;
  textColor?: "dark" | "light";
}

export const MyZkoolLogo: React.FC<MyZkoolLogoProps> = ({
  size = 36,
  className = "",
  showText = true,
  textColor = "dark",
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Official MZ Circle Badge */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 group-hover:scale-105"
        aria-label="MyZkool Logo"
      >
        <circle cx="256" cy="256" r="236" fill="#1E5AF6" />
        <path
          d="M 132,368 L 132,184 L 236,278 L 340,184 L 388,226 L 260,356 L 392,356"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="46"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showText && (
        <span className="font-heading text-2xl font-bold tracking-tight select-none">
          <span className={textColor === "light" ? "text-white" : "text-[#141A2E]"}>
            My
          </span>
          <span className="text-[#1E5AF6]">Zkool</span>
        </span>
      )}
    </div>
  );
};
