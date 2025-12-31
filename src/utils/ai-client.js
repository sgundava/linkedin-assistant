/**
 * AI Provider Client
 * 
 * Handles API calls to different AI providers
 * Currently supports: Anthropic (Claude), OpenAI
 */

import { getApiKeys, getPreferences } from './storage.js';

const PROVIDER_CONFIG = {
  anthropic: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
    name: 'Claude (Anthropic)',
    keyUrl: 'https://console.anthropic.com/settings/keys'
  },
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    name: 'GPT-4o mini (OpenAI)',
    keyUrl: 'https://platform.openai.com/api-keys'
  }
};

/**
 * Generate a response using the configured AI provider
 * Routes through background script to avoid CORS issues
 */
export async function generateResponse(prompt, options = {}) {
  const apiKeys = await getApiKeys();
  const preferences = await getPreferences();

  const provider = options.provider || preferences.preferredProvider || 'anthropic';
  const apiKey = apiKeys[provider];

  if (!apiKey) {
    throw new Error(`No API key configured for ${PROVIDER_CONFIG[provider]?.name || provider}`);
  }

  // Proxy through background script (content scripts can't make cross-origin requests)
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'apiRequest',
        provider,
        apiKey,
        prompt,
        options
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      }
    );
  });
}

/**
 * Call Anthropic's Claude API
 */
async function callAnthropic(apiKey, prompt, options = {}) {
  const config = PROVIDER_CONFIG.anthropic;
  
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: options.model || config.model,
      max_tokens: options.maxTokens || 1024,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
  }
  
  const data = await response.json();
  return {
    text: data.content[0]?.text || '',
    provider: 'anthropic',
    model: config.model,
    usage: data.usage
  };
}

/**
 * Call OpenAI's API
 */
async function callOpenAI(apiKey, prompt, options = {}) {
  const config = PROVIDER_CONFIG.openai;
  
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: options.model || config.model,
      max_tokens: options.maxTokens || 1024,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }
  
  const data = await response.json();
  return {
    text: data.choices[0]?.message?.content || '',
    provider: 'openai',
    model: config.model,
    usage: data.usage
  };
}

/**
 * Build a URL to open ChatGPT/Claude web interface with pre-filled prompt
 * (Zero-config fallback)
 */
export function buildWebInterfaceUrl(prompt, provider = 'anthropic') {
  const encodedPrompt = encodeURIComponent(prompt);
  
  switch (provider) {
    case 'anthropic':
      // Claude.ai doesn't support URL-based prompt prefilling yet
      // So we copy to clipboard and open the site
      return {
        url: 'https://claude.ai/new',
        copyPrompt: true
      };
    case 'openai':
      // ChatGPT supports some URL params
      return {
        url: `https://chat.openai.com/?q=${encodedPrompt}`,
        copyPrompt: false
      };
    default:
      return {
        url: 'https://claude.ai/new',
        copyPrompt: true
      };
  }
}

/**
 * Get provider configuration for UI display
 */
export function getProviderConfig(provider) {
  return PROVIDER_CONFIG[provider] || null;
}

/**
 * Get all available providers
 */
export function getAvailableProviders() {
  return Object.entries(PROVIDER_CONFIG).map(([key, config]) => ({
    id: key,
    name: config.name,
    keyUrl: config.keyUrl
  }));
}

/**
 * Check which providers have keys configured
 */
export async function getConfiguredProviders() {
  const apiKeys = await getApiKeys();
  const providers = getAvailableProviders();
  
  return providers.map(p => ({
    ...p,
    configured: !!apiKeys[p.id]
  }));
}
