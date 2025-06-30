// ==UserScript==
// @name         ChatGPT / Gemini AI Chat Exporter by RevivalStack
// @namespace    https://github.com/revivalstack/chatgpt-exporter
// @version      2.1.0
// @description  Export your ChatGPT or Gemini conversation into a properly and elegantly formatted Markdown or JSON.
// @author       Mic Mejia (Refactored by Google Gemini)
// @homepage     https://github.com/micmejia
// @license      MIT License
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @match        https://gemini.google.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // --- Global Constants ---
  const EXPORTER_VERSION = "2.1.0";
  const EXPORT_CONTAINER_ID = "export-controls-container";
  const DOM_READY_TIMEOUT = 1000;
  const EXPORT_BUTTON_TITLE_PREFIX = `AI Chat Exporter v${EXPORTER_VERSION}`;
  const ALERT_CONTAINER_ID = "exporter-alert-container";
  const HIDE_ALERT_FLAG = "exporter_hide_scroll_alert"; // Local Storage flag
  const ALERT_AUTO_CLOSE_DURATION = 30000; // 30 seconds

  // --- Font Stack for UI Elements ---
  const FONT_STACK = `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`;

  // Common styles for the container and buttons
  const COMMON_CONTROL_STYLES = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          font-size: 14px;
          cursor: pointer;
          border-radius: 8px;
          display: flex;
          align-items: center;
          font-family: ${FONT_STACK};
        `;

  const BUTTON_BASE_STYLES = `
          padding: 10px 14px;
          background-color: #5b3f86; /* Primary brand color */
          color: white;
          border: none;
          cursor: pointer;
          border-radius: 8px;
        `;

  const BUTTON_SPACING_STYLE = `
          margin-left: 8px;
        `;

  // --- Alert Styles ---
  // Note: max-width for ALERT_STYLES will be dynamically set
  const ALERT_STYLES = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        background-color: rgba(91, 63, 134, 0.9); /* Shade of #5b3f86 with transparency */
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        display: flex;
        flex-direction: column; /* Changed to column for title, message and checkbox */
        justify-content: space-between;
        align-items: flex-start; /* Align items to the start for better layout */
        font-size: 14px;
        opacity: 1;
        transition: opacity 0.5s ease-in-out;
        font-family: ${FONT_STACK};
    `;

  const ALERT_MESSAGE_ROW_STYLES = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-bottom: 10px; /* Space between message and checkbox */
    `;

  const ALERT_CLOSE_BUTTON_STYLES = `
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        margin-left: 15px; /* Add margin to push it right */
        line-height: 1; /* Align 'x' vertically */
    `;

  const ALERT_CHECKBOX_CONTAINER_STYLES = `
        display: flex;
        align-items: center;
        width: 100%;
    `;

  const ALERT_CHECKBOX_STYLES = `
        margin-right: 5px;
    `;

  // --- Hostname-Specific Selectors & Identifiers ---
  const CHATGPT_HOSTNAMES = ["chat.openai.com", "chatgpt.com"];
  const CHATGPT_TITLE_REPLACE_TEXT = " - ChatGPT";
  const CHATGPT_ARTICLE_SELECTOR = "article";
  const CHATGPT_HEADER_SELECTOR = "h5";
  const CHATGPT_TEXT_DIV_SELECTOR = "div.text-base";
  const CHATGPT_USER_MESSAGE_INDICATOR = "you said";
  const CHATGPT_POPUP_DIV_CLASS = "popover";
  const CHATGPT_BUTTON_SPECIFIC_CLASS = "text-sm";

  const GEMINI_HOSTNAMES = ["gemini.google.com"];
  const GEMINI_MESSAGE_ITEM_SELECTOR = "user-query, model-response";
  const GEMINI_TITLE_REPLACE_TEXT = " - Gemini";
  const GEMINI_SIDEBAR_ACTIVE_CHAT_SELECTOR =
    'div[data-test-id="conversation"].selected .conversation-title';

  // --- Markdown Formatting Constants ---
  const DEFAULT_CHAT_TITLE = "chat";
  const MARKDOWN_TOC_PLACEHOLDER_LINK = "#table-of-contents";
  const MARKDOWN_BACK_TO_TOP_LINK = `___\n###### [top](${MARKDOWN_TOC_PLACEHOLDER_LINK})\n`;

  // Parents of <p> tags where newlines should be suppressed or handled differently
  // LI is handled separately in the paragraph rule for single newlines.
  const PARAGRAPH_FILTER_PARENT_NODES = ["TH", "TR"];

  // --- Inlined Turndown.js (v7.1.2) - BEGIN ---
  // Customized TurndownService to handle specific chat DOM structures
  class TurndownService {
    constructor(options = {}) {
      this.rules = [];
      this.options = {
        headingStyle: "atx",
        hr: "___",
        bulletListMarker: "-",
        codeBlockStyle: "fenced",
        ...options,
      };

      this.addRule("lineBreak", {
        filter: "br",
        replacement: () => "  \n",
      });

      this.addRule("heading", {
        filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
        replacement: (content, node) => {
          const hLevel = Number(node.nodeName.charAt(1));
          return `\n\n${"#".repeat(hLevel)} ${content}\n\n`;
        },
      });

      // Custom rule for list items to ensure proper nesting and markers
      this.addRule("customLi", {
        filter: "li",
        replacement: function (content, node) {
          let processedContent = content.trim();

          // Heuristic: If content contains multiple lines and the second line
          // looks like a list item, ensure a double newline for nested lists.
          if (processedContent.length > 0) {
            const lines = processedContent.split("\n");
            if (lines.length > 1 && /^\s*[-*+]|^[0-9]+\./.test(lines[1])) {
              processedContent = lines.join("\n\n").trim();
            }
          }

          let listItemMarkdown;
          if (node.parentNode.nodeName === "UL") {
            let indent = "";
            let liAncestorCount = 0;
            let parent = node.parentNode;

            // Calculate indentation for nested unordered lists
            while (parent) {
              if (parent.nodeName === "LI") {
                liAncestorCount++;
              }
              parent = parent.parentNode;
            }
            for (let i = 0; i < liAncestorCount; i++) {
              indent += "    "; // 4 spaces per nesting level
            }
            listItemMarkdown = `${indent}${this.options.bulletListMarker} ${processedContent}`;
          } else if (node.parentNode.nodeName === "OL") {
            // Get the correct index for ordered list items
            const siblings = Array.from(node.parentNode.children).filter(
              (child) => child.nodeName === "LI"
            );
            const index = siblings.indexOf(node);
            listItemMarkdown = `${index + 1}. ${processedContent}`;
          } else {
            listItemMarkdown = processedContent; // Fallback
          }
          // Always add a newline after each list item for separation
          return listItemMarkdown + "\n";
        }.bind(this),
      });

      this.addRule("code", {
        filter: "code",
        replacement: (content, node) => {
          if (node.parentNode.nodeName === "PRE") return content;
          return `\`${content}\``;
        },
      });

      // Rule for preformatted code blocks
      this.addRule("pre", {
        filter: "pre",
        replacement: (content, node) => {
          let lang = "";

          // Attempt to find language for Gemini's code blocks
          const geminiCodeBlockParent = node.closest(".code-block");
          if (geminiCodeBlockParent) {
            const geminiLanguageSpan = geminiCodeBlockParent.querySelector(
              ".code-block-decoration span"
            );
            if (geminiLanguageSpan && geminiLanguageSpan.textContent.trim()) {
              lang = geminiLanguageSpan.textContent.trim();
            }
          }

          // Fallback to ChatGPT's language selector if Gemini's wasn't found
          if (!lang) {
            const chatgptLanguageDiv = node.querySelector(
              ".flex.items-center.text-token-text-secondary"
            );
            if (chatgptLanguageDiv) {
              lang = chatgptLanguageDiv.textContent.trim();
            }
          }

          const codeElement = node.querySelector("code");
          const codeText = codeElement ? codeElement.textContent.trim() : "";

          return `\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`;
        },
      });

      this.addRule("strong", {
        filter: ["strong", "b"],
        replacement: (content) => `**${content}**`,
      });

      this.addRule("em", {
        filter: ["em", "i"],
        replacement: (content) => `_${content}_`,
      });

      this.addRule("blockQuote", {
        filter: "blockquote",
        replacement: (content) =>
          content
            .trim()
            .split("\n")
            .map((l) => `> ${l}`)
            .join("\n"),
      });

      this.addRule("link", {
        filter: "a",
        replacement: (content, node) =>
          `[${content}](${node.getAttribute("href")})`,
      });

      this.addRule("strikethrough", {
        filter: (node) => node.nodeName === "DEL",
        replacement: (content) => `~~${content}~~`,
      });

      // Rule for HTML tables to Markdown table format
      this.addRule("table", {
        filter: "table",
        replacement: function (content, node) {
          const headerRows = Array.from(node.querySelectorAll("thead tr"));
          const bodyRows = Array.from(node.querySelectorAll("tbody tr"));
          const footerRows = Array.from(node.querySelectorAll("tfoot tr"));

          let allRowsContent = [];

          const getRowCellsContent = (rowElement) => {
            const cells = Array.from(rowElement.querySelectorAll("th, td"));
            return cells.map((cell) =>
              cell.textContent.replace(/\s+/g, " ").trim()
            );
          };

          if (headerRows.length > 0) {
            allRowsContent.push(getRowCellsContent(headerRows[0]));
          }

          bodyRows.forEach((row) => {
            allRowsContent.push(getRowCellsContent(row));
          });

          footerRows.forEach((row) => {
            allRowsContent.push(getRowCellsContent(row));
          });

          if (allRowsContent.length === 0) {
            return "";
          }

          const isFirstRowAHeader = headerRows.length > 0;
          const maxCols = Math.max(...allRowsContent.map((row) => row.length));

          const paddedRows = allRowsContent.map((row) => {
            const paddedRow = [...row];
            while (paddedRow.length < maxCols) {
              paddedRow.push("");
            }
            return paddedRow;
          });

          let markdownTable = "";

          if (isFirstRowAHeader) {
            markdownTable += "| " + paddedRows[0].join(" | ") + " |\n";
            markdownTable += "|" + Array(maxCols).fill("---").join("|") + "|\n";
            for (let i = 1; i < paddedRows.length; i++) {
              markdownTable += "| " + paddedRows[i].join(" | ") + " |\n";
            }
          } else {
            for (let i = 0; i < paddedRows.length; i++) {
              markdownTable += "| " + paddedRows[i].join(" | ") + " |\n";
              if (i === 0) {
                markdownTable +=
                  "|" + Array(maxCols).fill("---").join("|") + "|\n";
              }
            }
          }

          return markdownTable.trim();
        },
      });

      // Universal rule for paragraph tags with a fix for list item newlines
      this.addRule("paragraph", {
        filter: "p",
        replacement: (content, node) => {
          if (!content.trim()) return ""; // Ignore empty paragraphs

          let currentNode = node.parentNode;
          while (currentNode) {
            // If inside TH or TR (table headers/rows), suppress newlines.
            if (PARAGRAPH_FILTER_PARENT_NODES.includes(currentNode.nodeName)) {
              return content;
            }
            // If inside an LI (list item), add a single newline for proper separation.
            if (currentNode.nodeName === "LI") {
              return content + "\n";
            }
            currentNode = currentNode.parentNode;
          }
          // For all other cases, add double newlines for standard paragraph separation.
          return `\n\n${content}\n\n`;
        },
      });
    }

    addRule(key, rule) {
      this.rules.push({ key, ...rule });
    }

    turndown(rootNode) {
      let output = "";

      const process = (node) => {
        if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
        if (node.nodeType !== Node.ELEMENT_NODE) return "";

        const rule = this.rules.find(
          (r) =>
            (typeof r.filter === "string" &&
              r.filter === node.nodeName.toLowerCase()) ||
            (Array.isArray(r.filter) &&
              r.filter.includes(node.nodeName.toLowerCase())) ||
            (typeof r.filter === "function" && r.filter(node))
        );

        const content = Array.from(node.childNodes)
          .map((n) => process(n))
          .join("");

        if (rule) return rule.replacement(content, node, this.options);
        return content;
      };

      let parsedRootNode = rootNode;
      if (typeof rootNode === "string") {
        const parser = new DOMParser();
        const doc = parser.parseFromString(rootNode, "text/html");
        parsedRootNode = doc.body || doc.documentElement;
      }

      output = Array.from(parsedRootNode.childNodes)
        .map((n) => process(n))
        .join("");
      // Clean up excessive newlines (more than two)
      return output.trim().replace(/\n{3,}/g, "\n\n");
    }
  }
  // --- Inlined Turndown.js - END ---

  // --- Utility Functions ---
  const Utils = {
    /**
     * Converts a string into a URL-friendly slug.
     * @param {string} str The input text.
     * @returns {string} The slugified string.
     */
    slugify(str) {
      return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50);
    },

    /**
     * Formats a Date object into a local time string with UTC offset.
     * @param {Date} d The Date object.
     * @returns {string} The formatted local time string.
     */
    formatLocalTime(d) {
      const pad = (n) => String(n).padStart(2, "0");
      const tzOffsetMin = -d.getTimezoneOffset();
      const sign = tzOffsetMin >= 0 ? "+" : "-";
      const absOffset = Math.abs(tzOffsetMin);
      const offsetHours = pad(Math.floor(absOffset / 60));
      const offsetMinutes = pad(absOffset % 60);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
        d.getDate()
      )}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(
        d.getSeconds()
      )}-UTC${sign}${offsetHours}${offsetMinutes}`;
    },

    /**
     * Truncates a string to a given maximum length, adding "…" if truncated.
     * @param {string} str The input string.
     * @param {number} [len=70] The maximum length.
     * @returns {string} The truncated string.
     */
    truncate(str, len = 70) {
      return str.length <= len ? str : str.slice(0, len).trim() + "…";
    },

    /**
     * Escapes Markdown special characters in a string.
     * @param {string} text The input string.
     * @returns {string} The string with Markdown characters escaped.
     */
    escapeMd(text) {
      return text.replace(/[|\\`*_{}\[\]()#+\-!>]/g, "\\$&");
    },

    /**
     * Downloads text content as a file.
     * @param {string} filename The name of the file to download.
     * @param {string} text The content to save.
     * @param {string} [mimeType='text/plain;charset=utf-8'] The MIME type.
     */
    downloadFile(filename, text, mimeType = "text/plain;charset=utf-8") {
      const blob = new Blob([text], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
  };

  // --- Core Export Logic ---
  const ChatExporter = {
    /**
     * Extracts conversation data from ChatGPT's DOM structure.
     * @param {Document} doc - The Document object.
     * @returns {object|null} The standardized conversation data, or null.
     */
    extractChatGPTConversationData(doc) {
      const articles = [...doc.querySelectorAll(CHATGPT_ARTICLE_SELECTOR)];
      if (articles.length === 0) return null;

      const title =
        doc.title.replace(CHATGPT_TITLE_REPLACE_TEXT, "").trim() ||
        DEFAULT_CHAT_TITLE;
      const messages = [];
      let chatIndex = 1;

      for (const article of articles) {
        const seenDivs = new Set();
        const header =
          article.querySelector(CHATGPT_HEADER_SELECTOR)?.textContent?.trim() ||
          "";
        const textDivs = article.querySelectorAll(CHATGPT_TEXT_DIV_SELECTOR);
        let fullText = "";

        textDivs.forEach((div) => {
          const key = div.innerText.trim();
          if (!key || seenDivs.has(key)) return;
          seenDivs.add(key);
          fullText += key + "\n";
        });

        if (!fullText.trim()) continue;

        const isUser = header
          .toLowerCase()
          .includes(CHATGPT_USER_MESSAGE_INDICATOR);
        const author = isUser ? "user" : "ai";

        messages.push({
          id: `${author}-${chatIndex}`,
          author: author,
          contentHtml: article, // Store the direct DOM Element
          contentText: fullText.trim(),
          timestamp: new Date(),
        });

        if (!isUser) chatIndex++;
      }

      return {
        title: title,
        messages: messages,
        messageCount: messages.length,
        exportedAt: new Date(),
        exporterVersion: EXPORTER_VERSION,
        threadUrl: window.location.href,
      };
    },

    /**
     * Extracts conversation data from Gemini's DOM structure.
     * @param {Document} doc - The Document object.
     * @returns {object|null} The standardized conversation data, or null.
     */
    extractGeminiConversationData(doc) {
      const messageItems = [
        ...doc.querySelectorAll(GEMINI_MESSAGE_ITEM_SELECTOR),
      ];
      if (messageItems.length === 0) return null;

      let title = DEFAULT_CHAT_TITLE;

      // Prioritize title from sidebar if available and not generic
      const sidebarActiveChatItem = doc.querySelector(
        GEMINI_SIDEBAR_ACTIVE_CHAT_SELECTOR
      );
      if (sidebarActiveChatItem && sidebarActiveChatItem.textContent.trim()) {
        title = sidebarActiveChatItem.textContent.trim();
      }

      const isGenericTitle = (t) =>
        !t ||
        t === DEFAULT_CHAT_TITLE ||
        t.toLowerCase() === "new chat" ||
        t.toLowerCase() === "untitled chat" ||
        t.toLowerCase() === "gemini";

      // Fallback to document title if sidebar title is not found or is generic
      const docTitleCandidate = doc.title
        .replace(GEMINI_TITLE_REPLACE_TEXT, "")
        .trim();
      if (
        isGenericTitle(title) &&
        docTitleCandidate &&
        !isGenericTitle(docTitleCandidate)
      ) {
        title = docTitleCandidate;
      }

      const messages = [];
      let chatIndex = 1;

      for (const item of messageItems) {
        let author = "";
        let messageContentElem = null;

        const tagName = item.tagName.toLowerCase();

        if (tagName === "user-query") {
          author = "user";
          messageContentElem = item.querySelector("div.query-content");
        } else if (tagName === "model-response") {
          author = "ai";
          messageContentElem = item.querySelector("message-content");
        }

        if (!messageContentElem) continue;

        messages.push({
          id: `${author}-${chatIndex}`,
          author: author,
          contentHtml: messageContentElem, // Store the direct DOM Element
          contentText: messageContentElem.innerText.trim(),
          timestamp: new Date(),
        });

        if (author === "ai") chatIndex++;
      }

      // Final fallback to the first user message if title is still generic
      if (
        isGenericTitle(title) &&
        messages.length > 0 &&
        messages[0].author === "user"
      ) {
        const firstUserMessage = messages[0].contentText;
        const words = firstUserMessage
          .split(/\s+/)
          .filter((word) => word.length > 0);
        if (words.length > 0) {
          let generatedTitle = words.slice(0, 7).join(" ");
          generatedTitle = generatedTitle.replace(/[,.;:!?\-+]$/, "").trim();
          if (generatedTitle.length < 5 && words.length > 1) {
            generatedTitle = words
              .slice(0, Math.min(words.length, 10))
              .join(" ");
            generatedTitle = generatedTitle.replace(/[,.;:!?\-+]$/, "").trim();
          }
          title = generatedTitle || DEFAULT_CHAT_TITLE;
        }
      }

      // Ensure a title is always set and is not generic
      if (isGenericTitle(title)) {
        title = DEFAULT_CHAT_TITLE;
      }

      return {
        title: title,
        messages: messages,
        messageCount: messages.length,
        exportedAt: new Date(),
        exporterVersion: EXPORTER_VERSION,
        threadUrl: window.location.href,
      };
    },

    /**
     * Converts standardized conversation data to Markdown format.
     * @param {object} conversationData - The standardized conversation data.
     * @param {TurndownService} turndownServiceInstance - Configured TurndownService.
     * @returns {{output: string, fileName: string}} Markdown string and filename.
     */
    formatToMarkdown(conversationData, turndownServiceInstance) {
      let toc = "";
      let content = "";
      let chatIndex = 1;

      conversationData.messages.forEach((msg) => {
        if (msg.author === "user") {
          const preview = Utils.truncate(
            msg.contentText.replace(/\s+/g, " "),
            70
          );
          toc += `- [${chatIndex}: ${Utils.escapeMd(
            preview
          )}](#chat-${chatIndex})\n`;
          content +=
            `### chat-${chatIndex}\n\n> ` +
            msg.contentText.replace(/\n/g, "\n> ") +
            "\n\n";
        } else {
          const markdownContent = turndownServiceInstance.turndown(
            msg.contentHtml
          );
          content += markdownContent + "\n\n" + MARKDOWN_BACK_TO_TOP_LINK;
          chatIndex++;
        }
      });

      const localTime = Utils.formatLocalTime(conversationData.exportedAt);

      const yaml = `---\nthread_name: ${
        conversationData.title
      }\nmessage_count: ${
        conversationData.messageCount / 2
      }\nexporter_version: ${EXPORTER_VERSION}\nexported_at: ${localTime}\nthread_url: ${
        conversationData.threadUrl
      }\n---\n`;
      const tocBlock = `## Table of Contents\n\n${toc.trim()}\n\n`;

      const finalOutput =
        yaml +
        `\n# ${conversationData.title}\n\n` +
        tocBlock +
        content.trim() +
        "\n\n";

      const platformPrefix = CHATGPT_HOSTNAMES.some((host) =>
        window.location.hostname.includes(host)
      )
        ? "chatgpt"
        : "gemini";
      const fileName = `${platformPrefix}_${Utils.slugify(
        conversationData.title
      )}_${localTime}.md`;

      return { output: finalOutput, fileName: fileName };
    },

    /**
     * Converts standardized conversation data to JSON format.
     * @param {object} conversationData - The standardized conversation data.
     * @returns {{output: string, fileName: string}} JSON string and filename.
     */
    formatToJSON(conversationData) {
      const jsonOutput = {
        thread_name: conversationData.title,
        message_count: conversationData.messageCount / 2,
        exporter_version: EXPORTER_VERSION,
        exported_at: conversationData.exportedAt.toISOString(),
        thread_url: conversationData.threadUrl,
        messages: conversationData.messages.map((msg) => ({
          id: msg.id,
          author: msg.author,
          content: msg.contentText,
        })),
      };

      const localTime = Utils.formatLocalTime(conversationData.exportedAt);
      const platformPrefix = CHATGPT_HOSTNAMES.some((host) =>
        window.location.hostname.includes(host)
      )
        ? "chatgpt"
        : "gemini";
      const fileName = `${platformPrefix}_${Utils.slugify(
        conversationData.title
      )}_${localTime}.json`;

      return {
        output: JSON.stringify(jsonOutput, null, 2),
        fileName: fileName,
      };
    },

    /**
     * Main export orchestrator. Extracts data, configures Turndown, and formats.
     * @param {string} format - The desired output format ('markdown' or 'json').
     */
    initiateExport(format) {
      const currentHost = window.location.hostname;
      let conversationData = null;
      let turndownServiceInstance = null;

      if (CHATGPT_HOSTNAMES.some((host) => currentHost.includes(host))) {
        conversationData =
          ChatExporter.extractChatGPTConversationData(document);
      } else if (GEMINI_HOSTNAMES.some((host) => currentHost.includes(host))) {
        conversationData = ChatExporter.extractGeminiConversationData(document);
      } else {
        alert("This exporter does not support the current chat platform.");
        return;
      }

      if (!conversationData || conversationData.messages.length === 0) {
        alert("No messages found to export.");
        return;
      }

      let fileOutput = null;
      let fileName = null;
      let mimeType = "";

      if (format === "markdown") {
        turndownServiceInstance = new TurndownService();

        // ChatGPT-specific rules for handling unique elements/classes
        if (CHATGPT_HOSTNAMES.some((host) => currentHost.includes(host))) {
          turndownServiceInstance.addRule("popup-div", {
            filter: (node) =>
              node.nodeName === "DIV" &&
              node.classList.contains(CHATGPT_POPUP_DIV_CLASS),
            replacement: (content) => {
              // Convert HTML content of popups to a code block
              const textWithLineBreaks = content
                .replace(/<br\s*\/?>/gi, "\n")
                .replace(/<\/(p|div|h[1-6]|ul|ol|li)>/gi, "\n")
                .replace(/<(?:p|div|h[1-6]|ul|ol|li)[^>]*>/gi, "\n")
                .replace(/<\/?[^>]+(>|$)/g, "")
                .replace(/\n+/g, "\n");
              return "\n```\n" + textWithLineBreaks + "\n```\n";
            },
          });
          turndownServiceInstance.addRule("buttonWithSpecificClass", {
            filter: (node) =>
              node.nodeName === "BUTTON" &&
              node.classList.contains(CHATGPT_BUTTON_SPECIFIC_CLASS),
            replacement: (content) =>
              content.trim() ? `__${content}__\n\n` : "",
          });
          turndownServiceInstance.addRule("remove-img", {
            filter: "img",
            replacement: () => "", // Remove image tags
          });
        }

        const markdownResult = ChatExporter.formatToMarkdown(
          conversationData,
          turndownServiceInstance
        );
        fileOutput = markdownResult.output;
        fileName = markdownResult.fileName;
        mimeType = "text/markdown;charset=utf-8";
      } else if (format === "json") {
        const jsonResult = ChatExporter.formatToJSON(conversationData);
        fileOutput = jsonResult.output;
        fileName = jsonResult.fileName;
        mimeType = "application/json;charset=utf-8";
      } else {
        alert("Invalid export format selected.");
        return;
      }

      if (fileOutput && fileName) {
        Utils.downloadFile(fileName, fileOutput, mimeType);
      }
    },
  };

  // --- UI Management ---
  const UIManager = {
    /**
     * Stores the timeout ID for the alert's auto-hide.
     * @type {number|null}
     */
    alertTimeoutId: null,

    /**
     * Determines the appropriate width for the alert based on the chat's content area.
     * @returns {string} The width in pixels (e.g., '600px').
     */
    getTargetContentWidth() {
      let targetElement = null;
      let width = 0;

      if (
        CHATGPT_HOSTNAMES.some((host) =>
          window.location.hostname.includes(host)
        )
      ) {
        // Try to find the specific input container for ChatGPT
        targetElement = document.querySelector(
          "form > div.relative.flex.h-full.max-w-full.flex-1.flex-col"
        );
        if (!targetElement) {
          // Fallback to a broader conversation content container if the specific input container is not found
          targetElement = document.querySelector(
            "div.w-full.md\\:max-w-2xl.lg\\:max-w-3xl.xl\\:max-w-4xl.flex-shrink-0.px-4"
          );
        }
      } else if (
        GEMINI_HOSTNAMES.some((host) => window.location.hostname.includes(host))
      ) {
        // Try to find the specific input container for Gemini
        targetElement = document.querySelector(
          "gb-chat-input-textarea-container"
        );
        if (!targetElement) {
          // Fallback to the main input section container
          targetElement = document.querySelector(
            "div.flex.flex-col.w-full.relative.max-w-3xl.m-auto"
          );
        }
      }

      if (targetElement) {
        width = targetElement.offsetWidth;
      }

      // Apply a reasonable min/max to prevent extreme sizes
      if (width < 350) width = 350; // Minimum width
      if (width > 900) width = 900; // Maximum width for very wide monitors

      return `${width}px`;
    },

    /**
     * Adds the export buttons to the current page.
     */
    addExportControls() {
      if (document.querySelector(`#${EXPORT_CONTAINER_ID}`)) {
        return; // Controls already exist
      }

      const container = document.createElement("div");
      container.id = EXPORT_CONTAINER_ID;
      container.style = COMMON_CONTROL_STYLES;

      const markdownButton = document.createElement("button");
      markdownButton.id = "export-markdown-btn";
      markdownButton.textContent = "⬇ Export MD";
      markdownButton.title = `${EXPORT_BUTTON_TITLE_PREFIX} - Markdown`;
      markdownButton.style = BUTTON_BASE_STYLES;
      markdownButton.onclick = () => ChatExporter.initiateExport("markdown");
      container.appendChild(markdownButton);

      const jsonButton = document.createElement("button");
      jsonButton.id = "export-json-btn";
      jsonButton.textContent = "⬇ JSON";
      jsonButton.title = `${EXPORT_BUTTON_TITLE_PREFIX} - JSON`;
      jsonButton.style = `${BUTTON_BASE_STYLES} ${BUTTON_SPACING_STYLE}`;
      jsonButton.onclick = () => ChatExporter.initiateExport("json");
      container.appendChild(jsonButton);

      document.body.appendChild(container);
    },

    /**
     * Displays a non-obstructive alert message.
     * @param {string} message The message to display.
     */
    showAlert(message) {
      // Clear any existing auto-hide timeout before showing a new alert
      if (UIManager.alertTimeoutId) {
        clearTimeout(UIManager.alertTimeoutId);
        UIManager.alertTimeoutId = null;
      }

      // Only show alert if the flag is not set in local storage
      if (localStorage.getItem(HIDE_ALERT_FLAG) === "true") {
        return;
      }

      // Check if alert is already present to avoid multiple instances.
      // If it is, and we're trying to show a new one, remove the old one first.
      let alertContainer = document.querySelector(`#${ALERT_CONTAINER_ID}`);
      if (alertContainer) {
        alertContainer.remove();
      }

      alertContainer = document.createElement("div");
      alertContainer.id = ALERT_CONTAINER_ID;
      alertContainer.style = ALERT_STYLES;
      // Set dynamic max-width
      alertContainer.style.maxWidth = UIManager.getTargetContentWidth();

      // New: Title for the alert
      const titleElement = document.createElement("strong");
      titleElement.textContent = EXPORT_BUTTON_TITLE_PREFIX; // Use the global variable for title
      titleElement.style.display = "block"; // Ensure it takes full width and breaks line
      titleElement.style.marginBottom = "8px"; // Spacing before the message
      titleElement.style.fontSize = "16px"; // Slightly larger font for title
      titleElement.style.width = "100%"; // Take full available width of the alert box
      titleElement.style.textAlign = "center"; // Center the title
      alertContainer.appendChild(titleElement);

      // Message row with close button
      const messageRow = document.createElement("div");
      messageRow.style = ALERT_MESSAGE_ROW_STYLES;

      const messageSpan = document.createElement("span");
      messageSpan.textContent = message;
      messageRow.appendChild(messageSpan);

      const closeButton = document.createElement("button");
      closeButton.textContent = "×";
      closeButton.style = ALERT_CLOSE_BUTTON_STYLES;
      messageRow.appendChild(closeButton);
      alertContainer.appendChild(messageRow);

      // Checkbox for "never show again"
      const checkboxContainer = document.createElement("div");
      checkboxContainer.style = ALERT_CHECKBOX_CONTAINER_STYLES;

      const hideCheckbox = document.createElement("input");
      hideCheckbox.type = "checkbox";
      hideCheckbox.id = "hide-exporter-alert";
      hideCheckbox.style = ALERT_CHECKBOX_STYLES;
      checkboxContainer.appendChild(hideCheckbox);

      const label = document.createElement("label");
      label.htmlFor = "hide-exporter-alert";
      label.textContent = "Don't show this again";
      checkboxContainer.appendChild(label);
      alertContainer.appendChild(checkboxContainer);

      document.body.appendChild(alertContainer);

      // Function to hide and remove the alert
      const hideAndRemoveAlert = () => {
        alertContainer.style.opacity = "0";
        setTimeout(() => {
          if (alertContainer) {
            // Check if element still exists before removing
            alertContainer.remove();
          }
          UIManager.alertTimeoutId = null; // Reset timeout ID
        }, 500); // Remove after fade out
      };

      // Event listener for close button
      closeButton.onclick = () => {
        if (hideCheckbox.checked) {
          localStorage.setItem(HIDE_ALERT_FLAG, "true");
        }
        hideAndRemoveAlert();
      };

      // Set auto-hide timeout
      UIManager.alertTimeoutId = setTimeout(() => {
        // Only auto-hide if the checkbox is NOT checked
        if (
          alertContainer &&
          alertContainer.parentNode &&
          !hideCheckbox.checked
        ) {
          hideAndRemoveAlert();
        } else {
          UIManager.alertTimeoutId = null; // Clear if not auto-hiding
        }
      }, ALERT_AUTO_CLOSE_DURATION); // Use the defined duration
    },

    /**
     * Initializes a MutationObserver to ensure the controls are always present
     * even if the DOM changes dynamically (e.g., page navigation in SPAs).
     * The observer will NOT manage the alert display directly to prevent re-triggering.
     */
    initObserver() {
      const observer = new MutationObserver((mutations) => {
        // Only re-add export controls if they are missing
        if (!document.querySelector(`#${EXPORT_CONTAINER_ID}`)) {
          UIManager.addExportControls();
        }
        // IMPORTANT: The alert display logic is intentionally removed from here.
        // It is handled once on page load in UIManager.init().
      });
      observer.observe(document.body, { childList: true, subtree: true });
    },

    /**
     * Initializes the UI components by adding controls and setting up the observer.
     */
    init() {
      // Add controls after DOM is ready
      if (
        document.readyState === "complete" ||
        document.readyState === "interactive"
      ) {
        setTimeout(UIManager.addExportControls, DOM_READY_TIMEOUT);
      } else {
        window.addEventListener("DOMContentLoaded", () =>
          setTimeout(UIManager.addExportControls, DOM_READY_TIMEOUT)
        );
      }
      UIManager.initObserver();

      // Show alert specifically for Gemini on initial load if not hidden
      // This runs only once when the script is first executed on page load.
      if (
        GEMINI_HOSTNAMES.some((host) =>
          window.location.hostname.includes(host)
        ) &&
        localStorage.getItem(HIDE_ALERT_FLAG) !== "true"
      ) {
        UIManager.showAlert(
          "Before using the Export MD or Export JSON tool (by clicking the button at the right corner of the page), please scroll up to the beginning of the conversation to ensure all messages will be exported. If you don't scroll up first, some earlier messages might be missed."
        );
      }
    },
  };

  // --- Script Initialization ---
  UIManager.init();
})();
