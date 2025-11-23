import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { DictionaryEntry, Language, StoryResponse } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// --- Text Generation ---

export const generateDefinition = async (
  term: string,
  nativeLang: Language,
  targetLang: Language
): Promise<Omit<DictionaryEntry, 'id' | 'imageBase64' | 'timestamp'>> => {
  
  const prompt = `
    You are a fun, helpful AI dictionary.
    The user is looking up the term: "${term}".

    Your Task:
    1. **Detect Language**: Determine if the input "${term}" is Chinese or English.
    2. **Normalize to English**: 
       - If the input is Chinese, translate it to the most common and natural English word/phrase. This is your Main Term.
       - If the input is English, use it directly as the Main Term.
    3. **Generate Entry**: Create a dictionary entry for this Main Term.
    
    Requirements for fields:
    - **term**: The Main Term in English.
    - **definition**: A clear, natural language definition of the Main Term in English.
    - **usageNote**: A fun, lively, and casual explanation in English. Explain cultural nuance, usage context, tone, related words (synonyms/confusing words), or common grammar. Talk like a knowledgeable friend, not a textbook. Be concise. Get straight to the point.
    - **examples**: 2 example sentences using the Main Term in English.
    - **examples.translated**: The Mandarin Chinese translation of the example sentence.
    - **imagePrompt**: A simple visual description for an image generator.
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      term: { type: Type.STRING, description: "The main word/phrase in English" },
      definition: { type: Type.STRING, description: "Definition in English" },
      usageNote: { type: Type.STRING, description: "Fun, casual usage explanation in English" },
      imagePrompt: { type: Type.STRING, description: "Visual description for image generation" },
      examples: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            original: { type: Type.STRING, description: "Example sentence in English" },
            translated: { type: Type.STRING, description: "Mandarin Chinese translation" },
          },
          required: ["original", "translated"]
        }
      }
    },
    required: ["term", "definition", "usageNote", "examples", "imagePrompt"]
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    }
  });

  const text = response.text;
  if (!text) throw new Error("No text response from Gemini");

  const data = JSON.parse(text);
  return {
    term: data.term || term, // Use the normalized target language term
    nativeLanguage: nativeLang,
    targetLanguage: targetLang,
    definition: data.definition,
    usageNote: data.usageNote,
    examples: data.examples,
  };
};

export const generateStory = async (words: DictionaryEntry[], nativeLang: Language): Promise<string> => {
  const wordList = words.map(w => w.term).join(', ');
  const prompt = `Write a short, funny, and memorable story using the following words: ${wordList}. 
  The story should be in English.
  Highlight the key words in **bold**. Keep it under 150 words.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || "Could not generate story.";
};

// --- Image Generation ---

export const generateConceptImage = async (description: string): Promise<string | undefined> => {
  try {
    // Using gemini-2.5-flash-image as requested for image generation
    // It returns the image in the response parts
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `Generate a bright, colorful, pop-art style illustration for: ${description}. minimalistic, vector art style.` }
        ]
      },
      config: {
         // No responseMimeType for image models
      }
    });

    // Iterate parts to find the image
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    return undefined;
  } catch (e) {
    console.error("Image generation failed", e);
    return undefined; 
  }
};

// --- TTS ---

// Helper: Decode Base64 to Uint8Array
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper: Decode PCM Int16 to AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // Create Int16 view of the byte data
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert PCM 16-bit integer (-32768 to 32767) to float (-1.0 to 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const playAudio = async (text: string, voiceName: string = 'Kore') => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName },
                  },
              },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) return;

        // Initialize Audio Context
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass({sampleRate: 24000});
        
        // Decode
        const audioBytes = decode(base64Audio);
        const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
        
        // Play
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();

    } catch (e) {
        console.error("TTS Error", e);
    }
};