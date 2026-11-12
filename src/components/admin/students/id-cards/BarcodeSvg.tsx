import React from "react";

interface BarcodeSvgProps {
  value: string;
  height?: number;
  width?: number;
  className?: string;
  showText?: boolean;
}

// Standard Code 39 character patterns (width units: 1 = narrow, 2.5 = wide)
// Narrow bar = 1, Wide bar = 2.5, Narrow space = 1, Wide space = 2.5
const CODE39_PATTERNS: Record<string, string> = {
  "0": "101001101101",
  "1": "110100101011",
  "2": "101100101011",
  "3": "110110010101",
  "4": "101001101011",
  "5": "110100110101",
  "6": "101100110101",
  "7": "101001011011",
  "8": "110100101101",
  "9": "101100101101",
  A: "110101001011",
  B: "101101001011",
  C: "110110100101",
  D: "101011001011",
  E: "110101100101",
  F: "101101100101",
  G: "101010011011",
  H: "110101001101",
  I: "101101001101",
  J: "101011001101",
  K: "110101010011",
  L: "101101010011",
  M: "110110101001",
  N: "101011010011",
  O: "110101101001",
  P: "101101101001",
  Q: "101010110011",
  R: "110101011001",
  S: "101101011001",
  T: "101011011001",
  U: "110010101011",
  V: "100110101011",
  W: "110011010101",
  X: "100101101011",
  Y: "110010110101",
  Z: "100110110101",
  "-": "100101011011",
  ".": "110010101101",
  " ": "100110101101",
  "*": "100101101101", // Start / Stop delimiter
};

/**
 * High-precision Vector Barcode component adhering to Code 39 standard.
 * Renders crisp, scannable bars with correct quiet zones and proportional scaling.
 */
export const BarcodeSvg: React.FC<BarcodeSvgProps> = ({
  value,
  height = 28,
  width = 160,
  className = "",
  showText = false,
}) => {
  const cleanVal = (value || "MZK-2026-0001").toUpperCase().replace(/[^0-9A-Z\-\. ]/g, "-");
  const fullSequence = `*${cleanVal}*`;

  // Build binary string (1 = bar, 0 = space)
  let binaryString = "00000"; // Leading quiet zone
  for (let i = 0; i < fullSequence.length; i++) {
    const char = fullSequence[i];
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS["-"];
    binaryString += pattern + "0"; // Inter-character space
  }
  binaryString += "0000"; // Trailing quiet zone

  const totalBits = binaryString.length;
  const bitWidth = width / totalBits;

  // Group consecutive 1s into rectangles
  const rects: { x: number; w: number }[] = [];
  let inBar = false;
  let barStart = 0;

  for (let i = 0; i < totalBits; i++) {
    if (binaryString[i] === "1") {
      if (!inBar) {
        inBar = true;
        barStart = i;
      }
    } else {
      if (inBar) {
        inBar = false;
        rects.push({
          x: barStart * bitWidth,
          w: (i - barStart) * bitWidth,
        });
      }
    }
  }
  if (inBar) {
    rects.push({
      x: barStart * bitWidth,
      w: (totalBits - barStart) * bitWidth,
    });
  }

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
        className="text-slate-900"
        style={{ shapeRendering: "crispEdges" }}
      >
        {rects.map((r, idx) => (
          <rect
            key={idx}
            x={r.x}
            y={0}
            width={r.w}
            height={height}
            fill="currentColor"
          />
        ))}
      </svg>
      {showText && (
        <span className="font-mono text-[7px] font-semibold text-slate-700 tracking-widest mt-0.5">
          {cleanVal}
        </span>
      )}
    </div>
  );
};
