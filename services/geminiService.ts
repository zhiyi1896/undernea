
import { GoogleGenAI, Type } from "@google/genai";

export async function generateGreeting(prompt: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `请根据以下关键词或要求，为我的圣诞星尘树生成一段极具文学感、高级感、富有诗意且温暖的中文圣诞祝词。字数控制在30字以内，可以包含换行符（用\n表示）。
    关键词：${prompt}`,
    config: {
      temperature: 0.8,
      topP: 0.9,
    },
  });

  return response.text || "愿岁岁常欢愉，年年皆胜意。";
}
