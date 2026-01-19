import { OutfitSuggestion, TrendReport } from "../types";

// Replace with your actual Cloudflare Worker URL after deployment
const API_BASE_URL = 'https://styfi-backend.vishwajeetadkine705.workers.dev';

export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const getTrends = async (category: string): Promise<TrendReport[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/trends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category })
    });

    if (!response.ok) throw new Error('Failed to fetch trends');
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching trends:", error);
    return [
      { trendName: "Eco-Minimalism", description: "Sustainable fabrics in neutral tones.", popularityScore: 88, keyKeywords: ["Linen", "Beige", "Organic"] },
      { trendName: "Retro Sport", description: "90s athletic wear revival.", popularityScore: 75, keyKeywords: ["Windbreaker", "Neon", "Chunky Sneakers"] },
    ];
  }
};

export const composeOutfit = async (productName: string, productCategory: string): Promise<OutfitSuggestion[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/compose-outfit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productName, productCategory })
    });

    if (!response.ok) throw new Error('Failed to compose outfit');
    
    return await response.json();
  } catch (error) {
    console.error("Error composing outfit:", error);
    return [];
  }
};

export const enhanceProductImage = async (imageFile: File, description: string): Promise<string | null> => {
  try {
    const base64Data = await fileToGenerativePart(imageFile);
    
    const response = await fetch(`${API_BASE_URL}/api/enhance-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData: base64Data,
        mimeType: imageFile.type,
        description
      })
    });

    if (!response.ok) throw new Error('Failed to enhance image');
    
    const data = await response.json();
    return `data:${data.mimeType};base64,${data.imageData}`;
  } catch (error) {
    console.error("Error enhancing image:", error);
    return null;
  }
};

export const tryOnVirtual = async (userImage: File, productImage: string): Promise<string | null> => {
  try {
    const userBase64 = await fileToGenerativePart(userImage);
    
    const productBase64 = await (async () => {
      try {
        const res = await fetch(productImage);
        const blob = await res.blob();
        return await fileToGenerativePart(new File([blob], "product.jpg", { type: blob.type }));
      } catch (e) {
        console.error("Could not fetch product image", e);
        return null; 
      }
    })();

    if (!productBase64) {
      throw new Error("Could not process product image");
    }

    const response = await fetch(`${API_BASE_URL}/api/virtual-tryon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userImageData: userBase64,
        userMimeType: userImage.type,
        productImageData: productBase64,
        productMimeType: "image/jpeg"
      })
    });

    if (!response.ok) throw new Error('Failed to generate try-on');
    
    const data = await response.json();
    return `data:${data.mimeType};base64,${data.imageData}`;
  } catch (error) {
    console.error("Error virtual try on:", error);
    return null;
  }
};
