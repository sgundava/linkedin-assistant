# LinkedIn Post Draft

---

## I built an AI assistant for LinkedIn messages because I was mass-ignoring recruiters (and feeling guilty about it)

Confession time.

I had 127 unread LinkedIn messages last month.

Not because I'm popular. Because I'm a professional procrastinator when it comes to "Hey, I came across your profile" messages.

The guilt was real. These are real people. Real opportunities. Real connections I'm probably missing.

But also... the mental energy to context-switch, remember what we discussed 3 weeks ago, and craft a thoughtful response?

Exhausting.

So I did what any reasonable engineer would do:

~~I mass-ignored them~~ spent a weekend building a Chrome extension to solve my problem.

---

### What it does:

→ **Summarizes conversations** - "Oh right, this person was asking about that project"

→ **Drafts responses** - Professional, human-sounding, not "I hope this email finds you well" energy

→ **Works everywhere** - Chat bubbles on your feed, profile pages, messaging inbox

→ **Your AI, your keys** - Bring your own Claude or GPT API key. No middleman. No data harvesting.

---

### The meta moment:

I'm posting about a LinkedIn tool... on LinkedIn... hoping LinkedIn's algorithm shows this to people who need help with LinkedIn messages.

We live in a simulation.

---

### Building this taught me a few things:

1. **LinkedIn changes their code constantly** - My selectors broke 3 times during development. I now have trust issues.

2. **"Just one more feature" is a trap** - Started with "draft a response." Ended with conversation switching, summarization, multi-provider support, and error handling that suggests alternatives when you run out of API credits.

3. **The best tools solve your own problems** - I built this for me. Turns out other people also have inbox guilt.

---

### The awkward part:

Some of those 127 messages? They were from people I genuinely wanted to talk to.

I just... forgot. Lost in the scroll.

If you messaged me and I ghosted you - I'm sorry. I have a tool now. I'm getting better.

---

It's free. It's open source. Your API keys never leave your browser.

Link in comments (because LinkedIn's algorithm buries posts with links).

---

**Question for you:**

What's your current LinkedIn inbox count?

Drop it below. No judgment. This is a safe space for inbox bankruptcy survivors.

---

# Publishing Checklist

## Chrome Web Store

1. **Developer Account**: https://chrome.google.com/webstore/devconsole ($5 one-time fee)

2. **Required Assets**:
   - [ ] Screenshot 1280x800 (at least one)
   - [ ] Promo tile 440x280 (optional but recommended)
   - [ ] Icons: 16, 48, 128 (already have)

3. **Extension Package**: `linkedin-assistant.zip` (already created)

4. **Store Listing Info**:
   - Category: Productivity
   - Description: Draft professional LinkedIn message responses with AI assistance
   - Privacy policy URL (required if using external APIs)

5. **Submit & Wait**: Review typically takes 1-3 business days

## Privacy Policy (Required)

You'll need a simple privacy policy page. Can host on GitHub Pages. Key points to cover:
- Extension stores API keys locally (never transmitted to your servers)
- API calls go directly to OpenAI/Anthropic from user's browser
- No analytics or tracking
- No user data collection
