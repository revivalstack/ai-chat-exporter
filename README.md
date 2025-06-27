# ChatGPT Exporter v1.0.0

**ChatGPT Exporter** is a Tampermonkey user script that allows you to export ChatGPT conversations with Markdown formatting, a Table of Contents (TOC), YAML metadata, and more.

## Features

- **Markdown Conversion**: Converts your ChatGPT conversation into a properly and elegently formatted Markdown.
- **Export Button**: A floating "Export Chat" button for easy downloading of the conversation as a `.md` file.
- **Table of Contents (TOC)**: Automatically generates a TOC linking to each message pair (user question + GPT response).
- **Back to Top**: Allows quick navigation through Back to Top link on each user message.
- **YAML Front Matter**: Includes metadata like thread name, message count, exporter version, and export timestamp.
- **Local Time Formatting**: Includes the exact local time when the conversation was exported.
- **Turndown Integration**: Safely converts HTML content into Markdown with [Turndown](https://github.com/mixmark-io/turndown).

## Installation

1. Install **Tampermonkey** from the [official website](https://www.tampermonkey.net/).

   - [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey)
   - [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

2. Create a new script in Tampermonkey and paste the code from this repository.
3. Save the script and open ChatGPT or a compatible ChatGPT-like page.
4. You will see a floating "⬇ Export Chat" button at the bottom-right of the page.

## Usage

- Once the script is installed and active, open a ChatGPT conversation.
- Click the **Export Chat** button at the bottom-right corner.
- The script will generate a Markdown file with a Table of Contents (TOC), message content, and metadata.
- The exported file is automatically downloaded as a `.md` file.

## Example Export

The exported file will include:

1. **YAML Front Matter** with thread metadata.
2. **Table of Contents** linking to each user question and GPT response pair.
3. **Markdown Content** of the conversation, including formatted messages, code blocks, and links.

Example:

```yaml
---
thread_name: "Chat with GPT-4"
message_count: 5
exporter_version: "1.0.0"
exported_at: "2025-06-27T14-45-00-UTC+0300"
---
# Chat with GPT-4

## Table of Contents

- [1: How does GPT-4 work?](#chat-1)
- [2: Can GPT-4 answer any question?](#chat-2)
- [3: what's your chatgpt version](#chat-3)

### chat-1

> How does GPT-4 work?

###### ChatGPT said:

GPT-4 works by using a transformer-based architecture that processes and generates text based on large datasets.

### chat-2

> Can GPT-4 answer any question?

###### ChatGPT said:

GPT-4 can answer a variety of questions, though it may not always provide perfect responses.

### chat-3

> what's your chatgpt version

###### ChatGPT said:

You're currently chatting with **ChatGPT using GPT-4o**, which is the latest and most advanced model as of June 2025.

Here’s a breakdown:

...

```

## License

MIT License. See [LICENSE](https://github.com/revivalstack/chatgpt-exporter/blob/main/LICENSE) for more information.

## Author

[**Mic Mejia**](https://github.com/micmejia)

_This was created with the assistance of chatgpt._

---

For issues or suggestions, please create an issue or submit a pull request on [GitHub](https://github.com/revivalstack/chatgpt-exporter).
