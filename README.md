# LinkedIn Message Assistant

A Chrome extension that helps you draft professional LinkedIn message responses using AI.

Stop staring at your inbox. Start responding.

## Features

- **AI-Powered Drafting** - Generate professional responses using Claude or GPT
- **Conversation Summarization** - Quickly catch up on what you were discussing
- **Works Everywhere** - Main messaging page, chat bubbles on feed, profile pages
- **Multiple Conversations** - Switch between open chats with a dropdown selector
- **Quick Templates** - Pre-built responses for common scenarios
- **Bring Your Own Key** - Use your own API keys. Your data stays yours.

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation (Developer Mode)

1. Clone this repository
   ```bash
   git clone https://github.com/yourusername/linkedin-assistant.git
   cd linkedin-assistant
   ```

2. Install dependencies and build
   ```bash
   npm install
   npm run build
   ```

3. Load in Chrome
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the project folder

4. Add your API key
   - Click the extension icon
   - Go to Settings tab
   - Add your Anthropic or OpenAI API key

## Usage

1. Open any LinkedIn page with a conversation
2. Click the floating button (bottom right)
3. Choose a quick template or describe what you want to say
4. Click "Generate Response" or "Open in Claude"
5. Review, edit if needed, and insert into the compose box

## Supported AI Providers

| Provider | Model | Get API Key |
|----------|-------|-------------|
| Anthropic | Claude Sonnet | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| OpenAI | GPT-4o mini | [platform.openai.com](https://platform.openai.com/api-keys) |

## Development

```bash
# Install dependencies
npm install

# Build (bundles content.js and popup.js)
npm run build
```

### Project Structure

```
├── manifest.json          # Extension manifest (MV3)
├── src/
│   ├── background/        # Service worker (handles API calls)
│   ├── content/           # Content script (injected into LinkedIn)
│   ├── popup/             # Extension popup UI
│   └── utils/             # Shared utilities
├── dist/                  # Bundled output (gitignored)
└── assets/                # Icons
```

### Testing Changes

1. Make your code changes
2. Run `npm run build`
3. Go to `chrome://extensions/` and click refresh on the extension
4. Reload your LinkedIn tab

---

## Privacy Policy

**LinkedIn Message Assistant** respects your privacy. Here's exactly what happens with your data:

### Data Collection
**We collect nothing.** Zero analytics. Zero tracking. Zero telemetry.

### API Keys
- Your API keys are stored **locally in your browser** using Chrome's storage API
- Keys are stored in `chrome.storage.local` (never synced across devices)
- Keys are **never** transmitted to any server other than the AI provider you choose

### API Calls
- When you generate a response, your message context is sent **directly** from your browser to the AI provider (Anthropic or OpenAI)
- There is no middleman server. No proxy. No logging.
- We never see your conversations or API requests

### LinkedIn Data
- The extension reads conversation content **only** from the active page to provide context for AI features
- This data is sent to your chosen AI provider when you click "Generate Response" or "Summarize Conversation"
- Nothing is stored, logged, or transmitted elsewhere

### Open Source
- This extension is fully open source
- You can audit every line of code
- No obfuscation. No hidden functionality.

### Summary

| What | Stored? | Transmitted? |
|------|---------|--------------|
| API Keys | Locally only | To AI provider only |
| Conversations | Never | To AI provider on request |
| Analytics | Never | Never |
| Personal info | Never | Never |

**Questions?** Open an issue on GitHub.

**Full legal documents:**
- [Terms of Service](docs/terms.md)
- [Disclaimer](docs/disclaimer.md)

---

## License

MIT License - do whatever you want with it.

## Contributing

PRs welcome! If LinkedIn changes their DOM (they will), selector updates are always appreciated.

---

Built with mass inbox guilt.
