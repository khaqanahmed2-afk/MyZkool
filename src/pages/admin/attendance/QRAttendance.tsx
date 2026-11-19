import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  QrCode,
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ArrowLeft,
  Volume2,
  VolumeX,
  Keyboard,
  RefreshCw,
  Search,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { AttendanceNavHeader } from "../../../components/admin/attendance/AttendanceNavHeader";
import {
  scanQRAttendance,
  getTodayDateString,
} from "../../../services/attendanceService";
import type { QRAttendanceScanResult, AttendanceStatus } from "../../../types/attendance";

// Helper: Synthesize audio chime on scan
function playChime(success: boolean) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      // Pleasant high double beep
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08); // D6
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else {
      // Low buzz error tone
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {
    // AudioContext not allowed or unsupported; safe fallback
  }
}

export function QRAttendance() {
  const { school } = useAuth();
  const [date, setDate] = useState<string>(getTodayDateString());
  const [scanStatus, setScanStatus] = useState<AttendanceStatus>("present");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Manual / Handheld Scanner Input
  const [manualToken, setManualToken] = useState("");
  const [processing, setProcessing] = useState(false);

  // Live Results History
  const [recentScans, setRecentScans] = useState<
    Array<QRAttendanceScanResult & { timestamp: string }>
  >([]);
  const [lastResult, setLastResult] = useState<QRAttendanceScanResult | null>(null);

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);

      // Start Barcode Detection Loop if supported
      startScanningLoop();
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(
        err.message || "Failed to access camera. Please check browser permissions."
      );
      setCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Process a detected QR token
  const lastProcessedTokenRef = useRef<{ token: string; time: number } | null>(null);

  const processToken = useCallback(
    async (rawToken: string) => {
      const cleanToken = rawToken.trim();
      if (!cleanToken || !school?.id || processing) return;

      // Debounce same token within 3 seconds
      const now = Date.now();
      if (
        lastProcessedTokenRef.current &&
        lastProcessedTokenRef.current.token === cleanToken &&
        now - lastProcessedTokenRef.current.time < 3000
      ) {
        return;
      }
      lastProcessedTokenRef.current = { token: cleanToken, time: now };

      setProcessing(true);
      try {
        const result = await scanQRAttendance({
          schoolId: school.id,
          verificationToken: cleanToken,
          date,
          status: scanStatus,
        });

        setLastResult(result);

        if (soundEnabled) {
          playChime(result.success);
        }

        const scanLog = {
          ...result,
          timestamp: new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        };

        setRecentScans((prev) => [scanLog, ...prev.slice(0, 19)]);
      } catch (err: any) {
        console.error("Scan processing error:", err);
        const errResult: QRAttendanceScanResult = {
          success: false,
          code: "ERROR",
          message: err?.message || "Failed to process scan.",
        };
        setLastResult(errResult);
        if (soundEnabled) playChime(false);
      } finally {
        setProcessing(false);
        setManualToken("");
      }
    },
    [school?.id, date, scanStatus, processing, soundEnabled]
  );

  // Scanning loop for camera video stream
  const startScanningLoop = () => {
    // Check if browser native BarcodeDetector is available
    if ("BarcodeDetector" in window) {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ["qr_code"],
      });

      scanIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const detectedValue = barcodes[0].rawValue;
            if (detectedValue) {
              processToken(detectedValue);
            }
          }
        } catch {
          // Frame detection skip
        }
      }, 400);
    }
  };

  // Handle manual / scanner Enter key submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualToken.trim()) {
      processToken(manualToken.trim());
    }
  };

  return (
    <div className="space-y-6">
      <AttendanceNavHeader
        title="QR Attendance"
        subtitle="Fast, touchless ID card attendance scanning for school entry & classrooms"
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/admin/attendance"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6EAF3] bg-white text-xs sm:text-sm font-semibold text-[#5B6478] hover:text-[#141A2E] hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg border border-[#E6EAF3] bg-white transition-colors ${
                soundEnabled ? "text-[#2158E0]" : "text-[#8C95A8]"
              }`}
              title={soundEnabled ? "Mute audio chime" : "Enable audio chime"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        }
      />

      {/* Control Bar: Date & Status Selector */}
      <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div>
            <label className="block text-[11px] font-semibold text-[#5B6478] uppercase mb-1">
              Attendance Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-[#E6EAF3] bg-white text-[#141A2E] focus:outline-none focus:border-[#2158E0]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#5B6478] uppercase mb-1">
              Mark Status As
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setScanStatus("present")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  scanStatus === "present"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-[#5B6478] hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                Present
              </button>
              <button
                type="button"
                onClick={() => setScanStatus("late")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  scanStatus === "late"
                    ? "bg-amber-600 text-white"
                    : "bg-slate-100 text-[#5B6478] hover:bg-amber-50 hover:text-amber-700"
                }`}
              >
                Late
              </button>
            </div>
          </div>
        </div>

        {/* Handheld Barcode Scanner / Manual Token Input */}
        <form onSubmit={handleManualSubmit} className="flex items-center gap-2 w-full sm:w-80">
          <div className="relative flex-1">
            <Keyboard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6478]" />
            <input
              type="text"
              placeholder="Barcode scanner input or token..."
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              disabled={processing}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E6EAF3] text-[#141A2E] placeholder-[#8C95A8] focus:outline-none focus:border-[#2158E0]"
            />
          </div>
          <button
            type="submit"
            disabled={processing || !manualToken.trim()}
            className="px-3 py-1.5 rounded-lg bg-[#2158E0] text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
          >
            {processing ? "..." : "Scan"}
          </button>
        </form>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Camera Viewfinder & Controls */}
        <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-2xs p-4 sm:p-5 flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#2158E0]" />
              <h2 className="text-sm font-bold text-[#141A2E] font-heading">Camera Viewfinder</h2>
            </div>
            {cameraActive ? (
              <button
                onClick={stopCamera}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
              >
                <CameraOff className="w-3.5 h-3.5" />
                Stop Camera
              </button>
            ) : (
              <button
                onClick={startCamera}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-white bg-[#2158E0] hover:bg-blue-700 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                Start Camera
              </button>
            )}
          </div>

          {/* Viewfinder Frame */}
          <div className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-700">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Viewfinder Target Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-emerald-400 rounded-2xl relative shadow-lg">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br" />
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-emerald-400/80 animate-pulse" />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-6 text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center mx-auto">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-200">Camera is currently inactive</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click &ldquo;Start Camera&rdquo; above to begin scanning student ID card QR codes
                  </p>
                </div>
                {cameraError && (
                  <div className="text-[11px] text-rose-400 bg-rose-950/50 p-2 rounded-lg border border-rose-800/50">
                    {cameraError}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-full mt-3 flex items-center justify-between text-[11px] text-[#5B6478]">
            <span>Supports 2D USB/Bluetooth barcode guns as well as webcams.</span>
            {processing && <span className="font-semibold text-[#2158E0] animate-pulse">Processing scan...</span>}
          </div>
        </div>

        {/* Right Column: Last Scanned Result & Live Feed */}
        <div className="space-y-4">
          {/* Last Result Spotlight Card */}
          <div
            className={`rounded-2xl border p-4 sm:p-5 shadow-2xs transition-all ${
              !lastResult
                ? "bg-white border-[#E6EAF3]"
                : lastResult.success
                ? "bg-emerald-50/70 border-emerald-300"
                : "bg-rose-50/70 border-rose-300"
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-black/5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B6478]">
                Last Scan Result
              </span>
              {lastResult && (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                    lastResult.success
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-600 text-white"
                  }`}
                >
                  {lastResult.success ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Success
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      Failed
                    </>
                  )}
                </span>
              )}
            </div>

            {lastResult ? (
              <div className="pt-3">
                {lastResult.success ? (
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 font-bold text-lg flex items-center justify-center shrink-0 border border-emerald-200 overflow-hidden">
                      {lastResult.photo_path ? (
                        <img
                          src={lastResult.photo_path}
                          alt={lastResult.student_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        lastResult.student_name?.charAt(0) || "S"
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-[#141A2E] truncate font-heading">
                        {lastResult.student_name}
                      </h3>
                      <p className="text-xs text-[#5B6478] mt-0.5">
                        {lastResult.class_name} {lastResult.section_name ? `• Section ${lastResult.section_name}` : ""}
                        {lastResult.roll_no ? ` • Roll: ${lastResult.roll_no}` : ""}
                      </p>
                      <p className="text-[11px] font-mono text-[#5B6478]">
                        Adm: {lastResult.admission_no}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="capitalize px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
                        {lastResult.status}
                      </span>
                      {lastResult.already_recorded && (
                        <p className="text-[10px] text-amber-700 mt-1 font-medium">
                          (Already recorded)
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-rose-700">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{lastResult.message}</p>
                      <p className="text-xs text-rose-500 mt-0.5">Code: {lastResult.code}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#5B6478]">
                Awaiting first student QR scan...
              </div>
            )}
          </div>

          {/* Live Recent Scans Table */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-2xs overflow-hidden">
            <div className="p-3.5 sm:p-4 border-b border-[#E6EAF3] flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-[#141A2E] font-heading">
                Recent Scans Today ({recentScans.length})
              </h3>
              <span className="text-[11px] text-[#5B6478]">Real-time session stream</span>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-[#E6EAF3] text-xs">
              {recentScans.length === 0 ? (
                <div className="py-8 text-center text-[#5B6478]">
                  No scans logged in this session yet.
                </div>
              ) : (
                recentScans.map((scan, i) => (
                  <div
                    key={i}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-[#141A2E] truncate">
                        {scan.student_name || "Unknown Student"}
                      </div>
                      <div className="text-[11px] text-[#5B6478]">
                        {scan.class_name} {scan.section_name ? `(${scan.section_name})` : ""} • Adm: {scan.admission_no || "N/A"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`capitalize px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          scan.success
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {scan.success ? scan.status : "Failed"}
                      </span>
                      <span className="text-[11px] font-mono text-[#8C95A8]">
                        {scan.timestamp}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QRAttendance;
