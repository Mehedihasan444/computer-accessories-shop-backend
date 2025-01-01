import { GoogleGenerativeAI } from "@google/generative-ai";
export const aiChatBot = async (prompt) => {
    const genAI = new GoogleGenerativeAI(process.env.API_KEY);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


    const result = await model.generateContent(prompt);
    return result.response.text();
}