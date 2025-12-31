/**
 * Storage Utility
 * 
 * Handles the split between:
 * - chrome.storage.sync: templates, preferences (syncs across devices)
 * - chrome.storage.local: API keys (stays on device)
 */

// Default templates to seed new users
const DEFAULT_TEMPLATES = [
  {
    id: 'polite-decline',
    name: 'Polite Decline',
    category: 'decline',
    content: `Thanks for reaching out! I appreciate you thinking of me. Unfortunately, this isn't something I'm able to take on right now. Best of luck with your search!`
  },
  {
    id: 'need-more-info',
    name: 'Need More Info',
    category: 'clarify',
    content: `Thanks for the message! This sounds interesting. Could you share a bit more about [specific aspect]? That would help me understand if this might be a fit.`
  },
  {
    id: 'interested-schedule',
    name: 'Interested - Schedule Call',
    category: 'interested',
    content: `Thanks for reaching out — this looks interesting! I'd be happy to learn more. Would you have time for a quick call next week? Feel free to grab a slot here: [calendar link]`
  },
  {
    id: 'referral-request',
    name: 'Referral Request Response',
    category: 'referral',
    content: `Happy to help if I can! Could you tell me a bit more about what you're looking for? That way I can think about whether I know someone who might be a good fit.`
  }
];

// ========================
// SYNCED DATA (templates, preferences)
// ========================

export async function getTemplates() {
  const result = await chrome.storage.sync.get({ templates: DEFAULT_TEMPLATES });
  return result.templates;
}

export async function saveTemplate(template) {
  const templates = await getTemplates();
  const existingIndex = templates.findIndex(t => t.id === template.id);
  
  if (existingIndex >= 0) {
    templates[existingIndex] = template;
  } else {
    template.id = template.id || `custom-${Date.now()}`;
    templates.push(template);
  }
  
  await chrome.storage.sync.set({ templates });
  return templates;
}

export async function deleteTemplate(templateId) {
  const templates = await getTemplates();
  const filtered = templates.filter(t => t.id !== templateId);
  await chrome.storage.sync.set({ templates: filtered });
  return filtered;
}

export async function getPreferences() {
  const defaults = {
    defaultTone: 'professional',
    autoInsert: false, // If true, clicking template auto-inserts into compose
    showFloatingButton: true,
    preferredProvider: 'anthropic', // or 'openai'
  };
  
  const result = await chrome.storage.sync.get({ preferences: defaults });
  return result.preferences;
}

export async function savePreferences(preferences) {
  await chrome.storage.sync.set({ preferences });
}

// ========================
// LOCAL DATA (API keys - never synced)
// ========================

export async function getApiKeys() {
  const result = await chrome.storage.local.get({ apiKeys: {} });
  return result.apiKeys;
}

export async function saveApiKey(provider, key) {
  const apiKeys = await getApiKeys();
  apiKeys[provider] = key;
  await chrome.storage.local.set({ apiKeys });
}

export async function removeApiKey(provider) {
  const apiKeys = await getApiKeys();
  delete apiKeys[provider];
  await chrome.storage.local.set({ apiKeys });
}

export async function hasApiKey(provider) {
  const apiKeys = await getApiKeys();
  return !!apiKeys[provider];
}

// ========================
// VALIDATION HELPERS
// ========================

export function validateOpenAIKey(key) {
  // OpenAI keys start with 'sk-' and are ~51 chars
  return key && key.startsWith('sk-') && key.length > 40;
}

export function validateAnthropicKey(key) {
  // Anthropic keys start with 'sk-ant-'
  return key && key.startsWith('sk-ant-') && key.length > 40;
}

export function validateGeminiKey(key) {
  // Google AI keys start with 'AIza' and are ~39 chars
  return key && key.startsWith('AIza') && key.length > 30;
}

export function validateApiKey(provider, key) {
  switch (provider) {
    case 'openai':
      return validateOpenAIKey(key);
    case 'anthropic':
      return validateAnthropicKey(key);
    case 'gemini':
      return validateGeminiKey(key);
    default:
      return key && key.length > 20;
  }
}
