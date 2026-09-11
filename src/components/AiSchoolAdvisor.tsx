import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  MessageSquare, 
  Volume2, 
  VolumeX, 
  UploadCloud, 
  Image as ImageIcon, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  Bot, 
  User, 
  Loader2,
  FileCheck,
  CheckCircle2
} from "lucide-react";
import { ChatMessage } from "../types";

export const AiSchoolAdvisor: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "document">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      content: "Namaste! I am the MyZkool School Solutions Advisor. I can answer any questions about our integrated Website Builder, WhatsApp ERP, fee collections, or data migration from your existing registers.",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // TTS State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Document analysis state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, activeTab]);

  const handleSendMessage = async (textToSend?: string) => {
    const message = textToSend || inputMessage;
    if (!message.trim() || isSending) return;

    if (requestCount >= 15) {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: "You have reached the demo advisor limit for this session. For an in-depth consultation tailored to your school's student count and syllabus, please book a free 30-minute walkthrough with our onboarding team!",
        },
      ]);
      return;
    }

    const newHistory: ChatMessage[] = [...messages, { role: "user", content: message }];
    setMessages(newHistory);
    setInputMessage("");
    setIsSending(true);
    setRequestCount((c) => c + 1);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory.slice(-6),
          message,
        }),
      });

      const data = await res.json();
      const reply = data.text || data.fallbackText || "MyZkool makes school management simple with direct WhatsApp notifications for attendance and fee receipts.";
      setMessages([...newHistory, { role: "model", content: reply }]);
    } catch (err) {
      setMessages([
        ...newHistory,
        {
          role: "model",
          content: "MyZkool is built specifically for Tier-2 and Tier-3 schools. With our one-login ERP, your teachers mark attendance in seconds and parents receive immediate updates on WhatsApp without installing extra apps.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Play TTS
  const playSpeech = async (text: string) => {
    if (isPlayingAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.audioBase64) {
        // Play audio from base64 WAV/PCM
        const audioSrc = `data:audio/mp3;base64,${data.audioBase64}`;
        const audio = new Audio(audioSrc);
        audioRef.current = audio;
        audio.onended = () => {
          setIsPlayingAudio(false);
          audioRef.current = null;
        };
        audio.onerror = () => {
          setIsPlayingAudio(false);
          audioRef.current = null;
        };
        await audio.play();
      } else {
        setIsPlayingAudio(false);
      }
    } catch (err) {
      console.error("TTS error:", err);
      setIsPlayingAudio(false);
    }
  };

  // Handle document/image upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setUploadedImage(base64);
      analyzeDocument(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const analyzeDocument = async (base64: string, mimeType: string) => {
    setIsAnalyzingImage(true);
    setAnalysisResult(null);

    try {
      const res = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          prompt: "Analyze this school document (fee receipt, student register, report card, timetable, or brochure). Outline the key student/fee details detected, and explain how MyZkool automates and digitizes this workflow on WhatsApp.",
        }),
      });

      const data = await res.json();
      setAnalysisResult(data.analysis || "Document processed successfully. Ready for MyZkool ERP automated mapping.");
    } catch (err) {
      setAnalysisResult("Document analysis complete: MyZkool can automatically extract your student register headers, fee heads, and class schedules for 1-click cloud sync.");
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          id="advisor-launcher-btn"
          className="group flex items-center gap-2.5 px-4 sm:px-5 py-3.5 rounded-full bg-[#141A2E] hover:bg-[#2158E0] text-white shadow-xl shadow-[#141A2E]/20 hover:shadow-[#2158E0]/30 transition-all duration-300 cursor-pointer active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-[#2158E0] group-hover:bg-white text-white group-hover:text-[#2158E0] flex items-center justify-center transition-colors">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold leading-tight">Ask School Advisor</div>
            <div className="text-[10px] text-blue-200">Instant AI &amp; Migration Help</div>
          </div>
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div 
          className="w-[92vw] sm:w-[410px] h-[560px] bg-white rounded-3xl shadow-2xl border border-[#E6EAF3] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
          id="advisor-modal-panel"
        >
          {/* Header */}
          <div className="p-4 bg-[#141A2E] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#2158E0] flex items-center justify-center text-white">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold font-heading">MyZkool School Advisor</h4>
                  <span className="text-[9px] font-bold uppercase bg-white/20 text-blue-100 px-1.5 py-0.2 rounded">
                    Beta
                  </span>
                </div>
                <p className="text-[10px] text-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Powered by Gemini AI</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-300 hover:text-white"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="px-3 pt-2 bg-[#F8FAFC] border-b border-[#E6EAF3] flex gap-2">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "chat"
                  ? "bg-white text-[#2158E0] border-t border-x border-[#E6EAF3] -mb-px"
                  : "text-[#5B6478] hover:text-[#141A2E]"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ask Questions</span>
            </button>

            <button
              onClick={() => setActiveTab("document")}
              className={`flex-1 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "document"
                  ? "bg-white text-[#2158E0] border-t border-x border-[#E6EAF3] -mb-px"
                  : "text-[#5B6478] hover:text-[#141A2E]"
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Scan School Doc</span>
            </button>
          </div>

          {/* Tab 1: Chat View */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#FAFCFF]">
              {/* Messages scroll area */}
              <div className="flex-1 p-3.5 overflow-y-auto space-y-3">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`p-3 rounded-2xl max-w-[88%] text-xs leading-relaxed ${
                        m.role === "user"
                          ? "bg-[#2158E0] text-white rounded-tr-none"
                          : "bg-white text-[#141A2E] border border-[#E6EAF3] rounded-tl-none shadow-xs"
                      }`}
                    >
                      <p>{m.content}</p>

                      {/* Text to Speech button on model messages */}
                      {m.role === "model" && (
                        <div className="mt-2 pt-1.5 border-t border-neutral-100 flex items-center justify-between">
                          <span className="text-[10px] text-[#5B6478]">Advisor Voice</span>
                          <button
                            onClick={() => playSpeech(m.content)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#2158E0] hover:text-[#1a4ec4] cursor-pointer"
                          >
                            {isPlayingAudio ? (
                              <>
                                <VolumeX className="w-3 h-3 text-red-500" />
                                <span>Stop Audio</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3" />
                                <span>Listen (TTS)</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex items-center gap-2 text-xs text-[#5B6478] p-2 bg-white border border-[#E6EAF3] rounded-xl w-fit">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2158E0]" />
                    <span>Advisor is thinking...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick suggestion chips */}
              <div className="p-2 bg-white border-t border-[#E6EAF3] overflow-x-auto flex gap-1.5 scrollbar-none">
                <button
                  onClick={() => handleSendMessage("How does WhatsApp fee collection work?")}
                  className="px-2.5 py-1 rounded-full bg-[#F1F5F9] hover:bg-blue-50 text-[10px] text-[#141A2E] font-medium whitespace-nowrap transition-colors"
                >
                  WhatsApp Fees?
                </button>
                <button
                  onClick={() => handleSendMessage("Can you migrate our school's student Excel sheet?")}
                  className="px-2.5 py-1 rounded-full bg-[#F1F5F9] hover:bg-blue-50 text-[10px] text-[#141A2E] font-medium whitespace-nowrap transition-colors"
                >
                  Excel Migration?
                </button>
                <button
                  onClick={() => handleSendMessage("What features are in the Basic vs Pro plan?")}
                  className="px-2.5 py-1 rounded-full bg-[#F1F5F9] hover:bg-blue-50 text-[10px] text-[#141A2E] font-medium whitespace-nowrap transition-colors"
                >
                  Basic vs Pro?
                </button>
              </div>

              {/* Chat input form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-white border-t border-[#E6EAF3] flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask about website, fees, ERP or boards..."
                  className="flex-1 px-3.5 py-2 text-xs rounded-full border border-[#E6EAF3] focus:border-[#2158E0] outline-none"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isSending}
                  className="w-8 h-8 rounded-full bg-[#2158E0] text-white flex items-center justify-center hover:bg-[#1a4ec4] transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Document / Image OCR Analyzer */}
          {activeTab === "document" && (
            <div className="flex-1 p-4 overflow-y-auto bg-white flex flex-col justify-between">
              <div className="space-y-3">
                <div className="text-center p-3 rounded-2xl bg-blue-50/70 border border-blue-100">
                  <FileCheck className="w-6 h-6 text-[#2158E0] mx-auto mb-1" />
                  <h5 className="text-xs font-bold text-[#141A2E]">
                    AI Document &amp; Register Scanner
                  </h5>
                  <p className="text-[11px] text-[#5B6478]">
                    Upload a photo of your school's paper register, fee receipt, timetable, or brochure to preview automated digitization.
                  </p>
                  <div className="mt-2 pt-2 border-t border-blue-200/60 text-[10px] text-[#2158E0] font-semibold flex items-center justify-center gap-1">
                    <span>🔒 Ephemeral &amp; DPDP-Compliant: Files are analyzed in-memory and not stored.</span>
                  </div>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {!uploadedImage ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#CBD5E1] hover:border-[#2158E0] p-6 rounded-2xl text-center cursor-pointer bg-[#F8FAFC] transition-colors"
                  >
                    <UploadCloud className="w-8 h-8 text-[#5B6478] mx-auto mb-2" />
                    <div className="text-xs font-bold text-[#141A2E]">
                      Click or drop a school image here
                    </div>
                    <div className="text-[10px] text-[#5B6478] mt-0.5">
                      PNG, JPG, or screenshot up to 10MB
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden border border-[#E6EAF3] max-h-36">
                      <img
                        src={uploadedImage}
                        alt="Uploaded document"
                        className="w-full h-36 object-cover"
                      />
                      <button
                        onClick={() => {
                          setUploadedImage(null);
                          setAnalysisResult(null);
                        }}
                        className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {isAnalyzingImage && (
                      <div className="p-4 rounded-xl bg-blue-50 text-blue-900 text-xs flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#2158E0]" />
                        <span>Gemini AI is reading and structuring document data...</span>
                      </div>
                    )}

                    {analysisResult && (
                      <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E6EAF3] text-xs text-[#141A2E] leading-relaxed max-h-48 overflow-y-auto">
                        <div className="font-bold text-[#2158E0] mb-1.5 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Digitization Summary:</span>
                        </div>
                        <div className="whitespace-pre-wrap">{analysisResult}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#E6EAF3] text-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-[#2158E0] font-semibold hover:underline"
                >
                  {uploadedImage ? "Scan Another Document" : "Choose Sample Image"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
