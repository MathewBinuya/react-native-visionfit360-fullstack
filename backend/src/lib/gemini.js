import { GoogleGenerativeAI } from "@google/generative-ai";


// Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });