import React from "react";
import { GoogleGenAI } from "@google/genai";
import { Persona, ApiSettings, WorldbookSettings, UserProfile } from "../types";

export async function generateImage(prompt: string, apiKey: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });

  const tryGenerate = async (model: string, config: any) => {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: prompt }] },
        config
      });

      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
        // Log text if no image found
        const textParts = response.candidates[0].content.parts.filter(p => p.text).map(p => p.text).join(' ');
        if (textParts) console.warn(`Image generation (${model}) returned text:`, textParts);
      }
      throw new Error("No image data in response");
    } catch (error) {
      throw error;
    }
  };

  try {
    // Try 3.1 first with high quality config
    return await tryGenerate('gemini-3.1-flash-image-preview', {
      imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
    });
  } catch (e) {
    console.warn("Failed with gemini-3.1-flash-image-preview, falling back to 2.5", e);
    try {
      // Fallback to 2.5 without imageSize (it might not support it)
      return await tryGenerate('gemini-2.5-flash-image', {
        imageConfig: { aspectRatio: "1:1" }
      });
    } catch (e2) {
      console.error("All image generation attempts failed", e2);
      // Fallback to a placeholder if generation fails
      return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(prompt)}`;
    }
  }
}

export async function fetchAiResponse(
  promptText: string, 
  contextMessages: any[] = [], 
  persona: Persona,
  apiSettings: ApiSettings,
  worldbook: WorldbookSettings,
  userProfile: UserProfile,
  aiRef: React.MutableRefObject<GoogleGenAI | null>,
  enableQuote: boolean = true,
  additionalSystemInstructions: string = "",
  forceModel?: string
) {
  const now = new Date();
  const timeString = now.toLocaleString('zh-CN', { 
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', second: '2-digit', 
    hour12: false 
  });
  const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];

  const jailbreakPrompts = [worldbook.jailbreakPrompt, ...(worldbook.jailbreakPrompts || [])].filter(Boolean);
  const globalPrompts = [worldbook.globalPrompt, ...(worldbook.globalPrompts || [])].filter(Boolean);
  const personaPrompts = [persona.prompt, ...(persona.prompts || [])].filter(Boolean);

  const fullSystemInstruction = [
    ...jailbreakPrompts,
    ...globalPrompts,
    `【当前时间】现在是 ${timeString} 星期${dayOfWeek}。请在对话中自然地体现出对时间的感知（例如：早上好、该吃午饭了、这么晚还不睡等），但不要生硬地报时。`,
    "【语言要求】\n1. 请根据你的人设决定回复语言。如果是中国人设，必须全程使用中文。如果是外国人设（如美国人、英国人），请使用对应的外语（如英语），除非用户要求你说中文。\n2. 即使你的系统提示或上下文包含其他语言，也请优先使用符合你人设的语言进行回复。",
    "【回复规范】\n1. 必须严格遵守你的角色设定，语气、用词、口癖要完全一致。\n2. 严禁重复用户的话，严禁重复自己上一句话的句式或内容。\n3. 保持对话的自然感，像真人在发微信一样，不要回复太长，除非角色设定如此。\n4. 严禁输出任何关于你是AI、语言模型或机器人的提示。\n5. 严禁在回复中包含任何形如 [ID: xxx] 的调试信息或消息ID。",
    enableQuote ? "【功能提示】你可以引用之前的消息进行回复。如果需要引用，请在回复的最开头加上 [QUOTE: 消息ID]，例如：[QUOTE: 123456789] 你的回复内容。消息ID会在上下文的 [ID: xxx] 中提供。请只在觉得非常有必要引用时才使用此功能，不要每句话都引用。注意：回复中不要包含 [ID: xxx]。" : "",
    persona.isSegmentResponse ? "【分段回复要求】请务必将你的回复分成多个短句，每句话之间必须用换行符（\\n）分隔。不要把所有内容写在一段里，要像真人连续发多条微信一样，每条消息简短自然。例如：\n第一句话\n第二句话\n第三句话" : "",
    "【特殊功能指令】你可以通过以下指令触发特殊交互。请注意：\n" +
    "1. **必须**直接使用指令标签，**严禁**在回复中用文字描述“我给你转账了”、“我给你点了外卖”等动作。例如：\n" +
    "   - 错误：我给你转了520元，拿去花吧。\n" +
    "   - 正确：[TRANSFER: 520, 拿去花]\n" +
    "2. 指令列表：\n" +
    "   - 转账：[TRANSFER: 金额, 备注]\n" +
    "   - 收款：[REQUEST: 金额, 备注]\n" +
    "   - 退还：[REFUND: 金额, 备注]\n" +
    "   - 表情包：[STICKER: 关键词] (例如 [STICKER: happy])。注意：这会触发AI生成一张真实的图片作为表情包，请提供具体的画面描述。\n" +
    "   - 亲属卡：[RELATIVE_CARD: 额度]\n" +
    "   - 点外卖：[ORDER: 食物名称]\n" +
    "     * ⚠️ **严格限制**：点外卖功能非常昂贵。**只有**在用户明确表示“饿了”、“想吃东西”或者明确要求点外卖时才能使用。**绝对禁止**在用户没有提及食物时主动点外卖。\n" +
    "3. 指令必须包含中括号，冒号后可以有空格。金额必须是纯数字。",
    // Check for persona-specific user settings first, fallback to global user persona
    (() => {
      const specificSettings = userProfile.personaSpecificSettings?.[persona.id];
      if (specificSettings?.userPersona) {
        return `【用户人设 (当前对话专属)】\n${specificSettings.userPersona}`;
      }
      return userProfile.persona ? `【用户人设】\n${userProfile.persona}` : "";
    })(),
    persona.instructions ? `【角色人设】\n${persona.instructions}` : "",
    ...personaPrompts,
    !persona.instructions && personaPrompts.length === 0 ? "You are a helpful assistant." : "",
    additionalSystemInstructions
  ].filter(Boolean).join('\n\n');

  let responseText = "";

  if (apiSettings.apiUrl) {
    let endpoint = apiSettings.apiUrl;
    try {
      const urlObj = new URL(endpoint);
      if (!urlObj.pathname.endsWith('/chat/completions') && !urlObj.pathname.endsWith('/v1/messages')) {
        urlObj.pathname = urlObj.pathname.endsWith('/') ? `${urlObj.pathname}chat/completions` : `${urlObj.pathname}/chat/completions`;
      }
      endpoint = urlObj.toString();
    } catch (e) {
      // Fallback if it's not a valid URL (e.g. relative path)
      if (!endpoint.includes('/chat/completions') && !endpoint.includes('/v1/messages')) {
        endpoint = endpoint.endsWith('/') ? `${endpoint}chat/completions` : `${endpoint}/chat/completions`;
      }
    }
    
    const openAiMessages = [
      { role: 'system', content: fullSystemInstruction },
      ...contextMessages,
      { role: promptText.startsWith('[系统提示：') ? 'system' : 'user', content: promptText }
    ];

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiSettings.apiKey}`
      },
      body: JSON.stringify({
        model: forceModel || apiSettings.model,
        messages: openAiMessages,
        temperature: apiSettings.temperature,
        seed: Math.floor(Math.random() * 1000000),
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`HTTP error! status: ${res.status}, message: ${JSON.stringify(errorData)}`);
    }
    const data = await res.json();
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      responseText = data.choices[0].message.content;
    } else if (data.response) {
      responseText = data.response;
    } else if (data.message && data.message.content) {
      responseText = data.message.content;
    } else if (data.error) {
      throw new Error(`API Error: ${data.error.message || JSON.stringify(data.error)}`);
    } else {
      console.error("Unexpected API response format:", data);
      throw new Error(`Invalid API response format: missing choices. Response: ${JSON.stringify(data).substring(0, 200)}`);
    }
    
    // Check for sticker generation request
    const stickerMatch = responseText.match(/\[STICKER:\s*([^\]]+)\]/i);
    if (stickerMatch) {
      const stickerPrompt = stickerMatch[1].trim();
      // Only generate if it's not a known sticker name (simple heuristic: if it has spaces or is long, treat as prompt)
      // Actually, we should just try to generate if it looks like a prompt.
      // But we also support [STICKER: happy].
      // Let's assume if the prompt is NOT in a predefined list of simple emotions, we generate.
      // Or better: always generate if the user asked for "generated sticker".
      // But the prompt says: "This will trigger AI to generate a REAL image... please provide specific description."
      // So if the AI follows instructions, it will provide a description.
      // If it provides "happy", we might get a generated "happy" image which is fine.
      // But to save time/cost, maybe we check if it's a simple keyword?
      // No, user wants "not perfunctory". So let's generate everything!
      // Except if it's a URL already.
      if (!stickerPrompt.startsWith('http') && !stickerPrompt.startsWith('data:')) {
         try {
           const imageUrl = await generateImage(stickerPrompt, apiSettings.apiKey || process.env.GEMINI_API_KEY as string);
           responseText = responseText.replace(stickerMatch[0], `[STICKER: ${imageUrl}]`);
         } catch (e) {
           console.error("Failed to generate sticker image:", e);
           // Fallback is handled by the UI using dicebear if we leave it as is, 
           // but we want to show we tried.
           // If we fail, we leave it as [STICKER: prompt] and UI will use dicebear.
         }
      }
    }

    return { responseText: processAiResponse(responseText), functionCalls: undefined };
  } else {
    if (!aiRef.current) {
      const apiKey = apiSettings.apiKey || process.env.GEMINI_API_KEY;
      aiRef.current = new GoogleGenAI({ apiKey: apiKey as string });
    }

    const contents = contextMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: promptText }] });

    const response = await aiRef.current.models.generateContent({
      model: forceModel || apiSettings.model || 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: fullSystemInstruction,
        temperature: apiSettings.temperature,
        seed: Math.floor(Math.random() * 1000000),
        maxOutputTokens: 2048,
        tools: [{
          functionDeclarations: [{
            name: 'searchMusic',
            description: 'Search for music on NetEase Cloud Music',
            parameters: {
              type: 'OBJECT',
              properties: {
                query: { type: 'STRING', description: 'The song name or artist' }
              },
              required: ['query']
            }
          }, {
            name: 'getHotMusic',
            description: 'Get hot/popular songs from NetEase Cloud Music',
            parameters: {
              type: 'OBJECT',
              properties: {}
            }
          }]
        }]
      }
    });
    responseText = response.text || "...";

    // Check for sticker generation request (same logic for Google GenAI path)
    const stickerMatch = responseText.match(/\[STICKER:\s*([^\]]+)\]/i);
    if (stickerMatch) {
      const stickerPrompt = stickerMatch[1].trim();
      if (!stickerPrompt.startsWith('http') && !stickerPrompt.startsWith('data:')) {
         try {
           const apiKey = apiSettings.apiKey || process.env.GEMINI_API_KEY as string;
           const imageUrl = await generateImage(stickerPrompt, apiKey);
           responseText = responseText.replace(stickerMatch[0], `[STICKER: ${imageUrl}]`);
         } catch (e) {
           console.error("Failed to generate sticker image:", e);
         }
      }
    }

    return { responseText: processAiResponse(responseText), functionCalls: response.functionCalls };
  }
}

// Strip [ID: xxx] patterns and ||| separators
export function processAiResponse(responseText: string) {
  return responseText.replace(/\[ID:\s*[^\]]+\]/gi, '').replace(/\|\|\|/g, '').trim();
}

