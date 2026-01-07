/**
 * Message Extractor
 * 
 * Extracts conversation context from LinkedIn's DOM
 * Works in both messaging page and profile overlay contexts
 */

import { getContext, getContextSelectors, safeQuery, waitForElement, getActiveBubbleContainer, SELECTORS } from './linkedin-selectors.js';

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

    return {
      success: true,
      context: contextType,
      senderName: extractSenderName(selectors, container),
      latestMessage: extractLatestMessage(selectors, container),
      recentMessages: extractRecentMessages(selectors, 5, container),
      timestamp: new Date().toISOString()
    };
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
 *
 * IMPORTANT: Default to true (from other) unless we find positive "from me" indicators.
 * This prevents misattributing incoming messages when selectors change.
 */
function isMessageFromOther(messageElement) {
  const classList = messageElement.className || '';

  // Check 1: Explicit "from me" classes (most reliable)
  // LinkedIn uses various patterns - check for common ones
  const fromMePatterns = [
    'from-me',
    'selfsend',
    'outbound',
    'sent'
  ];

  const classLower = classList.toLowerCase();
  for (const pattern of fromMePatterns) {
    if (classLower.includes(pattern)) {
      return false;
    }
  }

  // Check 2: Look for "from me" indicator within child elements
  // LinkedIn sometimes nests these classes deeper in the DOM
  const fromMeChild = messageElement.querySelector(
    '[class*="from-me"], [class*="selfsend"], [class*="outbound"]'
  );
  if (fromMeChild) {
    return false;
  }

  // Check 3: Background color detection
  // User's messages often have a tinted background (blue/gray) vs white for others
  const msgBody = messageElement.querySelector('.msg-s-event-listitem__body');
  if (msgBody) {
    const bgColor = window.getComputedStyle(msgBody).backgroundColor;
    // LinkedIn's "my message" backgrounds are typically tinted (not pure white/transparent)
    // rgb(240, 244, 248) or similar blue-gray tints indicate user's message
    if (bgColor && bgColor.includes('rgb')) {
      const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const [, r, g, b] = match.map(Number);
        // If blue component is noticeably higher than red, likely user's message
        // Or if it's a gray-blue tint (r < 245 and all similar)
        if (b > r + 5 || (r > 230 && r < 250 && g > r)) {
          return false;
        }
      }
    }
  }

  // Default: Assume message is from the other person
  // This is safer than assuming it's from "me" when detection fails
  return true;
}

/**
 * Insert text into the compose box
 * @param {string} text - The text to insert
 * @param {Element} container - Optional container to scope the search (for multi-bubble support)
 */
export async function insertIntoComposeBox(text, container = null) {
  const selectors = getContextSelectors();

  if (!selectors) {
    throw new Error('Not on a LinkedIn messaging page');
  }

  // Find compose box within the specified container, or fall back to document
  const searchRoot = container || document;
  let composeBox = searchRoot.querySelector(selectors.composeBox) ||
                   searchRoot.querySelector(selectors.anyComposeBox);

  // If not found in container, wait for it
  if (!composeBox) {
    composeBox = await waitForElement(selectors.composeBox || selectors.anyComposeBox, 3000);
  }

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
 * Tone configurations for message generation
 */
const TONE_CONFIG = {
  professional: {
    description: 'professional',
    instructions: 'Keep it polished and business-appropriate, but not stiff. Natural and confident.'
  },
  casual: {
    description: 'casual and friendly',
    instructions: 'Keep it warm and conversational, like messaging a colleague you get along with. Contractions are fine.'
  },
  brief: {
    description: 'brief and direct',
    instructions: 'Keep it short and to the point. No fluff, no filler. 1-2 sentences max.'
  },
  enthusiastic: {
    description: 'enthusiastic and upbeat',
    instructions: 'Show genuine excitement and energy. Positive and engaging, but not over-the-top.'
  },
  match: {
    description: 'matching the conversation tone',
    instructions: 'Analyze the tone of the conversation and mirror it. If they are casual, be casual. If formal, be formal. Match their energy and style.'
  },
  custom: {
    description: 'custom',
    instructions: '' // Will be provided by user
  }
};

/**
 * Length configurations for message generation
 */
const LENGTH_CONFIG = {
  short: {
    description: 'short',
    instructions: '1-2 sentences. Get straight to the point.'
  },
  medium: {
    description: 'medium-length',
    instructions: '2-4 sentences. Balanced and complete, but concise.'
  },
  long: {
    description: 'longer',
    instructions: '4-6 sentences. More detailed and thorough, but still focused.'
  }
};

/**
 * Build a prompt for the AI based on extracted context
 * @param {Object} conversationContext - The conversation context
 * @param {string} userIntent - What the user wants to say
 * @param {string} tone - The tone preset (or 'custom')
 * @param {string} customToneInstructions - Custom tone instructions when tone='custom'
 * @param {string} length - The length preset ('short', 'medium', 'long')
 */
export function buildAIPrompt(conversationContext, userIntent, tone = 'professional', customToneInstructions = '', length = 'medium') {
  const { senderName, latestMessage, recentMessages } = conversationContext;

  let conversationHistory = '';
  if (recentMessages && recentMessages.length > 0) {
    conversationHistory = recentMessages
      .map(m => `${m.isFromOther ? senderName : 'Me'}: ${m.text}`)
      .join('\n');
  }

  const toneConfig = TONE_CONFIG[tone] || TONE_CONFIG.professional;
  const lengthConfig = LENGTH_CONFIG[length] || LENGTH_CONFIG.medium;

  // For custom tone, use user-provided instructions
  const toneDescription = tone === 'custom' && customToneInstructions
    ? customToneInstructions
    : toneConfig.description;
  const toneInstructions = tone === 'custom' && customToneInstructions
    ? customToneInstructions
    : `${toneConfig.description}. ${toneConfig.instructions}`;

  return `You are helping ME (the LinkedIn user) draft a reply TO ${senderName}.

CONVERSATION HISTORY:
${conversationHistory || `${senderName}: ${latestMessage?.text || '[No message content found]'}`}

WHAT I WANT TO SAY: ${userIntent}

TONE: ${toneInstructions}

LENGTH: ${lengthConfig.instructions}

IMPORTANT: You are writing a message FROM me TO ${senderName}. Respond to what ${senderName} said, not echo it. If ${senderName} congratulated me, I should thank them — not congratulate them back.

Transform my intent into a ${toneDescription}, ${lengthConfig.description} LinkedIn message. Output only the message text, nothing else.`;
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

  return `Summarize this LinkedIn conversation concisely.

CONVERSATION WITH: ${senderName}

MESSAGES:
${conversationHistory || `${senderName}: ${latestMessage?.text || '[No message content found]'}`}

Provide:
1. **Summary** (1-2 sentences): What is this conversation about?
2. **Action Items** (if any): What needs to be done or responded to?
3. **Key Points**: Any important details, dates, or requests mentioned.
4. **Suggested Response**: A brief intent for replying (e.g., "Thank them and close the loop", "Ask for more details about the role", "Politely decline"). If no response is needed, say "No response needed".

Keep it brief and actionable.`;
}

/**
 * Extract profile context from a LinkedIn profile page
 */
export function extractProfileContext() {
  const selectors = SELECTORS.profile;

  // Try multiple selectors for name (LinkedIn changes these)
  const nameElement = document.querySelector(selectors.profileName) ||
                      document.querySelector('h1.text-heading-xlarge') ||
                      document.querySelector('.pv-top-card--list h1') ||
                      document.querySelector('[data-anonymize="person-name"]');

  const name = nameElement?.textContent?.trim();

  // Try multiple selectors for headline
  const headlineElement = document.querySelector(selectors.profileHeadline) ||
                          document.querySelector('.text-body-medium.break-words') ||
                          document.querySelector('.pv-top-card--list .text-body-medium');

  const headline = headlineElement?.textContent?.trim();

  // Check connection status by looking for Message/Connect buttons
  const hasMessageButton = !!document.querySelector(selectors.messageButton);
  const hasConnectButton = !!document.querySelector(selectors.connectButton);

  return {
    success: !!name,
    context: 'profile',
    profileName: name || 'Unknown',
    profileHeadline: headline || '',
    isConnected: hasMessageButton && !hasConnectButton,
    canMessage: hasMessageButton,
    timestamp: new Date().toISOString()
  };
}

/**
 * Build a prompt for first/cold outreach messages
 * @param {Object} profileContext - The profile context from extractProfileContext
 * @param {string} userIntent - What the user wants to say
 * @param {string} tone - The tone preset (or 'custom')
 * @param {string} customToneInstructions - Custom tone instructions when tone='custom'
 * @param {string} length - The length preset ('short', 'medium', 'long')
 */
export function buildFirstMessagePrompt(profileContext, userIntent, tone = 'professional', customToneInstructions = '', length = 'medium') {
  const { profileName, profileHeadline, isConnected } = profileContext;

  const toneConfig = TONE_CONFIG[tone] || TONE_CONFIG.professional;
  const lengthConfig = LENGTH_CONFIG[length] || LENGTH_CONFIG.medium;

  // For custom tone, use user-provided instructions
  const toneDescription = tone === 'custom' && customToneInstructions
    ? customToneInstructions
    : toneConfig.description;
  const toneInstructions = tone === 'custom' && customToneInstructions
    ? customToneInstructions
    : `${toneConfig.description}. ${toneConfig.instructions}`;

  const connectionContext = isConnected
    ? 'You are already connected with this person on LinkedIn.'
    : 'You are NOT yet connected — this may be sent as a connection request note or InMail.';

  return `You are helping ME draft a FIRST message to ${profileName} on LinkedIn.

RECIPIENT PROFILE:
- Name: ${profileName}
- Headline: ${profileHeadline || '[Not available]'}
- ${connectionContext}

MY INTENT: ${userIntent}

TONE: ${toneInstructions}

LENGTH: ${lengthConfig.instructions}

IMPORTANT: This is a cold/first message — there is no prior conversation. Be personable but not overly familiar. If my intent references something specific about them (their role, company, post, etc.), weave that naturally into the message. Don't be generic or salesy.

Generate a compelling, ${toneDescription} first message. Output only the message text, nothing else.`;
}
