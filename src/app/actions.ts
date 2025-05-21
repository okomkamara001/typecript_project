"use server";

import { z } from "zod";

const ImageUrlSchema = z.string().url({ message: "Invalid URL format." });

interface ConversionResult {
  success: boolean;
  dataUrl?: string;
  error?: string;
}

export async function convertImageUrlToDataUrlAction(imageUrl: string): Promise<ConversionResult> {
  try {
    const validation = ImageUrlSchema.safeParse(imageUrl);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const response = await fetch(imageUrl, {
        headers: {
            // Some sites might block requests without a common user agent
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });
    
    if (!response.ok) {
      // Try to get more specific error message if possible
      let errorText = `Failed to fetch image. Status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          errorText = errorData.message;
        } else if (response.statusText) {
            errorText = `Failed to fetch image: ${response.statusText}`;
        }
      } catch (jsonError) {
        // Ignore if response is not JSON
         if (response.statusText) {
            errorText = `Failed to fetch image: ${response.statusText}`;
        }
      }
      return { success: false, error: errorText };
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      return { success: false, error: "Invalid content type. URL does not point to an image. Found: " + contentType };
    }

    const imageBuffer = await response.arrayBuffer();
    if (imageBuffer.byteLength === 0) {
        return { success: false, error: "Fetched image is empty." };
    }
    // Limit size to prevent server overload, e.g., 10MB
    if (imageBuffer.byteLength > 10 * 1024 * 1024) {
        return { success: false, error: "Image size exceeds 10MB limit." };
    }

    const base64Data = Buffer.from(imageBuffer).toString("base64");
    return { success: true, dataUrl: `data:${contentType};base64,${base64Data}` };

  } catch (e: any) {
    console.error("Error converting image URL to data URL:", e);
    let errorMessage = "Failed to convert image URL.";
    if (e instanceof Error) {
        errorMessage = e.message;
    } else if (typeof e === 'string') {
        errorMessage = e;
    }
    // Check for specific errors
    if (errorMessage.includes('fetch')) { // TypeError: fetch failed
        errorMessage = "Network error or invalid URL. Could not fetch the image."
    }
    return { success: false, error: errorMessage };
  }
}
