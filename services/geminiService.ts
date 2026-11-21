import type { OutfitSuggestion, TrendReport } from "../types";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "https://styfi-backend.vishwajeetadkine705.workers.dev"
).replace(/\/$/, "");

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TRYON_IMAGE_BYTES = 6 * 1024 * 1024;

type ImageResult = { type: "image"; data: string } | { type: "guide"; data: string };

interface ApiImageResponse {
  method?: "imagen" | "guide";
  imageData?: string;
  mimeType?: string;
  enhancementGuide?: string;
  visualizationGuide?: string;
  error?: string;
}

async function postJson<T>(path: string, body: unknown, timeoutMs = 120_000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        payload && typeof payload.error === "string"
          ? payload.error
          : `Styfi API request failed (${response.status}).`;
      throw new Error(message);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The AI request took too long. Please try again.");
    }
    if (error instanceof TypeError) {
      throw new Error(
        "Could not connect to Styfi's AI backend. Check the Worker URL and its allowed frontend origin (CORS)."
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const fileToGenerativePart = async (file: File): Promise<string> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Images must be 8 MB or smaller.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const separator = result.indexOf(",");
      if (separator < 0) {
        reject(new Error("Could not read the selected image."));
        return;
      }
      resolve(result.slice(separator + 1));
    };
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
};

export const getTrends = async (category: string): Promise<TrendReport[]> => {
  const data = await postJson<TrendReport[]>("/api/trends", { category });
  if (!Array.isArray(data)) throw new Error("The AI returned an invalid trend response.");
  return data;
};

export const composeOutfit = async (
  productName: string,
  productCategory: string
): Promise<OutfitSuggestion[]> => {
  const data = await postJson<OutfitSuggestion[]>("/api/compose-outfit", {
    productName,
    productCategory,
  });
  if (!Array.isArray(data)) throw new Error("The AI returned an invalid outfit response.");
  return data;
};

function parseImageResponse(
  data: ApiImageResponse,
  guideField: "enhancementGuide" | "visualizationGuide"
): ImageResult {
  if (data.method === "imagen" && data.imageData) {
    return {
      type: "image",
      data: `data:${data.mimeType || "image/png"};base64,${data.imageData}`,
    };
  }

  const guide = data[guideField];
  if (data.method === "guide" && guide) {
    return { type: "guide", data: guide };
  }

  throw new Error("The image model returned an unsupported response.");
}

export const enhanceProductImage = async (
  imageFile: File,
  description: string
): Promise<ImageResult> => {
  const imageData = await fileToGenerativePart(imageFile);
  const data = await postJson<ApiImageResponse>(
    "/api/enhance-image",
    {
      imageData,
      mimeType: imageFile.type,
      description,
    },
    180_000
  );
  return parseImageResponse(data, "enhancementGuide");
};

async function fetchImageAsGenerativePart(
  imageUrl: string,
  maxBytes = MAX_IMAGE_BYTES
): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("Could not load the selected product image. Please try another product.");
  }

  const blob = await response.blob();
  const mimeType = blob.type || "image/jpeg";
  if (!mimeType.startsWith("image/")) {
    throw new Error("The selected product URL did not return an image.");
  }
  if (blob.size > maxBytes) {
    throw new Error(`The selected product image must be ${Math.floor(maxBytes / (1024 * 1024))} MB or smaller.`);
  }

  const file = new File([blob], "styfi-product-image", { type: mimeType });
  return { data: await fileToGenerativePart(file), mimeType };
}

export const tryOnVirtual = async (
  userImage: File,
  productImage: string
): Promise<ImageResult> => {
  if (userImage.size > MAX_TRYON_IMAGE_BYTES) {
    throw new Error("For virtual try-on, your photo must be 6 MB or smaller.");
  }

  const [userImageData, product] = await Promise.all([
    fileToGenerativePart(userImage),
    fetchImageAsGenerativePart(productImage, MAX_TRYON_IMAGE_BYTES),
  ]);

  const data = await postJson<ApiImageResponse>(
    "/api/virtual-tryon",
    {
      userImageData,
      userMimeType: userImage.type,
      productImageData: product.data,
      productMimeType: product.mimeType,
    },
    180_000
  );

  return parseImageResponse(data, "visualizationGuide");
};
