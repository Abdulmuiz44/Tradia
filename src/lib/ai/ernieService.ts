// src/lib/ai/ernieService.ts
/**
 * ERNIE-4.5-VL-28B-A3B Vision Model Service
 * Integrates Baidu's ERNIE model via Novita API for image-based trading analysis
 */

import axios, { AxiosError } from 'axios';

/**
 * Configuration for ERNIE API
 */
interface ErnieConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/**
 * Image content for vision requests
 */
interface ImageContent {
  type: 'image_url';
  image_url: {
    url: string; // Can be base64 encoded: data:image/jpeg;base64,... or URL
    detail?: 'auto' | 'low' | 'high';
  };
}

/**
 * Text content for messages
 */
interface TextContent {
  type: 'text';
  text: string;
}

/**
 * Message content can be string or array of content parts
 */
type MessageContent = string | Array<TextContent | ImageContent>;

/**
 * Chat message structure
 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: MessageContent;
}

/**
 * Request body for ERNIE API
 */
interface ErnieRequest {
  model: string;
  messages: ChatMessage[];
  enable_thinking: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

/**
 * Response from ERNIE API
 */
interface ErnieResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string; // Final answer
      reasoning_content?: string; // Chain-of-thought reasoning (when enable_thinking is true)
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Parsed result from ERNIE service
 */
export interface ErnieResult {
  content: string; // Final answer to return to frontend
  reasoning?: string; // Chain-of-thought (logged but not sent to frontend)
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Error structure for ERNIE API failures
 */
export interface ErnieError {
  error: string;
  details?: any;
  statusCode?: number;
}

/**
 * ERNIE Service for vision-based trading analysis
 */
export class ErnieService {
  private config: ErnieConfig;

  constructor(config?: Partial<ErnieConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.ERNIE_API_KEY || '',
      baseUrl: config?.baseUrl || process.env.ERNIE_API_BASE_URL || 'https://api.novita.ai/openai',
      model: config?.model || 'baidu/ernie-4.5-vl-28b-a3b',
    };

    if (!this.config.apiKey) {
      console.warn('ERNIE_API_KEY is not configured. ERNIE service will not be available.');
    }
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.baseUrl);
  }

  /**
   * Analyze an image with a text prompt using ERNIE vision model
   * @param imageData - Base64 encoded image data or image URL
   * @param prompt - Text prompt/question about the image
   * @param systemPrompt - Optional system prompt for context
   * @returns Promise<ErnieResult> - Parsed response with content and reasoning
   */
  async analyzeImage(
    imageData: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<ErnieResult> {
    if (!this.isConfigured()) {
      throw new Error('ERNIE service is not configured. Please set ERNIE_API_KEY and ERNIE_API_BASE_URL.');
    }

    try {
      // Construct the messages array
      const messages: ChatMessage[] = [];

      // Add system prompt if provided
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }

      // Prepare image URL (ensure it's in the correct format)
      let imageUrl = imageData;
      if (!imageData.startsWith('http') && !imageData.startsWith('data:')) {
        // Assume it's base64 encoded, add the data URL prefix
        imageUrl = `data:image/jpeg;base64,${imageData}`;
      }

      // Add user message with both image and text
      messages.push({
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high', // Use high detail for trading chart analysis
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      });

      // Prepare request body
      const requestBody: ErnieRequest = {
        model: this.config.model,
        messages,
        enable_thinking: true, // Enable reasoning mode
        temperature: 0.7,
        max_tokens: 2000,
      };

      // Make API request
      const response = await axios.post<ErnieResponse>(
        `${this.config.baseUrl}/v1/chat/completions`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          timeout: 60000, // 60 second timeout
        }
      );

      // Parse response
      const choice = response.data.choices[0];
      if (!choice || !choice.message) {
        throw new Error('Invalid response from ERNIE API: missing message');
      }

      const result: ErnieResult = {
        content: choice.message.content,
        reasoning: choice.message.reasoning_content,
        model: response.data.model,
        usage: response.data.usage,
      };

      // Log reasoning for debugging (not sent to frontend)
      if (result.reasoning) {
        console.log('[ERNIE] Chain-of-thought reasoning:', result.reasoning);
      }

      return result;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Handle errors from ERNIE API
   */
  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status;
      const errorData = axiosError.response?.data as any;

      const ernieError: ErnieError = {
        error: errorData?.error?.message || axiosError.message || 'ERNIE API request failed',
        details: errorData,
        statusCode,
      };

      console.error('[ERNIE] API Error:', {
        statusCode,
        message: ernieError.error,
        details: ernieError.details,
      });

      throw new Error(`ERNIE API Error (${statusCode || 'unknown'}): ${ernieError.error}`);
    }

    if (error instanceof Error) {
      console.error('[ERNIE] Service Error:', error.message);
      throw error;
    }

    console.error('[ERNIE] Unknown Error:', error);
    throw new Error('Unknown error occurred while calling ERNIE API');
  }

  /**
   * Analyze multiple images in a batch
   * @param images - Array of image data (base64 or URLs)
   * @param prompt - Text prompt/question about the images
   * @param systemPrompt - Optional system prompt
   * @returns Promise<ErnieResult> - Parsed response
   */
  async analyzeMultipleImages(
    images: string[],
    prompt: string,
    systemPrompt?: string
  ): Promise<ErnieResult> {
    if (!this.isConfigured()) {
      throw new Error('ERNIE service is not configured. Please set ERNIE_API_KEY and ERNIE_API_BASE_URL.');
    }

    if (images.length === 0) {
      throw new Error('At least one image is required');
    }

    try {
      const messages: ChatMessage[] = [];

      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }

      // Build content array with all images and the text prompt
      const contentParts: Array<TextContent | ImageContent> = [];

      // Add all images
      images.forEach((imageData) => {
        let imageUrl = imageData;
        if (!imageData.startsWith('http') && !imageData.startsWith('data:')) {
          imageUrl = `data:image/jpeg;base64,${imageData}`;
        }

        contentParts.push({
          type: 'image_url',
          image_url: {
            url: imageUrl,
            detail: 'high',
          },
        });
      });

      // Add text prompt
      contentParts.push({
        type: 'text',
        text: prompt,
      });

      messages.push({
        role: 'user',
        content: contentParts,
      });

      const requestBody: ErnieRequest = {
        model: this.config.model,
        messages,
        enable_thinking: true,
        temperature: 0.7,
        max_tokens: 2000,
      };

      const response = await axios.post<ErnieResponse>(
        `${this.config.baseUrl}/v1/chat/completions`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          timeout: 90000, // 90 second timeout for multiple images
        }
      );

      const choice = response.data.choices[0];
      if (!choice || !choice.message) {
        throw new Error('Invalid response from ERNIE API: missing message');
      }

      const result: ErnieResult = {
        content: choice.message.content,
        reasoning: choice.message.reasoning_content,
        model: response.data.model,
        usage: response.data.usage,
      };

      if (result.reasoning) {
        console.log('[ERNIE] Chain-of-thought reasoning (multi-image):', result.reasoning);
      }

      return result;
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Singleton instance
let ernieServiceInstance: ErnieService | null = null;

/**
 * Get or create ERNIE service instance
 */
export function getErnieService(config?: Partial<ErnieConfig>): ErnieService {
  if (!ernieServiceInstance) {
    ernieServiceInstance = new ErnieService(config);
  }
  return ernieServiceInstance;
}

/**
 * Helper to check if ERNIE service should be used
 */
export function shouldUseErnie(hasImages: boolean): boolean {
  const service = getErnieService();
  return hasImages && service.isConfigured();
}
