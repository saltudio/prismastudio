
/**
 * PRISMA STUDIO: KEY VALIDATION ENGINE
 * Refined for maximum reliability across Free and Paid Gemini tiers.
 */

export const validateGeminiApiKey = async (key: string): Promise<{ valid: boolean; message?: string }> => {
  const trimmedKey = (key || "").trim();

  // 1. Basic Format & Minimum Length Check
  if (trimmedKey.length < 20) {
    return { valid: false, message: "Key is too short to be a valid Gemini API key." };
  }

  const geminiKeyRegex = /^AIza[0-9A-Za-z\-_]+$/;
  if (!geminiKeyRegex.test(trimmedKey)) {
    return { valid: false, message: "Invalid format. Gemini keys usually start with 'AIza'." };
  }

  // 2. Official Google API Validation Probe (Fetching Models List)
  const API_VERSION = "v1";
  const apiUrl = `https://generativelanguage.googleapis.com/${API_VERSION}/models?key=${trimmedKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data.error;
      const status = error?.code || response.status;
      const message = error?.message?.toLowerCase() || "";

      console.error("PRISMA Key Probe Failed:", { status, message });

      if (status === 429 || message.includes("quota") || message.includes("limit")) {
        return { 
          valid: false, 
          message: "Key verified, but QUOTA EXCEEDED. Please check your billing/usage limits at ai.google.dev." 
        };
      }

      if (status === 400 || status === 401 || status === 403 || message.includes("not valid") || message.includes("invalid")) {
        return { 
          valid: false, 
          message: "The API key provided is not valid. Please generate a new key at Google AI Studio." 
        };
      }

      return { valid: false, message: `Validation Error: ${error?.message || 'Verification failed'}` };
    }

    if (data.models && Array.isArray(data.models)) {
      return { valid: true };
    }
    
    return { valid: false, message: "Validation returned an empty response. Please check your Google AI Studio configuration." };

  } catch (err: any) {
    console.error("PRISMA Validation Network Error:", err);
    if (err.name === 'AbortError' || err.message.includes("fetch")) {
      return { valid: false, message: "Network connection failure. Please check your internet or firewall settings." };
    }
    return { valid: false, message: `Engine Error: ${err.message || 'Verification failed'}` };
  }
};
