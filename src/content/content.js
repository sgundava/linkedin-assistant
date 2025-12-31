/**
 * Content Script
 *
 * Injected into LinkedIn pages to provide:
 * 1. Floating action button to invoke assistant
 * 2. Message context extraction
 * 3. Response insertion into compose box
 */

import { extractConversationContext, insertIntoComposeBox, buildAIPrompt, buildSummaryPrompt } from '../utils/message-extractor.js';
import { getTemplates, getPreferences } from '../utils/storage.js';
import { generateResponse, buildWebInterfaceUrl, getConfiguredProviders, getProviderConfig } from '../utils/ai-client.js';
import { getAllOpenConversations } from '../utils/linkedin-selectors.js';

// State
let panelVisible = false;
let currentContext = null;
let selectedConversation = null; // Track which conversation is selected

/**
 * Initialize the content script
 */
async function init() {
  const preferences = await getPreferences();

  // Always show floating button on LinkedIn (it checks for conversations when clicked)
  if (preferences.showFloatingButton) {
    createFloatingButton();
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener(handleMessage);
}

/**
 * Create the floating action button
 */
function createFloatingButton() {
  const button = document.createElement('button');
  button.id = 'li-assistant-fab';
  button.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      <path d="M12 7v4M12 15h.01"></path>
    </svg>
  `;
  button.title = 'LinkedIn Message Assistant';
  button.addEventListener('click', togglePanel);
  
  document.body.appendChild(button);
}

/**
 * Toggle the assistant panel
 */
async function togglePanel() {
  if (panelVisible) {
    closePanel();
  } else {
    await openPanel();
  }
}

/**
 * Open the assistant panel
 */
async function openPanel() {
  // Check for multiple open conversations
  const conversations = getAllOpenConversations();

  if (conversations.length === 0) {
    showToast('No conversation found. Open a chat to get started.');
    return;
  }

  // Create panel first
  const panel = createPanel();
  document.body.appendChild(panel);
  panelVisible = true;

  // If multiple conversations, show selector
  if (conversations.length > 1) {
    showConversationSelector(panel, conversations);
  } else {
    // Single conversation - use it directly
    selectedConversation = conversations[0];
    await loadConversationContext(panel);
  }
}

/**
 * Close the assistant panel
 */
function closePanel() {
  const panel = document.getElementById('li-assistant-panel');
  if (panel) {
    panel.remove();
  }
  panelVisible = false;
  selectedConversation = null;
}

/**
 * Show conversation selector when multiple chats are open
 */
function showConversationSelector(panel, conversations) {
  const selectorSection = panel.querySelector('.li-assistant-conversation-selector');
  const select = panel.querySelector('.li-assistant-conversation-select');

  // Populate dropdown
  select.innerHTML = conversations.map((conv, index) =>
    `<option value="${index}">${conv.name} ${conv.type === 'messaging' ? '(Main)' : '(Bubble)'}</option>`
  ).join('');

  // Show selector
  selectorSection.style.display = 'block';

  // Store conversations for reference
  select.dataset.conversations = JSON.stringify(conversations.map(c => ({ id: c.id, name: c.name, type: c.type })));

  // Handle selection change
  select.addEventListener('change', async () => {
    const index = parseInt(select.value);
    selectedConversation = conversations[index];
    await loadConversationContext(panel);
  });

  // Auto-select first one
  selectedConversation = conversations[0];
  loadConversationContext(panel);
}

/**
 * Load conversation context for the selected conversation
 */
async function loadConversationContext(panel) {
  if (!selectedConversation) {
    showToast('No conversation selected');
    return;
  }

  // Extract context using the selected conversation's container
  currentContext = await extractConversationContext(selectedConversation.container, selectedConversation.type);

  if (!currentContext.success) {
    panel.querySelector('.li-assistant-sender').textContent = `Conversation with ${selectedConversation.name}`;
    panel.querySelector('.li-assistant-message').textContent = 'Could not load messages';
    return;
  }

  // Populate panel with context
  populatePanel(panel, currentContext);
}

/**
 * Create the panel DOM structure
 */
function createPanel() {
  const panel = document.createElement('div');
  panel.id = 'li-assistant-panel';
  panel.innerHTML = `
    <div class="li-assistant-header">
      <h3>Message Assistant</h3>
      <button class="li-assistant-close" aria-label="Close">&times;</button>
    </div>

    <div class="li-assistant-conversation-selector" style="display: none;">
      <label>Select Conversation</label>
      <select class="li-assistant-conversation-select"></select>
    </div>

    <div class="li-assistant-context">
      <div class="li-assistant-sender"></div>
      <div class="li-assistant-message"></div>
      <button class="li-assistant-btn secondary li-assistant-summarize-btn" id="li-summarize">
        Summarize Conversation
      </button>
    </div>

    <div class="li-assistant-summary" style="display: none;">
      <label>Summary</label>
      <div class="li-assistant-summary-content"></div>
    </div>

    <div class="li-assistant-section">
      <label>Quick Templates</label>
      <div class="li-assistant-templates"></div>
    </div>
    
    <div class="li-assistant-section">
      <label>What would you like to say?</label>
      <textarea class="li-assistant-intent" placeholder="e.g., Politely decline but wish them luck..."></textarea>
    </div>

    <div class="li-assistant-section li-assistant-tone-section">
      <label>Tone</label>
      <div class="li-assistant-tone-options">
        <button class="li-assistant-tone-btn" data-tone="match">Match tone</button>
        <button class="li-assistant-tone-btn active" data-tone="professional">Professional</button>
        <button class="li-assistant-tone-btn" data-tone="casual">Casual</button>
        <button class="li-assistant-tone-btn" data-tone="brief">Brief</button>
        <button class="li-assistant-tone-btn" data-tone="enthusiastic">Enthusiastic</button>
        <button class="li-assistant-tone-btn" data-tone="custom">Custom</button>
      </div>
      <input type="text" class="li-assistant-custom-tone" placeholder="e.g., sarcastic, formal British, Gen-Z..." style="display: none;">
    </div>

    <div class="li-assistant-actions">
      <button class="li-assistant-btn secondary" id="li-open-external">
        Open in Claude ↗
      </button>
      <button class="li-assistant-btn primary" id="li-generate">
        Generate Response
      </button>
    </div>
    
    <div class="li-assistant-result" style="display: none;">
      <label>Generated Response</label>
      <div class="li-assistant-response"></div>
      <div class="li-assistant-result-actions">
        <button class="li-assistant-btn secondary" id="li-copy">Copy</button>
        <button class="li-assistant-btn primary" id="li-insert">Insert</button>
      </div>
    </div>
    
    <div class="li-assistant-loading" style="display: none;">
      <div class="li-assistant-spinner"></div>
      <span class="li-assistant-loading-text">Generating...</span>
    </div>
  `;
  
  // Attach event listeners
  panel.querySelector('.li-assistant-close').addEventListener('click', closePanel);
  panel.querySelector('#li-generate').addEventListener('click', handleGenerate);
  panel.querySelector('#li-open-external').addEventListener('click', handleOpenExternal);
  panel.querySelector('#li-copy').addEventListener('click', handleCopy);
  panel.querySelector('#li-insert').addEventListener('click', handleInsert);
  panel.querySelector('#li-summarize').addEventListener('click', handleSummarize);

  // Tone button toggles
  panel.querySelectorAll('.li-assistant-tone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('.li-assistant-tone-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show/hide custom tone input
      const customInput = panel.querySelector('.li-assistant-custom-tone');
      if (btn.dataset.tone === 'custom') {
        customInput.style.display = 'block';
        customInput.focus();
      } else {
        customInput.style.display = 'none';
      }
    });
  });

  // Prevent scroll from propagating to page
  panel.addEventListener('wheel', (e) => {
    const { scrollTop, scrollHeight, clientHeight } = panel;
    const atTop = scrollTop === 0 && e.deltaY < 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight && e.deltaY > 0;

    // Only stop if we're not at the edges, or if we are but trying to scroll further
    if (!atTop && !atBottom) {
      e.stopPropagation();
    } else {
      e.preventDefault();
      e.stopPropagation();
    }
  }, { passive: false });

  return panel;
}

/**
 * Populate the panel with conversation context and templates
 */
async function populatePanel(panel, context) {
  // Show sender and latest message
  panel.querySelector('.li-assistant-sender').textContent =
    `Conversation with ${context.senderName}`;

  const messageEl = panel.querySelector('.li-assistant-message');
  if (context.latestMessage && context.latestMessage.text) {
    messageEl.textContent = context.latestMessage.text.substring(0, 200) +
      (context.latestMessage.text.length > 200 ? '...' : '');
  } else {
    messageEl.textContent = 'No messages found';
  }

  // Clear previous summary and generated response when switching conversations
  panel.querySelector('.li-assistant-summary').style.display = 'none';
  panel.querySelector('.li-assistant-summary-content').textContent = '';
  panel.querySelector('.li-assistant-result').style.display = 'none';
  panel.querySelector('.li-assistant-response').textContent = '';
  
  // Load templates (clear first to avoid duplicates on re-render)
  const templates = await getTemplates();
  const templatesContainer = panel.querySelector('.li-assistant-templates');
  templatesContainer.innerHTML = '';

  templates.forEach(template => {
    const btn = document.createElement('button');
    btn.className = 'li-assistant-template-btn';
    btn.textContent = template.name;
    btn.addEventListener('click', () => handleTemplateClick(template));
    templatesContainer.appendChild(btn);
  });
}

/**
 * Handle template button click
 */
function handleTemplateClick(template) {
  const intentInput = document.querySelector('.li-assistant-intent');
  intentInput.value = template.content;
}

/**
 * Handle generate button click
 */
async function handleGenerate() {
  const panel = document.getElementById('li-assistant-panel');
  const intent = panel.querySelector('.li-assistant-intent').value;

  if (!intent.trim()) {
    showToast('Please describe what you want to say');
    return;
  }

  // Check if we have a configured provider
  const providers = await getConfiguredProviders();
  const hasApiKey = providers.some(p => p.configured);

  if (!hasApiKey) {
    showToast('No API key configured. Use "Open in Claude" for now, or add a key in settings.');
    return;
  }

  // Get selected tone and custom instructions
  const selectedTone = panel.querySelector('.li-assistant-tone-btn.active')?.dataset.tone || 'professional';
  const customToneInput = panel.querySelector('.li-assistant-custom-tone').value.trim();

  // Validate custom tone has input
  if (selectedTone === 'custom' && !customToneInput) {
    showToast('Please enter a custom tone description');
    panel.querySelector('.li-assistant-custom-tone').focus();
    return;
  }

  // Show loading state with provider name
  const preferences = await getPreferences();
  const providerConfig = getProviderConfig(preferences.preferredProvider);
  const providerName = providerConfig?.name?.split(' ')[0] || 'AI';

  panel.querySelector('.li-assistant-loading-text').textContent = `Generating with ${providerName}...`;
  panel.querySelector('.li-assistant-loading').style.display = 'flex';
  panel.querySelector('.li-assistant-result').style.display = 'none';

  try {
    const prompt = buildAIPrompt(currentContext, intent, selectedTone, customToneInput);
    const result = await generateResponse(prompt);

    // Show result
    panel.querySelector('.li-assistant-response').textContent = result.text;
    panel.querySelector('.li-assistant-result').style.display = 'block';
  } catch (error) {
    showToast(formatApiError(error, providers));
  } finally {
    panel.querySelector('.li-assistant-loading').style.display = 'none';
  }
}

/**
 * Handle open in external AI interface
 */
async function handleOpenExternal() {
  const intent = document.querySelector('.li-assistant-intent')?.value || 'Draft a professional response';
  const prompt = buildAIPrompt(currentContext, intent);
  
  const { url, copyPrompt } = buildWebInterfaceUrl(prompt, 'anthropic');
  
  if (copyPrompt) {
    await navigator.clipboard.writeText(prompt);
    showToast('Prompt copied! Paste it in Claude.');
  }
  
  window.open(url, '_blank');
}

/**
 * Handle copy button click
 */
async function handleCopy() {
  const response = document.querySelector('.li-assistant-response').textContent;
  await navigator.clipboard.writeText(response);
  showToast('Copied to clipboard!');
}

/**
 * Handle insert button click
 */
async function handleInsert() {
  const response = document.querySelector('.li-assistant-response').textContent;

  try {
    // Pass the selected conversation's container to insert into the correct bubble
    const container = selectedConversation?.container || null;
    await insertIntoComposeBox(response, container);
    showToast('Inserted into message box');
    closePanel();
  } catch (error) {
    showToast(`Could not insert: ${error.message}`);
  }
}

/**
 * Handle summarize button click
 */
async function handleSummarize() {
  const panel = document.getElementById('li-assistant-panel');

  // Check if we have a configured provider
  const providers = await getConfiguredProviders();
  const hasApiKey = providers.some(p => p.configured);

  if (!hasApiKey) {
    showToast('No API key configured. Add a key in extension settings.');
    return;
  }

  // Show loading state with provider name
  const preferences = await getPreferences();
  const providerConfig = getProviderConfig(preferences.preferredProvider);
  const providerName = providerConfig?.name?.split(' ')[0] || 'AI';

  panel.querySelector('.li-assistant-loading-text').textContent = `Summarizing with ${providerName}...`;
  panel.querySelector('.li-assistant-loading').style.display = 'flex';
  panel.querySelector('.li-assistant-summary').style.display = 'none';

  try {
    const prompt = buildSummaryPrompt(currentContext);
    const result = await generateResponse(prompt);

    // Show summary
    panel.querySelector('.li-assistant-summary-content').textContent = result.text;
    panel.querySelector('.li-assistant-summary').style.display = 'block';
  } catch (error) {
    showToast(formatApiError(error, providers));
  } finally {
    panel.querySelector('.li-assistant-loading').style.display = 'none';
  }
}

/**
 * Format API errors with helpful suggestions
 */
function formatApiError(error, providers) {
  const msg = error.message.toLowerCase();
  const configuredProviders = providers.filter(p => p.configured);
  const hasMultipleProviders = configuredProviders.length > 1;

  // Credit/billing issues
  if (msg.includes('credit') || msg.includes('balance') || msg.includes('billing') ||
      msg.includes('quota') || msg.includes('insufficient')) {
    let suggestion = 'Out of API credits. ';
    if (hasMultipleProviders) {
      suggestion += 'Try switching providers in settings, or ';
    }
    suggestion += 'use "Open in Claude" button instead.';
    return suggestion;
  }

  // Rate limiting
  if (msg.includes('rate') || msg.includes('limit') || msg.includes('too many')) {
    let suggestion = 'Rate limited. ';
    if (hasMultipleProviders) {
      suggestion += 'Try switching providers, or ';
    }
    suggestion += 'wait a moment and try again.';
    return suggestion;
  }

  // Invalid API key
  if (msg.includes('invalid') && (msg.includes('key') || msg.includes('api'))) {
    return 'Invalid API key. Check your key in extension settings.';
  }

  // Generic error with fallback suggestion
  return `${error.message}. Try "Open in Claude" as fallback.`;
}

/**
 * Handle messages from popup or background script
 */
function handleMessage(message, sender, sendResponse) {
  if (message.action === 'extractContext') {
    extractConversationContext().then(sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (message.action === 'insertText') {
    const container = selectedConversation?.container || null;
    insertIntoComposeBox(message.text, container)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
}

/**
 * Show a toast notification
 */
function showToast(message, duration = 3000) {
  const existing = document.querySelector('.li-assistant-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'li-assistant-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
