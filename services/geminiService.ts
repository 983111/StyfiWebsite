import { GoogleGenAI, Type } from "@google/genai";
import { OutfitSuggestion, TrendReport } from "../types";

// Initialize Gemini
// NOTE: We assume process.env.API_KEY is available in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to encode file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const getTrends = async (category: string): Promise<TrendReport[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Identify top 3 current fashion trends for ${category} based on real-time search data. Focus on what small businesses should list.`,
      config: {
        tools: [{ googleSearch: {} }], // Use Grounding
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              trendName: { type: Type.STRING },
              description: { type: Type.STRING },
              popularityScore: { type: Type.INTEGER, description: "A score from 0 to 100 indicating popularity" },
              keyKeywords: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as TrendReport[];
    }
    throw new Error("No data returned");
  } catch (error) {
    console.error("Error fetching trends:", error);
    // Fallback data if search/API fails
    return [
      { trendName: "Eco-Minimalism", description: "Sustainable fabrics in neutral tones.", popularityScore: 88, keyKeywords: ["Linen", "Beige", "Organic"] },
      { trendName: "Retro Sport", description: "90s athletic wear revival.", popularityScore: 75, keyKeywords: ["Windbreaker", "Neon", "Chunky Sneakers"] },
    ];
  }
};

export const composeOutfit = async (productName: string, productCategory: string): Promise<OutfitSuggestion[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `I have a ${productName} (${productCategory}). Suggest 3 other specific items to create a complete, stylish outfit.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              reason: { type: Type.STRING },
              estimatedPrice: { type: Type.STRING },
              color: { type: Type.STRING }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as OutfitSuggestion[];
    }
    return [];
  } catch (error) {
    console.error("Error composing outfit:", error);
    return [];
  }
};

export const enhanceProductImage = async (imageFile: File, description: string): Promise<string | null> => {
  try {
    const base64Data = await fileToGenerativePart(imageFile);
    
    // Using gemini-2.5-flash-image for image manipulation/generation tasks
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: imageFile.type,
              data: base64Data
            }
          },
          {
            text: `Generate a professional, high-quality studio photography version of this product. Keep the product details identical but improve lighting, remove background clutter, and place it on a clean, aesthetic podium or background suitable for a high-end marketplace. Product description: ${description}`
          }
        ]
      }
    });

    // Extract image from response
    // Iterate through parts to find the image
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error enhancing image:", error);
    return null;
  }
};

export const tryOnVirtual = async (userImage: File, productImage: string): Promise<string | null> => {
  try {
    const userBase64 = await fileToGenerativePart(userImage);
    const productBase64 = await (async () => {
        // Fetch the product image from URL and convert to base64
        // Note: In a real app, you'd likely handle CORS or have the backend do this.
        // For this demo, we assume the productImage URL is accessible or we might need to mock this part if CORS blocks.
        // To be safe in a frontend-only demo without proxy, we will rely on the user knowing they might need a proxy or we use a placeholder if fetch fails.
        try {
            const res = await fetch(productImage);
            const blob = await res.blob();
            return await fileToGenerativePart(new File([blob], "product.jpg", { type: blob.type }));
        } catch (e) {
            console.error("CORS error likely", e);
            return null; 
        }
    })();

    if (!productBase64) {
        throw new Error("Could not process product image");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          { inlineData: { mimeType: userImage.type, data: userBase64 } },
          { inlineData: { mimeType: "image/jpeg", data: productBase64 } }, // Assuming jpeg for product
          { text: "Generate a realistic image of the person in the first image wearing the clothing item in the second image. Maintain the person's pose and features. Ensure the fit looks natural." }
        ]
      }
    });

     if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;

  } catch (error) {
    console.error("Error virtual try on:", error);
    return null;
  }
};
