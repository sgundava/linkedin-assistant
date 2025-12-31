# Privacy Policy

**LinkedIn Message Assistant**
*Last updated: December 2024*

## Overview

LinkedIn Message Assistant is a browser extension that helps users draft professional responses to LinkedIn messages using AI. This privacy policy explains how we handle your data.

**The short version: We don't collect anything. Your data stays on your device.**

---

## Data We Collect

**None.**

We do not collect, store, transmit, or process any personal data. There are no analytics, no tracking pixels, no telemetry, and no crash reporting.

---

## Data Storage

### API Keys
- Your AI provider API keys (Anthropic, OpenAI) are stored **locally in your browser** using Chrome's `storage.local` API
- Keys never leave your device except when making direct API calls to your chosen provider
- Keys are never synced across devices, even if you use Chrome Sync

### Preferences & Templates
- Your preferences and message templates are stored using Chrome's `storage.sync` API
- This may sync across your Chrome browsers if you have Chrome Sync enabled
- This data never touches our servers (we don't have servers)

---

## Data Transmission

### When You Use AI Features
When you click "Generate Response" or "Summarize Conversation":

1. The extension reads the visible conversation from your LinkedIn page
2. This conversation text is sent **directly from your browser** to your chosen AI provider (Anthropic or OpenAI)
3. The AI provider processes the request and returns a response
4. The response is displayed in the extension

**There is no middleman.** We do not operate any servers. We never see your conversations or API requests.

### Third-Party Services
This extension communicates with:

| Service | When | What's Sent |
|---------|------|-------------|
| Anthropic API | When using Claude | Conversation context + your prompt |
| OpenAI API | When using GPT | Conversation context + your prompt |

These services have their own privacy policies:
- [Anthropic Privacy Policy](https://www.anthropic.com/privacy)
- [OpenAI Privacy Policy](https://openai.com/privacy)

---

## LinkedIn Data

- The extension reads LinkedIn message content **only** from pages you are actively viewing
- This data is used solely to provide context for AI-generated responses
- We do not scrape, store, or export your LinkedIn data
- We do not access your LinkedIn credentials

---

## Permissions Explained

| Permission | Why We Need It |
|------------|----------------|
| `storage` | To save your API keys and preferences locally |
| `activeTab` | To read conversation content from the LinkedIn page you're viewing |
| `host_permissions: linkedin.com` | To inject the assistant UI into LinkedIn pages |
| `host_permissions: anthropic.com, openai.com` | To make API calls to AI providers |

---

## Data Security

- API keys are stored using Chrome's secure storage API
- All API communications use HTTPS encryption
- No data is ever logged or stored outside your browser

---

## Children's Privacy

This extension is not intended for users under 13 years of age. We do not knowingly collect data from children.

---

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be reflected in the "Last updated" date above.

---

## Open Source

This extension is fully open source. You can audit the complete source code at:

**[GitHub Repository](https://github.com/yourusername/linkedin-assistant)**

---

## Contact

If you have questions about this privacy policy, please open an issue on our GitHub repository.

---

## Summary

| Question | Answer |
|----------|--------|
| Do you collect my data? | No |
| Do you sell my data? | No (we don't have it) |
| Do you track me? | No |
| Where are my API keys stored? | Locally in your browser only |
| Who sees my conversations? | Only the AI provider you choose, when you click Generate or Summarize |
| Do you have servers? | No |
