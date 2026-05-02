import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import Database from "better-sqlite3";

/**
 * Initializes the LLM service.
 */
export function initLLMService(): void {
  // Service initialized. Environment keys prioritized over database config.
}

/**
 * Generic function to get a response from various AI providers.
 * Supports Gemini, Moonshot (Kimi), and OpenAI.
 */
export async function getLLMResponse(provider: string, prompt: string): Promise<string> {
  // Try to get provider configuration from DB if not explicitly provided via env
  let apiKey = "";
  let model = "";

  if (provider === "gemini") {
    apiKey = process.env.GEMINI_API_KEY || "";
    model = "gemini-2.0-flash";
    
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const genModel = genAI.getGenerativeModel({ model });
    const result = await genModel.generateContent(prompt);
    const response = await result.response;
    return response.text();

  } else if (provider === "moonshot") {
    apiKey = process.env.MOONSHOT_API_KEY || "";
    if (!apiKey) throw new Error("MOONSHOT_API_KEY is not configured.");
    
    const response = await axios.post("https://api.moonshot.cn/v1/chat/completions", {
      model: "moonshot-v1-8k",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    }, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    
    return response.data.choices[0].message.content;

  } else if (provider === "openai") {
    apiKey = process.env.OPENAI_API_KEY || "";
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

    const response = await axios.post("https://api.openai.com/v1/chat/completions", {
      model: "gpt-4-turbo",
      messages: [{ role: "user", content: prompt }]
    }, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });

    return response.data.choices[0].message.content;
  }

  throw new Error(`AI Provider "${provider}" is not supported or configured.`);
}
