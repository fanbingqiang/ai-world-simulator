import axios from 'axios';
import { Semaphore } from 'async-mutex';

const CONFIG = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  temperature: 1.2,
  maxTokens: 2048,
  maxConcurrent: 5,
  timeout: 30000
};

const semaphore = new Semaphore(CONFIG.maxConcurrent);

export class DeepSeekService {
  // 调用 DeepSeek API，带速率限制
  async chatCompletion(messages: { role: string; content: string }[], opts?: {
    temperature?: number; responseFormat?: { type: string }; maxTokens?: number
  }): Promise<string> {
    const [release] = await semaphore.acquire();
    try {
      const res = await axios.post(`${CONFIG.baseUrl}/chat/completions`, {
        model: CONFIG.model,
        messages,
        temperature: opts?.temperature ?? CONFIG.temperature,
        max_tokens: opts?.maxTokens ?? CONFIG.maxTokens,
        response_format: opts?.responseFormat ?? { type: 'text' },
      }, {
        headers: { 'Authorization': `Bearer ${CONFIG.apiKey}`, 'Content-Type': 'application/json' },
        timeout: CONFIG.timeout
      });
      return res.data.choices[0].message.content;
    } finally {
      release();
    }
  }
}
