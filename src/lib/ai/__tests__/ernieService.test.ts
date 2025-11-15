// src/lib/ai/__tests__/ernieService.test.ts
/**
 * Unit tests for ERNIE Vision Service
 */

import axios from 'axios';
import { ErnieService, getErnieService, shouldUseErnie, ErnieResult } from '../ernieService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ErnieService', () => {
  let ernieService: ErnieService;
  const mockApiKey = 'test-api-key-12345';
  const mockBaseUrl = 'https://api.novita.ai/openai';

  beforeEach(() => {
    // Reset environment variables
    process.env.ERNIE_API_KEY = mockApiKey;
    process.env.ERNIE_API_BASE_URL = mockBaseUrl;

    // Create fresh service instance
    ernieService = new ErnieService({
      apiKey: mockApiKey,
      baseUrl: mockBaseUrl,
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.ERNIE_API_KEY;
    delete process.env.ERNIE_API_BASE_URL;
  });

  describe('constructor', () => {
    it('should create ErnieService with provided config', () => {
      const service = new ErnieService({
        apiKey: 'custom-key',
        baseUrl: 'https://custom-url.com',
        model: 'custom-model',
      });

      expect(service).toBeInstanceOf(ErnieService);
      expect(service.isConfigured()).toBe(true);
    });

    it('should use environment variables when config not provided', () => {
      const service = new ErnieService();
      expect(service.isConfigured()).toBe(true);
    });

    it('should warn when API key is missing', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      delete process.env.ERNIE_API_KEY;
      const service = new ErnieService();
      
      expect(service.isConfigured()).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'ERNIE_API_KEY is not configured. ERNIE service will not be available.'
      );
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('isConfigured', () => {
    it('should return true when properly configured', () => {
      expect(ernieService.isConfigured()).toBe(true);
    });

    it('should return false when API key is missing', () => {
      const service = new ErnieService({
        apiKey: '',
        baseUrl: mockBaseUrl,
      });
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('analyzeImage', () => {
    const mockImageData = 'base64encodedimagedata';
    const mockPrompt = 'Analyze this trading chart';
    const mockSystemPrompt = 'You are a trading expert analyzing charts';

    const mockApiResponse = {
      data: {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1699999999,
        model: 'baidu/ernie-4.5-vl-28b-a3b',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant' as const,
              content: 'The chart shows a bullish trend with strong support levels.',
              reasoning_content: 'First, I analyzed the trend lines... Then I identified support levels...',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 75,
          total_tokens: 225,
        },
      },
    };

    it('should successfully analyze an image with text prompt', async () => {
      mockedAxios.post.mockResolvedValue(mockApiResponse);

      const result = await ernieService.analyzeImage(mockImageData, mockPrompt, mockSystemPrompt);

      expect(result).toEqual({
        content: 'The chart shows a bullish trend with strong support levels.',
        reasoning: 'First, I analyzed the trend lines... Then I identified support levels...',
        model: 'baidu/ernie-4.5-vl-28b-a3b',
        usage: {
          prompt_tokens: 150,
          completion_tokens: 75,
          total_tokens: 225,
        },
      });

      // Verify API call
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockBaseUrl}/v1/chat/completions`,
        expect.objectContaining({
          model: 'baidu/ernie-4.5-vl-28b-a3b',
          enable_thinking: true,
          messages: expect.arrayContaining([
            { role: 'system', content: mockSystemPrompt },
            {
              role: 'user',
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'image_url',
                  image_url: expect.objectContaining({
                    url: expect.stringContaining(mockImageData),
                    detail: 'high',
                  }),
                }),
                {
                  type: 'text',
                  text: mockPrompt,
                },
              ]),
            },
          ]),
        }),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockApiKey}`,
          },
          timeout: 60000,
        })
      );
    });

    it('should handle image data with data URL prefix', async () => {
      mockedAxios.post.mockResolvedValue(mockApiResponse);

      const dataUrl = 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
      await ernieService.analyzeImage(dataUrl, mockPrompt);

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs[1] as any;
      const userMessage = requestBody.messages.find((m: any) => m.role === 'user');
      const imageContent = userMessage.content.find((c: any) => c.type === 'image_url');

      expect(imageContent.image_url.url).toBe(dataUrl);
    });

    it('should handle image data with HTTP URL', async () => {
      mockedAxios.post.mockResolvedValue(mockApiResponse);

      const httpUrl = 'https://example.com/chart.png';
      await ernieService.analyzeImage(httpUrl, mockPrompt);

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs[1] as any;
      const userMessage = requestBody.messages.find((m: any) => m.role === 'user');
      const imageContent = userMessage.content.find((c: any) => c.type === 'image_url');

      expect(imageContent.image_url.url).toBe(httpUrl);
    });

    it('should log reasoning content', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      mockedAxios.post.mockResolvedValue(mockApiResponse);

      await ernieService.analyzeImage(mockImageData, mockPrompt);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ERNIE] Chain-of-thought reasoning:',
        'First, I analyzed the trend lines... Then I identified support levels...'
      );

      consoleLogSpy.mockRestore();
    });

    it('should work without system prompt', async () => {
      mockedAxios.post.mockResolvedValue(mockApiResponse);

      await ernieService.analyzeImage(mockImageData, mockPrompt);

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs[1] as any;
      const hasSystemMessage = requestBody.messages.some((m: any) => m.role === 'system');

      expect(hasSystemMessage).toBe(false);
    });

    it('should throw error when not configured', async () => {
      const unconfiguredService = new ErnieService({ apiKey: '' });

      await expect(
        unconfiguredService.analyzeImage(mockImageData, mockPrompt)
      ).rejects.toThrow('ERNIE service is not configured');
    });

    it('should handle API errors with status code', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: {
            error: {
              message: 'Invalid API key',
            },
          },
        },
        isAxiosError: true,
        message: 'Request failed',
      };

      mockedAxios.post.mockRejectedValue(errorResponse);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(
        ernieService.analyzeImage(mockImageData, mockPrompt)
      ).rejects.toThrow('ERNIE API Error (401): Invalid API key');
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Network error');
      mockedAxios.post.mockRejectedValue(genericError);
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(
        ernieService.analyzeImage(mockImageData, mockPrompt)
      ).rejects.toThrow('Network error');
    });

    it('should handle invalid API response', async () => {
      const invalidResponse = {
        data: {
          choices: [],
        },
      };

      mockedAxios.post.mockResolvedValue(invalidResponse);

      await expect(
        ernieService.analyzeImage(mockImageData, mockPrompt)
      ).rejects.toThrow('Invalid response from ERNIE API: missing message');
    });
  });

  describe('analyzeMultipleImages', () => {
    const mockImages = [
      'base64image1',
      'data:image/jpeg;base64,image2',
      'https://example.com/image3.png',
    ];
    const mockPrompt = 'Compare these trading charts';

    const mockApiResponse = {
      data: {
        id: 'chatcmpl-456',
        object: 'chat.completion',
        created: 1699999999,
        model: 'baidu/ernie-4.5-vl-28b-a3b',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant' as const,
              content: 'All three charts show similar patterns.',
              reasoning_content: 'Comparing the images, I see...',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 300,
          completion_tokens: 100,
          total_tokens: 400,
        },
      },
    };

    it('should successfully analyze multiple images', async () => {
      mockedAxios.post.mockResolvedValue(mockApiResponse);

      const result = await ernieService.analyzeMultipleImages(mockImages, mockPrompt);

      expect(result.content).toBe('All three charts show similar patterns.');
      expect(result.reasoning).toBe('Comparing the images, I see...');

      // Verify all images are included
      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs[1] as any;
      const userMessage = requestBody.messages.find((m: any) => m.role === 'user');
      const imageContents = userMessage.content.filter((c: any) => c.type === 'image_url');

      expect(imageContents).toHaveLength(3);
    });

    it('should throw error when no images provided', async () => {
      await expect(
        ernieService.analyzeMultipleImages([], mockPrompt)
      ).rejects.toThrow('At least one image is required');
    });

    it('should use longer timeout for multiple images', async () => {
      mockedAxios.post.mockResolvedValue(mockApiResponse);

      await ernieService.analyzeMultipleImages(mockImages, mockPrompt);

      const callArgs = mockedAxios.post.mock.calls[0];
      const config = callArgs[2];

      expect(config.timeout).toBe(90000);
    });
  });

  describe('getErnieService', () => {
    it('should return singleton instance', () => {
      const instance1 = getErnieService();
      const instance2 = getErnieService();

      expect(instance1).toBe(instance2);
    });
  });

  describe('shouldUseErnie', () => {
    it('should return true when has images and service is configured', () => {
      process.env.ERNIE_API_KEY = mockApiKey;
      const result = shouldUseErnie(true);
      expect(result).toBe(true);
    });

    it('should return false when no images', () => {
      process.env.ERNIE_API_KEY = mockApiKey;
      const result = shouldUseErnie(false);
      expect(result).toBe(false);
    });

    it('should return false when service not configured', () => {
      delete process.env.ERNIE_API_KEY;
      const result = shouldUseErnie(true);
      expect(result).toBe(false);
    });
  });
});


  describe('constructor', () => {
    it('should create ErnieService with provided config', () => {
      const service = new ErnieService({
        apiKey: 'custom-key',
        baseUrl: 'https://custom-url.com',
        model: 'custom-model',
      });

      expect(service).toBeInstanceOf(ErnieService);
      expect(service.isConfigured()).toBe(true);
    });

    it('should use environment variables when config not provided', () => {
      const service = new ErnieService();
      expect(service.isConfigured()).toBe(true);
    });

    it('should warn when API key is missing', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      delete process.env.ERNIE_API_KEY;
      const service = new ErnieService();
      
      expect(service.isConfigured()).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'ERNIE_API_KEY is not configured. ERNIE service will not be available.'
      );
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('isConfigured', () => {
    it('should return true when properly configured', () => {
      expect(ernieService.isConfigured()).toBe(true);
    });

    it('should return false when API key is missing', () => {
      const service = new ErnieService({
        apiKey: '',
        baseUrl: mockBaseUrl,
      });
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('analyzeImage', () => {
    const mockImageData = 'base64encodedimagedata';
    const mockPrompt = 'Analyze this trading chart';
    const mockSystemPrompt = 'You are a trading expert analyzing charts';

    const mockApiResponse = {
      data: {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1699999999,
        model: 'baidu/ernie-4.5-vl-28b-a3b',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant' as const,
              content: 'The chart shows a bullish trend with strong support levels.',
              reasoning_content: 'First, I analyzed the trend lines... Then I identified support levels...',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 75,
          total_tokens: 225,
        },
      },
    };

    it('should successfully analyze an image with text prompt', async () => {
      mockedAxios.post.mockResolvedValue(mockApiResponse);

      const result = await ernieService.analyzeImage(mockImageData, mockPrompt, mockSystemPrompt);

      expect(result).toEqual({
        content: 'The chart shows a bullish trend with strong support levels.',
        reasoning: 'First, I analyzed the trend lines... Then I identified support levels...',
        model: 'baidu/ernie-4.5-vl-28b-a3b',
        usage: {
          prompt_tokens: 150,
          completion_tokens: 75,
          total_tokens: 225,
        },
      });

      // Verify API call
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockBaseUrl}/v1/chat/completions`,
        expect.objectContaining({
          model: 'baidu/ernie-4.5-vl-28b-a3b',
          enable_thinking: true,
          messages: expect.arrayContaining([
            { role: 'system', content: mockSystemPrompt },
            {
              role: 'user',
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'image_url',
                  image_url: expect.objectContaining({
                    url: expect.stringContaining(mockImageData),
                    detail: 'high',
                  }),
                }),
                {
                  type: 'text',
                  text: mockPrompt,
                },
              ]),
            },
          ]),
        }),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockApiKey}`,
          },
          timeout: 60000,
        })
      );
    });

    it('should handle image data with data URL prefix', async () => {
      mockedAxios.post.mockResolvedValue(mockApiResponse);

      const dataUrl = 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
      await ernieService.analyzeImage(dataUrl, mockPrompt);

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs[1] as any;
      const userMessage = requestBody.messages.find((m: any) => m.role === 'user');
      const imageContent = userMessage.content.find((c: any) => c.type === 'image_url');

      expect(imageContent.image_url.url).toBe(dataUrl);
    });

    it('should handle image data with HTTP URL', async () => {
      mockedAxios.post.mockResolvedValue(mockApiResponse);

      const httpUrl = 'https://example.com/chart.png';
      await ernieService.analyzeImage(httpUrl, mockPrompt);

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs[1] as any;
      const userMessage = requestBody.messages.find((m: any) => m.role === 'user');
      const imageContent = userMessage.content.find((c: any) => c.type === 'image_url');

      expect(imageContent.image_url.url).toBe(httpUrl);
    });

    it('should log reasoning content', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockedAxios.post.mockResolvedValue(mockApiResponse);

      await ernieService.analyzeImage(mockImageData, mockPrompt);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ERNIE] Chain-of-thought reasoning:',
        'First, I analyzed the trend lines... Then I identified support levels...'
      );

      consoleLogSpy.mockRestore();
    });

    it('should work without system prompt', async () => {
      mockedAxios.post.mockResolvedValue(mockApiResponse);

      await ernieService.analyzeImage(mockImageData, mockPrompt);

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs[1] as any;
      const hasSystemMessage = requestBody.messages.some((m: any) => m.role === 'system');

      expect(hasSystemMessage).toBe(false);
    });

    it('should throw error when not configured', async () => {
      const unconfiguredService = new ErnieService({ apiKey: '' });

      await expect(
        unconfiguredService.analyzeImage(mockImageData, mockPrompt)
      ).rejects.toThrow('ERNIE service is not configured');
    });

    it('should handle API errors with status code', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: {
            error: {
              message: 'Invalid API key',
            },
          },
        },
        isAxiosError: true,
        message: 'Request failed',
      };

      mockedAxios.post.mockRejectedValue(errorResponse);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(
        ernieService.analyzeImage(mockImageData, mockPrompt)
      ).rejects.toThrow('ERNIE API Error (401): Invalid API key');
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Network error');
      mockedAxios.post.mockRejectedValue(genericError);
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(
        ernieService.analyzeImage(mockImageData, mockPrompt)
      ).rejects.toThrow('Network error');
    });

    it('should handle invalid API response', async () => {
      const invalidResponse = {
        data: {
          choices: [],
        },
      };

      mockedAxios.post.mockResolvedValue(invalidResponse);

      await expect(
        ernieService.analyzeImage(mockImageData, mockPrompt)
      ).rejects.toThrow('Invalid response from ERNIE API: missing message');
    });
  });

  describe('analyzeMultipleImages', () => {
    const mockImages = [
      'base64image1',
      'data:image/jpeg;base64,image2',
      'https://example.com/image3.png',
    ];
    const mockPrompt = 'Compare these trading charts';

    const mockApiResponse = {
      data: {
        id: 'chatcmpl-456',
        object: 'chat.completion',
        created: 1699999999,
        model: 'baidu/ernie-4.5-vl-28b-a3b',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant' as const,
              content: 'All three charts show similar patterns.',
              reasoning_content: 'Comparing the images, I see...',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 300,
          completion_tokens: 100,
          total_tokens: 400,
        },
      },
    };

    it('should successfully analyze multiple images', async () => {
      mockedAxios.post.mockResolvedValue(mockApiResponse);

      const result = await ernieService.analyzeMultipleImages(mockImages, mockPrompt);

      expect(result.content).toBe('All three charts show similar patterns.');
      expect(result.reasoning).toBe('Comparing the images, I see...');

      // Verify all images are included
      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs[1] as any;
      const userMessage = requestBody.messages.find((m: any) => m.role === 'user');
      const imageContents = userMessage.content.filter((c: any) => c.type === 'image_url');

      expect(imageContents).toHaveLength(3);
    });

    it('should throw error when no images provided', async () => {
      await expect(
        ernieService.analyzeMultipleImages([], mockPrompt)
      ).rejects.toThrow('At least one image is required');
    });

    it('should use longer timeout for multiple images', async () => {
      mockedAxios.post.mockResolvedValue(mockApiResponse);

      await ernieService.analyzeMultipleImages(mockImages, mockPrompt);

      const callArgs = mockedAxios.post.mock.calls[0];
      const config = callArgs[2];

      expect(config.timeout).toBe(90000);
    });
  });

  describe('getErnieService', () => {
    it('should return singleton instance', () => {
      const instance1 = getErnieService();
      const instance2 = getErnieService();

      expect(instance1).toBe(instance2);
    });
  });

  describe('shouldUseErnie', () => {
    it('should return true when has images and service is configured', () => {
      process.env.ERNIE_API_KEY = mockApiKey;
      const result = shouldUseErnie(true);
      expect(result).toBe(true);
    });

    it('should return false when no images', () => {
      process.env.ERNIE_API_KEY = mockApiKey;
      const result = shouldUseErnie(false);
      expect(result).toBe(false);
    });

    it('should return false when service not configured', () => {
      delete process.env.ERNIE_API_KEY;
      const result = shouldUseErnie(true);
      expect(result).toBe(false);
    });
  });
});
