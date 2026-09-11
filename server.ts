import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// Lazy initialize Gemini AI SDK
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// In-memory demo requests storage
interface DemoRequest {
  id: string;
  schoolName: string;
  city: string;
  studentCount: string;
  board: string;
  contactName: string;
  phone: string;
  email: string;
  preferredDate?: string;
  createdAt: string;
}
const demoRequests: DemoRequest[] = [];

// API: Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API: Book a demo
app.post("/api/demo", (req: Request, res: Response) => {
  const { schoolName, city, studentCount, board, contactName, phone, email, preferredDate } = req.body;
  if (!schoolName || !phone) {
    res.status(400).json({ error: "School name and phone number are required." });
    return;
  }
  const newBooking: DemoRequest = {
    id: `DEMO-${Date.now().toString(36).toUpperCase()}`,
    schoolName,
    city: city || "Not specified",
    studentCount: studentCount || "Up to 800",
    board: board || "CBSE",
    contactName: contactName || "Principal / Admin",
    phone,
    email: email || "",
    preferredDate: preferredDate || "Next available business day",
    createdAt: new Date().toISOString(),
  };
  demoRequests.push(newBooking);
  res.json({
    success: true,
    bookingId: newBooking.id,
    message: `Demo booked successfully for ${schoolName}! Our onboarding advisor will contact you on WhatsApp at ${phone}.`,
    details: newBooking,
  });
});

// API: Multi-turn chat with Gemini
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { messages, message } = req.body;
    const ai = getAI();
    
    // System instruction tuned specifically for MyZkool
    const systemInstruction = `You are the MyZkool Senior School Solutions Advisor.
MyZkool is an integrated School Website Builder + School Management ERP built specifically for small and mid-size K-12 schools in India, with high adoption across Tier-2 and Tier-3 cities (such as Lucknow, Indore, Jaipur, Nagpur, Coimbatore, Patna, Rajkot, etc.).
Core value proposition:
1. One login replaces 5 disconnected software tools (Website, Admissions, Fees & Payments, Attendance, Exams/Report Cards, Timetable, Staff/Student Records, Transport).
2. WhatsApp-First: All parent communication, fee reminders, daily attendance, and report cards go directly to WhatsApp without parents having to install an app.
3. No IT team needed: Handled with a dedicated onboarding team that migrates registers and spreadsheets.
4. Pricing: Basic (₹999/mo up to 800 students), Pro (₹1,799/mo up to 1,800 students, all features), Custom (above 1,800 students). 5% off on 6 months, 10% off on 12 months prepay. No setup fee.
Be respectful, warm, professional, and practical. Address principals and trustees respectfully. Keep explanations concise, clear, and reassuring.`;

    // Construct conversation history
    const contents: any[] = [];
    if (Array.isArray(messages)) {
      for (const m of messages) {
        contents.push({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        });
      }
    }
    if (message) {
      contents.push({
        role: "user",
        parts: [{ text: message }],
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents.length > 0 ? contents : "Hello, how can MyZkool help our school?",
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({
      text: response.text || "I am glad to assist your school with MyZkool. How many students does your institution currently have?",
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: "Failed to generate AI response",
      details: error.message,
      fallbackText: "MyZkool is built specifically for schools without an IT team. You get a ready website, online fees with automated WhatsApp reminders, daily attendance alerts, and term report cards in one single login.",
    });
  }
});

// API: Text-to-speech with gemini-3.1-flash-tts-preview
app.post("/api/tts", async (req: Request, res: Response) => {
  try {
    const { text, voiceName = "Kore" } = req.body;
    if (!text) {
      res.status(400).json({ error: "Text is required for TTS." });
      return;
    }

    const ai = getAI();
    const cleanText = text.replace(/[*_#`]/g, "").slice(0, 400); // Friendly TTS sample

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({
        audioBase64: base64Audio,
        sampleRate: 24000,
      });
    } else {
      res.status(500).json({ error: "No audio stream generated." });
    }
  } catch (error: any) {
    console.error("TTS error:", error);
    res.status(500).json({ error: "TTS generation failed", details: error.message });
  }
});

// API: Analyze School Document / Image (Fee slip, Timetable, Report card, Brochure)
app.post("/api/analyze-image", async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", prompt } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: "Image data is required" });
      return;
    }

    const ai = getAI();
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");

    const userPrompt = prompt || 
      "Analyze this school document (e.g. timetable, fee receipt, marks sheet, student list or brochure). Identify key elements, assess how MyZkool can digitize it automatically, and give a structured 3-point migration summary for the school principal.";

    // Use gemini-3.1-pro-preview (or fallback gracefully to gemini-3.8-flash if pro requires specific tier)
    let modelToUse = "gemini-3.1-pro-preview";
    let response;
    try {
      response = await ai.models.generateContent({
        model: modelToUse,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: userPrompt,
            },
          ],
        },
      });
    } catch (proErr) {
      console.warn("Retrying with gemini-3.8-flash...", proErr);
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: userPrompt,
            },
          ],
        },
      });
    }

    res.json({
      analysis: response.text || "Document scanned successfully. Ready for MyZkool ERP import.",
    });
  } catch (error: any) {
    console.error("Analyze image error:", error);
    res.status(500).json({ error: "Failed to analyze document", details: error.message });
  }
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MyZkool Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
