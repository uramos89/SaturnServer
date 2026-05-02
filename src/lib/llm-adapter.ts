import { GoogleGenAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Standardized LLM adapter for multi-provider support
 */
export async function getLLMResponse(provider: string, prompt: string) {
  if (provider === 'gemini') {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } else if (provider === 'openai') {
    const axios = (await import("axios")).default;
    const response = await axios.post("https://api.openai.com/v1/chat/completions", {
      model: "gpt-4-turbo",
      messages: [{ role: "user", content: prompt }]
    }, {
      headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` }
    });
    return response.data.choices[0].message.content;
  } else if (provider === 'moonshot') {
    const axios = (await import("axios")).default;
    const response = await axios.post("https://api.moonshot.cn/v1/chat/completions", {
      model: process.env.MOONSHOT_MODEL || "moonshot-v1-8k",
      messages: [{ role: "user", content: prompt }]
    }, {
      headers: { "Authorization": `Bearer ${process.env.MOONSHOT_API_KEY}` }
    });
    return response.data.choices[0].message.content;
  }
  throw new Error(`Provider ${provider} not supported`);
}
