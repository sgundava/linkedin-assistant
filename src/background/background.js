/**
 * Background Service Worker
 * 
 * Handles:
 * - Extension installation/update
 * - Cross-tab communication
 * - Context menu setup (optional future feature)
 */

// On install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[LinkedIn Assistant] Extension installed');
    
    // Open welcome/setup page on first install
    // chrome.tabs.create({ url: 'welcome.html' });
  } else if (details.reason === 'update') {
    console.log('[LinkedIn Assistant] Extension updated to', chrome.runtime.getManifest().version);
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Proxy API calls (content scripts can't make cross-origin requests)
  if (message.action === 'apiRequest') {
    handleApiRequest(message)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true; // Keep channel open for async response
  }

  // Forward message to active LinkedIn tab
  if (message.action === 'forwardToLinkedIn') {
    chrome.tabs.query({ url: 'https://www.linkedin.com/*', active: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, message.payload, sendResponse);
      } else {
        sendResponse({ error: 'No active LinkedIn tab found' });
      }
    });
    return true; // Keep channel open for async response
  }

  // Get current tab info
  if (message.action === 'getCurrentTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse(tabs[0] || null);
    });
    return true;
  }
});

/**
 * Handle API requests from content scripts
 */
async function handleApiRequest({ provider, apiKey, prompt, options = {} }) {
  const config = {
    anthropic: {
      endpoint: 'https://api.anthropic.com/v1/messages',
      model: 'claude-sonnet-4-20250514'
    },
    openai: {
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini'
    }
  };

  const providerConfig = config[provider];
  if (!providerConfig) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  if (provider === 'anthropic') {
    const response = await fetch(providerConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: options.model || providerConfig.model,
        max_tokens: options.maxTokens || 1024,
        messages: [{ role: 'user', content: prompt }]
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
      model: providerConfig.model,
      usage: data.usage
    };
  }

  if (provider === 'openai') {
    const response = await fetch(providerConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: options.model || providerConfig.model,
        max_tokens: options.maxTokens || 1024,
        messages: [{ role: 'user', content: prompt }]
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
      model: providerConfig.model,
      usage: data.usage
    };
  }
}

// Optional: Add context menu for quick actions
// chrome.contextMenus.create({
//   id: 'linkedin-assistant',
//   title: 'Draft response with AI',
//   contexts: ['selection'],
//   documentUrlPatterns: ['https://www.linkedin.com/*']
// });

// chrome.contextMenus.onClicked.addListener((info, tab) => {
//   if (info.menuItemId === 'linkedin-assistant') {
//     chrome.tabs.sendMessage(tab.id, {
//       action: 'contextMenuDraft',
//       selectedText: info.selectionText
//     });
//   }
// });
