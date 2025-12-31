/**
 * Message Extractor
 * 
 * Extracts conversation context from LinkedIn's DOM
 * Works in both messaging page and profile overlay contexts
 */

import { getContext, getContextSelectors, safeQuery, waitForElement, getActiveBubbleContainer } from './linkedin-selectors.js';

/**
 * Extract the latest message(s) from the current conversation
 * @param {Element} providedContainer - Optional container element to scope queries
 * @param {string} providedContextType - Optional context type ('messaging' or 'chatBubble')
 */
export async function extractConversationContext(providedContainer = null, providedContextType = null) {
  // Use provided context or detect automatically
  const contextType = providedContextType || getContext();
  const selectors = getContextSelectors(contextType);

  if (!contextType || !selectors) {
    return {
      success: false,
      error: 'Not on a LinkedIn messaging page',
      context: null
    };
  }

  // Use provided container or detect automatically
  let container = providedContainer;
  if (!container) {
    container = contextType === 'chatBubble' ? getActiveBubbleContainer() : document;
  }

  if (!container) {
    return {
      success: false,
      error: 'Could not find conversation container',
      context: contextType
    };
  }

  try {
    // Wait for messages to load
    await waitForElement(selectors.messageItem, 3000);

    const result = {
      success: true,
      context: contextType,
      senderName: extractSenderName(selectors, container),
      latestMessage: extractLatestMessage(selectors, container),
      recentMessages: extractRecentMessages(selectors, 5, container),
      timestamp: new Date().toISOString()
    };

    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      context: contextType
    };
  }
}

/**
 * Get the name of the person you're chatting with
 */
function extractSenderName(selectors, container = document) {
  // Try multiple possible locations for the name
  const nameElement = safeQuery([
    selectors.senderName,
    selectors.profileName,
    selectors.conversationHeader,
    '.msg-overlay-bubble-header__title'
  ], container);

  if (nameElement) {
    return nameElement.textContent.trim();
  }

  return 'Unknown';
}

/**
 * Extract the most recent message from the other person
 */
function extractLatestMessage(selectors, container = document) {
  const messages = container.querySelectorAll(selectors.messageItem);

  if (!messages.length) {
    return null;
  }

  // Get the last message
  const lastMessage = messages[messages.length - 1];
  const bodyElement = lastMessage.querySelector(selectors.messageBody) ||
                      lastMessage.querySelector('.msg-s-event-listitem__body');

  if (bodyElement) {
    return {
      text: bodyElement.textContent.trim(),
      isFromOther: isMessageFromOther(lastMessage)
    };
  }

  return null;
}

/**
 * Extract recent messages for more context
 */
function extractRecentMessages(selectors, count = 5, container = document) {
  const messages = container.querySelectorAll(selectors.messageItem);
  const recentMessages = [];

  // Get the last N messages
  const startIndex = Math.max(0, messages.length - count);

  for (let i = startIndex; i < messages.length; i++) {
    const msg = messages[i];
    const bodyElement = msg.querySelector(selectors.messageBody) ||
                        msg.querySelector('.msg-s-event-listitem__body');

    if (bodyElement) {
      recentMessages.push({
        text: bodyElement.textContent.trim(),
        isFromOther: isMessageFromOther(msg),
        index: i - startIndex
      });
    }
  }

  return recentMessages;
}

/**
 * Determine if a message is from the other person (vs you)
 */
function isMessageFromOther(messageElement) {
  // LinkedIn typically marks your own messages differently
  // This can vary, so we check multiple indicators
  const classList = messageElement.className || '';
  
  // Messages from others usually don't have these classes
  if (classList.includes('msg-s-message-list__event--last-from-me') ||
      classList.includes('msg-s-event-listitem--from-me')) {
    return false;
  }
  
  // Check for profile image (other person's messages usually show their photo)
  const hasAvatar = messageElement.querySelector('.presence-entity__image');
  
  return hasAvatar !== null;
}

/**
 * Insert text into the compose box
 */
export async function insertIntoComposeBox(text) {
  const selectors = getContextSelectors();
  
  if (!selectors) {
    throw new Error('Not on a LinkedIn messaging page');
  }
  
  const composeBox = await waitForElement(selectors.composeBox || selectors.anyComposeBox, 3000);
  
  if (!composeBox) {
    throw new Error('Could not find compose box');
  }
  
  // Focus the compose box
  composeBox.focus();
  
  // Clear existing content and insert new text
  // Using execCommand for better compatibility with contenteditable
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, text);
  
  // Dispatch input event so LinkedIn's JS picks up the change
  composeBox.dispatchEvent(new Event('input', { bubbles: true }));
  
  return true;
}

/**
 * Build a prompt for the AI based on extracted context
 */
export function buildAIPrompt(conversationContext, userIntent, customInstructions = '') {
  const { senderName, latestMessage, recentMessages } = conversationContext;

  let conversationHistory = '';
  if (recentMessages && recentMessages.length > 0) {
    conversationHistory = recentMessages
      .map(m => `${m.isFromOther ? senderName : 'Me'}: ${m.text}`)
      .join('\n');
  }

  const prompt = `You are helping draft a professional LinkedIn message response.

CONVERSATION CONTEXT:
- Talking to: ${senderName}
- Recent messages:
${conversationHistory || `${senderName}: ${latestMessage?.text || '[No message content found]'}`}

USER'S INTENT: ${userIntent}

${customInstructions ? `ADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}

Transform the USER'S INTENT into a professional LinkedIn message. Keep it natural and not overly formal. Aim for 2-4 sentences unless more detail is needed. Output only the message text, nothing else.`;

  return prompt;
}

/**
 * Build a prompt for summarizing the conversation
 */
export function buildSummaryPrompt(conversationContext) {
  const { senderName, latestMessage, recentMessages } = conversationContext;

  let conversationHistory = '';
  if (recentMessages && recentMessages.length > 0) {
    conversationHistory = recentMessages
      .map(m => `${m.isFromOther ? senderName : 'Me'}: ${m.text}`)
      .join('\n');
  }

  const prompt = `Summarize this LinkedIn conversation concisely.

CONVERSATION WITH: ${senderName}

MESSAGES:
${conversationHistory || `${senderName}: ${latestMessage?.text || '[No message content found]'}`}

Provide:
1. **Summary** (1-2 sentences): What is this conversation about?
2. **Action Items** (if any): What needs to be done or responded to?
3. **Key Points**: Any important details, dates, or requests mentioned.

Keep it brief and actionable.`;

  return prompt;
}
