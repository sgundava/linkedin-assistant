/**
 * Popup Script
 * 
 * Handles the extension popup UI for settings, templates, and status
 */

import { 
  getTemplates, 
  saveTemplate, 
  deleteTemplate, 
  getPreferences, 
  savePreferences,
  getApiKeys,
  saveApiKey,
  validateApiKey 
} from '../utils/storage.js';
import { getAvailableProviders, getProviderConfig } from '../utils/ai-client.js';

// State
let currentEditingTemplate = null;

/**
 * Initialize popup
 */
async function init() {
  setupTabs();
  await updateStatus();
  await loadTemplates();
  await loadSettings();
  setupEventListeners();
}

/**
 * Setup tab navigation
 */
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });
}

/**
 * Update status indicator
 */
async function updateStatus() {
  const indicator = document.getElementById('status-indicator');
  const text = document.getElementById('status-text');
  const apiKeys = await getApiKeys();
  
  const hasAnyKey = Object.keys(apiKeys).length > 0;
  
  if (hasAnyKey) {
    indicator.className = 'status-indicator ready';
    text.textContent = 'Ready to assist';
  } else {
    indicator.className = 'status-indicator no-key';
    text.textContent = 'Add an API key to enable AI drafting';
  }
}

/**
 * Load and display templates
 */
async function loadTemplates() {
  const templates = await getTemplates();
  const container = document.getElementById('templates-list');
  
  container.innerHTML = templates.map(t => `
    <div class="template-item" data-id="${t.id}">
      <span class="name">${escapeHtml(t.name)}</span>
      <div class="actions">
        <button class="edit-template" title="Edit">✏️</button>
        <button class="delete-template" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');
  
  // Attach listeners
  container.querySelectorAll('.edit-template').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('.template-item').dataset.id;
      const template = templates.find(t => t.id === id);
      editTemplate(template);
    });
  });
  
  container.querySelectorAll('.delete-template').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.closest('.template-item').dataset.id;
      if (confirm('Delete this template?')) {
        await deleteTemplate(id);
        await loadTemplates();
      }
    });
  });
}

/**
 * Show template editor
 */
function editTemplate(template = null) {
  currentEditingTemplate = template;
  const editor = document.getElementById('template-editor');
  const nameInput = document.getElementById('template-name');
  const contentInput = document.getElementById('template-content');
  
  nameInput.value = template?.name || '';
  contentInput.value = template?.content || '';
  
  editor.style.display = 'block';
  nameInput.focus();
}

/**
 * Hide template editor
 */
function hideTemplateEditor() {
  document.getElementById('template-editor').style.display = 'none';
  currentEditingTemplate = null;
}

/**
 * Load settings
 */
async function loadSettings() {
  const apiKeys = await getApiKeys();
  const preferences = await getPreferences();
  const providers = getAvailableProviders();
  
  // Render provider cards
  const cardsContainer = document.getElementById('provider-cards');
  cardsContainer.innerHTML = providers.map(p => `
    <div class="provider-card ${preferences.preferredProvider === p.id ? 'selected' : ''}" 
         data-provider="${p.id}">
      <div class="name">${p.name.split(' ')[0]}</div>
      <div class="status ${apiKeys[p.id] ? 'configured' : ''}">
        ${apiKeys[p.id] ? '✓ Configured' : 'Not set up'}
      </div>
    </div>
  `).join('');
  
  // Provider card click handlers
  cardsContainer.querySelectorAll('.provider-card').forEach(card => {
    card.addEventListener('click', async () => {
      const provider = card.dataset.provider;
      const prefs = await getPreferences();
      prefs.preferredProvider = provider;
      await savePreferences(prefs);
      await loadSettings();
    });
  });
  
  // Update get key link based on selected provider
  updateKeyLink(preferences.preferredProvider);
  
  // Load preferences checkboxes
  document.getElementById('pref-floating-btn').checked = preferences.showFloatingButton;
  document.getElementById('pref-auto-insert').checked = preferences.autoInsert;
}

/**
 * Update the "Get API key" link and placeholder
 */
function updateKeyLink(provider) {
  const config = getProviderConfig(provider);
  const link = document.getElementById('get-key-link');
  const input = document.getElementById('api-key-input');

  const placeholders = {
    anthropic: 'sk-ant-...',
    openai: 'sk-...',
    gemini: 'AIza...'
  };

  if (config) {
    link.href = config.keyUrl;
    link.textContent = `Get ${config.name.split(' ')[0]} API key →`;
  }

  if (input) {
    input.placeholder = placeholders[provider] || 'Enter API key...';
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Open LinkedIn button
  document.getElementById('open-linkedin').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.linkedin.com/messaging/' });
  });
  
  // Add template button
  document.getElementById('add-template').addEventListener('click', () => {
    editTemplate(null);
  });
  
  // Cancel template edit
  document.getElementById('cancel-template').addEventListener('click', hideTemplateEditor);
  
  // Save template
  document.getElementById('save-template').addEventListener('click', async () => {
    const name = document.getElementById('template-name').value.trim();
    const content = document.getElementById('template-content').value.trim();
    
    if (!name || !content) {
      alert('Please fill in both name and content');
      return;
    }
    
    await saveTemplate({
      id: currentEditingTemplate?.id,
      name,
      content,
      category: 'custom'
    });
    
    hideTemplateEditor();
    await loadTemplates();
  });
  
  // Provider select change
  document.getElementById('provider-select').addEventListener('change', (e) => {
    updateKeyLink(e.target.value);
  });
  
  // Toggle key visibility
  document.getElementById('toggle-key-visibility').addEventListener('click', () => {
    const input = document.getElementById('api-key-input');
    input.type = input.type === 'password' ? 'text' : 'password';
  });
  
  // Save API key
  document.getElementById('save-api-key').addEventListener('click', async () => {
    const provider = document.getElementById('provider-select').value;
    const key = document.getElementById('api-key-input').value.trim();
    
    if (!key) {
      alert('Please enter an API key');
      return;
    }
    
    if (!validateApiKey(provider, key)) {
      alert('This doesn\'t look like a valid API key. Please check and try again.');
      return;
    }
    
    await saveApiKey(provider, key);
    document.getElementById('api-key-input').value = '';
    await updateStatus();
    await loadSettings();
    alert('API key saved successfully!');
  });
  
  // Preference checkboxes
  document.getElementById('pref-floating-btn').addEventListener('change', async (e) => {
    const prefs = await getPreferences();
    prefs.showFloatingButton = e.target.checked;
    await savePreferences(prefs);
  });
  
  document.getElementById('pref-auto-insert').addEventListener('change', async (e) => {
    const prefs = await getPreferences();
    prefs.autoInsert = e.target.checked;
    await savePreferences(prefs);
  });
}

/**
 * Helper: Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
