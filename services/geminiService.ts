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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Trends API error:', errorText);
      throw new Error(`Failed to fetch trends: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching trends:", error);
    // Return fallback data
    return [
      { 
        trendName: "Eco-Minimalism", 
        description: "Sustainable fabrics in neutral tones with clean lines.", 
        popularityScore: 88, 
        keyKeywords: ["Linen", "Beige", "Organic", "Sustainable"] 
      },
      { 
        trendName: "Retro Sport", 
        description: "90s athletic wear revival with bold colors.", 
        popularityScore: 75, 
        keyKeywords: ["Windbreaker", "Neon", "Chunky Sneakers", "Vintage"] 
      },
      { 
        trendName: "Modern Tailoring", 
        description: "Structured pieces with contemporary silhouettes.", 
        popularityScore: 82, 
        keyKeywords: ["Blazer", "Wide-leg", "Minimal", "Structured"] 
      }
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Compose outfit API error:', errorText);
      throw new Error(`Failed to compose outfit: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error composing outfit:", error);
    // Return fallback suggestions
    return [
      {
        name: "Classic Denim Jeans",
        reason: "A timeless piece that pairs well with most tops, creating a balanced casual look.",
        estimatedPrice: "$60-$90",
        color: "Dark Blue"
      },
      {
        name: "White Canvas Sneakers",
        reason: "Versatile footwear that complements the outfit while keeping it comfortable and stylish.",
        estimatedPrice: "$50-$80",
        color: "White"
      },
      {
        name: "Leather Crossbody Bag",
        reason: "Adds a sophisticated touch and practical functionality to complete the ensemble.",
        estimatedPrice: "$70-$120",
        color: "Tan"
      }
    ];
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Enhance image API error:', errorText);
      throw new Error(`Failed to enhance image: ${response.status}`);
    }
    
    const data = await response.json();
    return `data:${data.mimeType};base64,${data.imageData}`;
  } catch (error) {
    console.error("Error enhancing image:", error);
    alert("Failed to enhance image. Please check your API configuration and try again.");
    return null;
  }
};

export const tryOnVirtual = async (userImage: File, productImage: string): Promise<string | null> => {
  try {
    const userBase64 = await fileToGenerativePart(userImage);
    
    // Fetch and convert product image to base64
    const productBase64 = await (async () => {
      try {
        const res = await fetch(productImage);
        const blob = await res.blob();
        const file = new File([blob], "product.jpg", { type: blob.type });
        return await fileToGenerativePart(file);
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Virtual try-on API error:', errorText);
      throw new Error(`Failed to generate try-on: ${response.status}`);
    }
    
    const data = await response.json();
    return `data:${data.mimeType};base64,${data.imageData}`;
  } catch (error) {
    console.error("Error virtual try on:", error);
    alert("Failed to generate virtual try-on. Please check your API configuration and try again.");
    return null;
  }
};
