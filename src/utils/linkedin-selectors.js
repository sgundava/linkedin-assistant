/**
 * LinkedIn DOM Selectors
 * 
 * LinkedIn's DOM structure changes frequently. This abstraction layer
 * centralizes all selectors so updates only need to happen in one place.
 * 
 * Last verified: 2025
 * 
 * Two contexts:
 * 1. Messaging page (/messaging/thread/...)
 * 2. Profile page chat overlay (/in/...)
 */

export const SELECTORS = {
  // ===================
  // MESSAGING PAGE
  // /messaging/thread/{conversation-id}
  // ===================
  messaging: {
    // The scrollable container holding all messages
    threadContainer: '.msg-s-message-list-container',

    // Individual message items
    messageItem: '.msg-s-message-list__event',

    // The actual text content within a message
    messageBody: '.msg-s-event-listitem__body',

    // Sender name (at top of conversation, within the title bar)
    senderName: '.msg-title-bar .msg-entity-lockup__entity-title',

    // Timestamp
    timestamp: '.msg-s-message-group__timestamp',

    // The compose/reply box
    composeBox: '.msg-form__contenteditable',

    // Send button
    sendButton: '.msg-form__send-button',

    // Conversation header (shows who you're talking to)
    conversationHeader: '.msg-title-bar .msg-entity-lockup__entity-title',

    // Profile link in conversation
    profileLink: '.msg-thread__link-to-profile',
  },

  // ===================
  // CHAT BUBBLE OVERLAY
  // Can appear on any LinkedIn page
  // ===================
  chatBubble: {
    // The chat bubble/overlay container
    chatOverlay: '.msg-overlay-conversation-bubble',

    // Container for all bubbles
    overlayContainer: '.msg-overlay-container',

    // Individual message items
    messageItem: '.msg-s-message-list__event',

    // Message text
    messageBody: '.msg-s-event-listitem__body',

    // Sender name in bubble header
    senderName: '.msg-overlay-bubble-header__title',

    // Compose box in overlay
    composeBox: '.msg-form__contenteditable[contenteditable="true"]',

    // Send button in overlay
    sendButton: '.msg-form__send-button',

    // Profile name from bubble header
    profileName: '.msg-overlay-bubble-header__title',
  },

  // ===================
  // SHARED / COMMON
  // ===================
  common: {
    // Any contenteditable compose box
    anyComposeBox: '[contenteditable="true"].msg-form__contenteditable',
    
    // Any send button
    anySendButton: '.msg-form__send-button',
    
    // Loading spinner (useful to wait for)
    loadingSpinner: '.artdeco-loader',
  }
};

/**
 * Detect which context we're in
 * Priority: Active chat bubble > Messaging page
 */
export function getContext() {
  // Check for active chat bubble first (can appear on any page)
  const activeBubble = document.querySelector('.msg-overlay-conversation-bubble--is-active');
  if (activeBubble) {
    return 'chatBubble';
  }

  // Check for any open chat bubble
  const anyBubble = document.querySelector('.msg-overlay-conversation-bubble');
  if (anyBubble) {
    return 'chatBubble';
  }

  // Check URL for messaging page
  const url = window.location.href;
  if (url.includes('/messaging/')) {
    return 'messaging';
  }

  return null;
}

/**
 * Get the active chat bubble container (for scoping queries)
 */
export function getActiveBubbleContainer() {
  // Try to get the active/focused bubble first
  const activeBubble = document.querySelector('.msg-overlay-conversation-bubble--is-active');
  if (activeBubble) {
    return activeBubble;
  }

  // Fall back to any open bubble
  return document.querySelector('.msg-overlay-conversation-bubble');
}

/**
 * Get all open conversations (bubbles + messaging page if applicable)
 * Returns array of { id, name, container, type }
 */
export function getAllOpenConversations() {
  const conversations = [];

  // Check for messaging page conversation
  const url = window.location.href;
  if (url.includes('/messaging/')) {
    const messagingName = document.querySelector('.msg-title-bar .msg-entity-lockup__entity-title');
    if (messagingName) {
      conversations.push({
        id: 'messaging-page',
        name: messagingName.textContent.trim(),
        container: document,
        type: 'messaging'
      });
    }
  }

  // Check for all open chat bubbles
  const bubbles = document.querySelectorAll('.msg-overlay-conversation-bubble');
  bubbles.forEach((bubble, index) => {
    const nameElement = bubble.querySelector('.msg-overlay-bubble-header__title');
    if (nameElement) {
      conversations.push({
        id: `bubble-${index}`,
        name: nameElement.textContent.trim(),
        container: bubble,
        type: 'chatBubble'
      });
    }
  });

  return conversations;
}

/**
 * Get the appropriate selectors for current context
 * @param {string} contextType - Optional: 'messaging' or 'chatBubble'. If not provided, auto-detects.
 */
export function getContextSelectors(contextType = null) {
  const context = contextType || getContext();

  if (!context) return null;

  return {
    ...SELECTORS.common,
    ...SELECTORS[context],
    _context: context  // Include context type for reference
  };
}

/**
 * Safely query an element with fallback attempts
 * LinkedIn sometimes has multiple valid selectors for the same element
 */
export function safeQuery(selectorOrSelectors, root = document) {
  const selectors = Array.isArray(selectorOrSelectors) 
    ? selectorOrSelectors 
    : [selectorOrSelectors];
  
  for (const selector of selectors) {
    try {
      const element = root.querySelector(selector);
      if (element) return element;
    } catch (e) {
      console.warn(`[LinkedIn Assistant] Invalid selector: ${selector}`);
    }
  }
  
  return null;
}

/**
 * Wait for an element to appear in the DOM
 */
export function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for element: ${selector}`));
    }, timeout);
  });
}
