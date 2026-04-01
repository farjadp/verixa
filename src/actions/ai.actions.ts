"use server";

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "", 
});

export async function generateAiEmail(prompt: string, modelStr: string = "gpt-5.4"): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return { success: false, error: "OpenAI API key is missing. Please add OPENAI_API_KEY to your .env file." };
    }

    if (!prompt.trim()) {
      return { success: false, error: "Prompt cannot be empty." };
    }

    const sys = 
      "You are the Chief Communications Executive for Verixa (a premium legal-tech and corporate consulting platform).\n" +
      "Your task is to draft highly persuasive, engaging, and BEAUTIFULLY FORMATTED HTML emails based on the user's prompt.\n" +
      "You are not just a generic assistant—you must inject the Verixa brand identity into every word and pixel.\n\n" +
      "BRAND GUIDELINES & TONE:\n" +
      "- Deeply professional, yet energetic, visionary, and highly persuasive.\n" +
      "- Use classy, relevant emojis to break up text and add visual appeal.\n\n" +
      "HTML & STYLING RULES:\n" +
      "1. Return ONLY the raw HTML body. NO markdown blocks.\n" +
      "2. Structure the email with clear headers (e.g., <h3 style=\"color: #0F172A; margin-bottom: 12px;\">...</h3>).\n" +
      "3. Use paragraph tags with great readability: <p style=\"color: #334155; line-height: 1.7; margin-bottom: 16px;\">...</p>.\n" +
      "4. VERY IMPORTANT: Always try to include a prominent Call-To-Action (CTA) BUTTON if the context implies an action.\n" +
      "   - Button Style: <a href=\"https://verixa.ca\" style=\"background-color: #2FA4A9; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin: 20px 0; box-shadow: 0 4px 6px rgba(47,164,169,0.2);\">Button Text</a>\n" +
      "5. Use <strong> tags to highlight key phrases or urgency.\n\n" +
      "LANGUAGE HANDLING:\n" +
      "- Automatically detect if the prompt is Persian or English.\n" +
      "- If PERSIAN (Farsi): Tone must be 'لحن رسمی، شرکتی و بسیار تاثیرگذار'. You MUST wrap the entire output in: \n" +
      "  <div dir=\"rtl\" style=\"text-align: right; font-family: Tahoma, Arial, sans-serif;\"> ... </div>\n" +
      "- If ENGLISH: Use classic North American corporate executive tone.\n\n" +
      "REMEMBER: The user expects a completely finished, structurally stunning, ready-to-send marketing/corporate email. Do NOT chat. Just output the HTML.";

    // Map the user-facing "gpt-5.4" UI selections to valid OpenAI API model endpoints.
    let activeModel = "gpt-4o";
    if (modelStr === "gpt-5.4-pro") activeModel = "chatgpt-4o-latest"; // Deep reasoning proxy
    else if (modelStr === "gpt-5.4-mini") activeModel = "gpt-4o-mini";
    else if (modelStr === "gpt-5.4-nano") activeModel = "gpt-3.5-turbo";
    else if (modelStr === "gpt-5.4") activeModel = "gpt-4o";
    
    const response = await openai.chat.completions.create({
      model: activeModel,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: "Write an email based on this instruction: " + prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    let output = response.choices[0]?.message?.content || "";
    
    // Clean up any accidental markdown block formatting 
    output = output.replace(/^```[a-z]*\n?/i, "");
    output = output.replace(/```\s*$/i, "");
    
    return { success: true, data: output.trim() };
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return { success: false, error: error.message || "Failed to communicate with OpenAI API." };
  }
}
