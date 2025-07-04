# ChatGPT / Gemini AI Chat Exporter by RevivalStack (v2.0.0)

**ChatGPT / Gemini AI Chat Exporter** is a Tampermonkey user script that allows you to export your conversations from both **ChatGPT** and **Google Gemini** with rich Markdown formatting, a Table of Contents (TOC), YAML metadata, and more.

![ChatGPT / Gemini AI Chat Exporter](images/chatgpt-gemini-ai-exporter.png)

## Features

- **Cross-Platform Support**: Export conversations seamlessly from both **ChatGPT** and **Google Gemini**.
- **Markdown Conversion**: Converts your chat conversation into a properly and elegantly formatted Markdown, ensuring accurate rendering of text, code blocks, tables, and especially **correct newlines within list items**.
- **Export Button**: A floating "Export Chat" button for easy downloading of the conversation as a `.md` or `.json` file.
- **Table of Contents (TOC)**: Automatically generates a TOC linking to each message pair (user question + AI response).
- **Back to Top**: Allows quick navigation through a "Back to Top" link after each AI response.
- **YAML Front Matter**: Includes comprehensive metadata like thread name, message count, exporter version, export timestamp, and the original chat thread URL.
- **Local Time Formatting**: Includes the exact local time when the conversation was exported.
- **Turndown Integration**: Safely converts HTML content into Markdown using a customized [Turndown](https://github.com/mixmark-io/turndown) service.
- **JSON Export**: Option to export conversations as a structured JSON file, including message IDs, authors, and content.

## Installation

### via Tapermonkey

1.  Install **Tampermonkey** from the [official website](https://www.tampermonkey.net/).

    - [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
    - [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey)
    - [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

2.  Create a new script in Tampermonkey and paste the code from this repository, or click below to install directly:

    [Install UserScript (ai-chat-exporter.user.js)](https://raw.githubusercontent.com/revivalstack/chatgpt-exporter/refs/heads/main/ai-chat-exporter.user.js)

3.  Navigate to any ChatGPT or Google Gemini conversation page.
4.  A floating "⬇ Export MD" and "⬇ JSON" button will appear at the bottom right of the page.
5.  Click the desired button to download your conversation.

### via Greasy Fork

[Greasy Fork script](https://greasyfork.org/en/scripts/541051-chatgpt-gemini-ai-chat-exporter-by-revivalstack)

## Export Format

The Markdown export includes:

1.  **YAML Front Matter** with thread metadata.
2.  **Table of Contents** linking to each user question and AI response pair.
3.  **Markdown Content** of the conversation, including formatted messages, code blocks, and links.

[Sample Export](sample.md):

```yaml
---
thread_name: "Chat with ChatGPT"
message_count: 3
exporter_version: "2.0.0"
exported_at: "2025-06-27T14-45-00-UTC+0300"
thread_url: "[https://chatgpt.com/c/](https://chatgpt.com/c/)..."
---
# Chat with ChatGPT

## Table of Contents

- [1: How does GPT-4 work?](#chat-1)
- [2: Can GPT-4 answer any question?](#chat-2)
- [3: what's your chatgpt version](#chat-3)

### chat-1

> How does GPT-4 work?

###### AI said:

GPT-4 works by using a transformer-based architecture that processes and generates text based on large datasets.

### chat-2

> Can GPT-4 answer any question?

###### AI said:

GPT-4 can answer a variety of questions, though it may not always provide perfect responses.

### chat-3

> what's your chatgpt version

###### AI said:

You're currently chatting with **AI using GPT-4o**, which is the latest and most advanced model as of June 2025.

...

```

## License

MIT License. See [LICENSE](https://github.com/revivalstack/ai-chat-exporter/blob/main/LICENSE) for more information.

## Author

[**Mic Mejia**](https://github.com/micmejia)

_This was created with the assistance of chatgpt and google gemini._

---

For issues or suggestions, please create an issue or submit a pull request on [GitHub](https://github.com/revivalstack/ai-chat-exporter).
