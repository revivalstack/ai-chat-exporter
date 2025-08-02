// ==UserScript==
// @name         ChatGPT / Claude / Copilot / Gemini AI Chat Exporter by RevivalStack
// @namespace    https://github.com/revivalstack/chatgpt-exporter
// @version      2.7.1
// @description  Export your ChatGPT, Claude, Copilot or Gemini chat into a properly and elegantly formatted Markdown or JSON.
// @author       Mic Mejia (Refactored by Google Gemini)
// @homepage     https://github.com/micmejia
// @license      MIT License
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @match        https://claude.ai/*
// @match        https://copilot.microsoft.com/*
// @match        https://gemini.google.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  "use strict";

  // --- Global Constants ---
  const EXPORTER_VERSION = "2.7.1";
  const EXPORT_CONTAINER_ID = "export-controls-container";
  const OUTLINE_CONTAINER_ID = "export-outline-container"; // ID for the outline div
  const DOM_READY_TIMEOUT = 1000;
  const EXPORT_BUTTON_TITLE_PREFIX = `AI Chat Exporter v${EXPORTER_VERSION}`;
  const ALERT_CONTAINER_ID = "exporter-alert-container";
  const HIDE_ALERT_FLAG = "exporter_hide_scroll_alert"; // Local Storage flag
  const ALERT_AUTO_CLOSE_DURATION = 30000; // 30 seconds
  const OUTLINE_COLLAPSED_STATE_KEY = "outline_is_collapsed"; // Local Storage key for collapsed state
  const AUTOSCROLL_INITIAL_DELAY = 2000; // Initial delay before starting auto-scroll (X seconds)
  const OUTLINE_TITLE_ID = "ai-chat-exporter-outline-title";
  const OUTPUT_FILE_FORMAT_DEFAULT = "{platform}_{title}_{timestampLocal}";
  const GM_OUTPUT_FILE_FORMAT = "aiChatExporter_fileFormat";

  // --- Font Stack for UI Elements ---
  const FONT_STACK = `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`;

  // Common styles for the container and buttons
  // These will be applied property by property.
  const COMMON_CONTROL_PROPS = {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "9999",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    fontSize: "14px",
    cursor: "pointer",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    fontFamily: FONT_STACK,
  };

  // New styles for the outline container (property by property)
  const OUTLINE_CONTAINER_PROPS = {
    position: "fixed",
    bottom: "70px", // Position above the export buttons
    right: "20px",
    zIndex: "9998", // Below buttons, above general content
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    fontSize: "12px", // Smaller font for outline
    borderRadius: "8px",
    backgroundColor: "#fff", // White background
    color: "#333", // Dark text
    maxHeight: "350px", // Max height for scrollable content
    width: "300px", // Fixed width
    padding: "10px",
    border: "1px solid #ddd",
    fontFamily: FONT_STACK,
    display: "flex",
    flexDirection: "column",
    transition:
      "max-height 0.3s ease-in-out, padding 0.3s ease-in-out, opacity 0.3s ease-in-out",
    opacity: "1",
    transformOrigin: "bottom right", // For scaling/transform animations if desired
  };

  const OUTLINE_CONTAINER_COLLAPSED_PROPS = {
    maxHeight: "30px", // Height when collapsed
    padding: "5px 10px",
    overflow: "hidden",
    opacity: "0.9",
  };

  const OUTLINE_HEADER_PROPS = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "5px",
    paddingBottom: "5px",
    borderBottom: "1px solid #eee",
    fontWeight: "bold",
    cursor: "pointer", // Indicates it's clickable to collapse/expand
  };

  const OUTLINE_TITLE_PROPS = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "5px",
    paddingBottom: "5px",
    borderBottom: "1px solid #eee",
    wordWrap: "break-word" /* Ensures long titles wrap */,
  };

  // Styles for the "Select all" section
  const SELECT_ALL_CONTAINER_PROPS = {
    display: "flex",
    alignItems: "center",
    padding: "5px 0",
    marginBottom: "5px",
    borderBottom: "1px solid #eee",
  };

  // Styles for the search bar
  const SEARCH_INPUT_PROPS = {
    width: "calc(100% - 20px)", // Full width minus padding
    padding: "6px 10px",
    margin: "5px 0 10px 0",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "12px",
    fontFamily: FONT_STACK,
  };

  const NO_MATCH_MESSAGE_PROPS = {
    textAlign: "center",
    fontStyle: "italic",
    fontWeight: "bold",
    color: "#666",
    padding: "10px 0",
  };

  const OUTLINE_ITEM_PROPS = {
    display: "flex",
    alignItems: "center",
    marginBottom: "3px",
    lineHeight: "1.3",
  };

  const OUTLINE_CHECKBOX_PROPS = {
    marginRight: "5px",
    cursor: "pointer",
  };

  const OUTLINE_TOGGLE_BUTTON_PROPS = {
    background: "none",
    border: "none",
    fontSize: "16px",
    cursor: "pointer",
    padding: "0 5px",
    color: "#5b3f87",
  };

  const BUTTON_BASE_PROPS = {
    padding: "10px 14px",
    backgroundColor: "#5b3f87", // Primary brand color
    color: "white",
    border: "none",
    cursor: "pointer",
    borderRadius: "8px",
  };

  const BUTTON_SPACING_PROPS = {
    marginLeft: "8px",
  };

  // --- Alert Styles ---
  // Note: max-width for ALERT_PROPS will be dynamically set
  const ALERT_PROPS = {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: "10000",
    backgroundColor: "rgba(91, 63, 135, 0.9)", // Shade of #5b3f87 with transparency
    color: "white",
    padding: "15px 20px",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column", // Changed to column for title, message and checkbox
    justifyContent: "space-between",
    alignItems: "flex-start", // Align items to the start for better layout
    fontSize: "14px",
    opacity: "1",
    transition: "opacity 0.5s ease-in-out",
    fontFamily: FONT_STACK,
  };

  const ALERT_MESSAGE_ROW_PROPS = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: "10px", // Space between message and checkbox
  };

  const ALERT_CLOSE_BUTTON_PROPS = {
    background: "none",
    border: "none",
    color: "white",
    fontSize: "20px",
    cursor: "pointer",
    marginLeft: "15px", // Add margin to push it right
    lineHeight: "1", // Align 'x' vertically
  };

  const ALERT_CHECKBOX_CONTAINER_PROPS = {
    display: "flex",
    alignItems: "center",
    width: "100%",
  };

  const ALERT_CHECKBOX_PROPS = {
    marginRight: "5px",
  };

  // --- Hostname-Specific Selectors & Identifiers ---
  const CHATGPT = "chatgpt";
  const CHATGPT_HOSTNAMES = ["chat.openai.com", "chatgpt.com"];
  const CHATGPT_TITLE_REPLACE_TEXT = " - ChatGPT";
  const CHATGPT_ARTICLE_SELECTOR = "article";
  const CHATGPT_HEADER_SELECTOR = "h5";
  const CHATGPT_TEXT_DIV_SELECTOR = "div.text-base";
  const CHATGPT_USER_MESSAGE_INDICATOR = "you said";
  const CHATGPT_POPUP_DIV_CLASS = "popover";
  const CHATGPT_BUTTON_SPECIFIC_CLASS = "text-sm";

  const GEMINI = "gemini";
  const GEMINI_HOSTNAMES = ["gemini.google.com"];
  const GEMINI_TITLE_REPLACE_TEXT = "Gemini - ";
  const GEMINI_MESSAGE_ITEM_SELECTOR = "user-query, model-response";
  const GEMINI_SIDEBAR_ACTIVE_CHAT_SELECTOR =
    'div[data-test-id="conversation"].selected .conversation-title';

  const CLAUDE = "claude";
  const CLAUDE_HOSTNAMES = ["claude.ai"];
  const CLAUDE_MESSAGE_SELECTOR =
    ".font-claude-message:not(#markdown-artifact), .font-user-message";
  const CLAUDE_USER_MESSAGE_CLASS = "font-user-message";
  const CLAUDE_THINKING_BLOCK_CLASS = "transition-all";
  const CLAUDE_ARTIFACT_BLOCK_CELL = ".artifact-block-cell";

  const COPILOT = "copilot";
  const COPILOT_HOSTNAMES = ["copilot.microsoft.com"];
  const COPILOT_MESSAGE_SELECTOR =
    '[data-content="user-message"], [data-content="ai-message"]';
  const COPILOT_USER_MESSAGE_SELECTOR = '[data-content="user-message"]';
  const COPILOT_BOT_MESSAGE_SELECTOR = '[data-content="ai-message"]';

  const HOSTNAME = window.location.hostname;
  const CURRENT_PLATFORM = (() => {
    if (CHATGPT_HOSTNAMES.some((host) => HOSTNAME.includes(host))) {
      return CHATGPT;
    }
    if (CLAUDE_HOSTNAMES.some((host) => HOSTNAME.includes(host))) {
      return CLAUDE;
    }
    if (COPILOT_HOSTNAMES.some((host) => HOSTNAME.includes(host))) {
      return COPILOT;
    }
    if (GEMINI_HOSTNAMES.some((host) => HOSTNAME.includes(host))) {
      return GEMINI;
    }
    return "unknown";
  })();

  // --- Markdown Formatting Constants ---
  const DEFAULT_CHAT_TITLE = "chat";
  const MARKDOWN_TOC_PLACEHOLDER_LINK = "#table-of-contents";
  const MARKDOWN_BACK_TO_TOP_LINK = `___\n###### [top](${MARKDOWN_TOC_PLACEHOLDER_LINK})\n`;

  // Parents of <p> tags where newlines should be suppressed or handled differently
  // LI is handled separately in the paragraph rule for single newlines.
  const PARAGRAPH_FILTER_PARENT_NODES = ["TH", "TR"];

  // Styles for the scrollable message list div
  const MESSAGE_LIST_PROPS = {
    overflowY: "auto", // Enable vertical scrolling for this specific div
    flexGrow: "1", // Allow it to grow and take available space
    paddingRight: "5px", // Add some padding for scrollbar visibility
  };

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
    slugify(str, toLowerCase = true, maxLength = 120) {
      if (typeof str !== "string") {
        return "invalid-filename"; // Handle non-string input gracefully
      }
      if (toLowerCase) {
        str = str.toLocaleLowerCase();
      }
      return str
        .replace(/[^a-zA-Z0-9\-_.+]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .replace(/^$/, "invalid-filename")
        .slice(0, maxLength);
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
      )}${sign}${offsetHours}${offsetMinutes}`;
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

    /**
     * Applies a set of CSS properties to an element.
     * @param {HTMLElement} element The HTML element to style.
     * @param {object} styles An object where keys are CSS property names (camelCase) and values are their values.
     */
    applyStyles(element, styles) {
      for (const prop in styles) {
        element.style[prop] = styles[prop];
      }
    },

    /**
     * Formats a filename string based on provided format and chat data.
     *
     * @param {string} format - The format string with placeholders (e.g., "{platform}_{tag1}_{title}_{timestamp}.md").
     * @param {string} title - The cleaned title of the chat.
     * @param {string[]} tags - An array of tags for the chat.
     * @param {string} ext - The file extenstion without leading dot.
     * @returns {string} The formatted filename.
     */
    formatFileName(format, title, tags, ext) {
      // Ensure tags is an array
      const tagsArray = Array.isArray(tags) ? tags : [];

      const replacements = {
        "{exporter}": EXPORTER_VERSION,
        "{platform}": CURRENT_PLATFORM,
        "{title}": title.slice(0, 70).toLocaleLowerCase(),
        "{timestamp}": new Date().toISOString(),
        "{timestampLocal}": Utils.formatLocalTime(new Date()),
        "{tags}": tagsArray.join("-").toLocaleLowerCase(), // Comma separated string of all tags
      };

      // Add individual tags (tag1 to tag9)
      for (let i = 0; i < 9; i++) {
        const tagName = `{tag${i + 1}}`;
        replacements[tagName] = tagsArray[i]
          ? tagsArray[i].toLocaleLowerCase()
          : ""; // Use tag if it exists, otherwise empty string
      }

      let formattedFilename = format;
      for (const placeholder in replacements) {
        if (replacements.hasOwnProperty(placeholder)) {
          // Replace all occurrences of the placeholder with its value
          formattedFilename = formattedFilename
            .split(placeholder)
            .join(replacements[placeholder]);
        }
      }

      return Utils.slugify(`${formattedFilename}.${ext}`, false);
    },

    /**
     * Parses a raw chat title to extract tags and the cleaned main title.
     * Tags starting with '#' followed by one or more digits are ignored.
     *
     * @param {string} rawTitle - The raw chat title string, e.g., "#aice #plan #tech #50731 Browser Storage Options Comparison".
     * @returns {{title: string, tags: string[]}} An object containing the cleaned title and an array of extracted tags.
     */
    parseChatTitleAndTags(rawTitle) {
      const tags = [];
      let cleanedTitle = rawTitle.trim();

      // Regular expression to find tags at the beginning of the string:
      // # (hash)
      // \S+ (one or more non-whitespace characters)
      // ^ (start of string)
      // (\s*#\S+)* (zero or more occurrences of space and then a tag)
      const tagRegex = /(^|\s+)#(\S+)/g;
      let match;

      // Iterate over all matches to extract tags
      while ((match = tagRegex.exec(cleanedTitle)) !== null) {
        const fullTag = match[0].trim(); // e.g., "#aice", " #plan"
        const tagName = match[2]; // e.g., "aice", "plan"

        // Check if the tag is numeric (e.g., #50731)
        if (!/^\d+$/.test(tagName)) {
          tags.push(tagName);
        }
      }

      // Remove all tags from the title string, including the numeric ones,
      // to get the final cleaned title.
      // This regex matches a hash, followed by one or more non-whitespace characters,
      // optionally followed by a space, only if it appears at the beginning or after a space.
      cleanedTitle = cleanedTitle.replace(/(^|\s+)#\S+/g, " ").trim();

      // Remove any extra spaces that might result from tag removal
      cleanedTitle = cleanedTitle.replace(/\s+/g, " ").trim();

      return {
        title: cleanedTitle,
        tags: tags,
      };
    },
  };

  // --- Core Export Logic ---
  const ChatExporter = {
    _currentChatData: null, // Store the last extracted chat data
    _selectedMessageIds: new Set(), // Store IDs of selected messages for export

    /**
     * Extracts chat data from ChatGPT's DOM structure.
     * @param {Document} doc - The Document object.
     * @returns {object|null} The standardized chat data, or null.
     */
    extractChatGPTChatData(doc) {
      const articles = [...doc.querySelectorAll(CHATGPT_ARTICLE_SELECTOR)];
      if (articles.length === 0) return null;

      let title =
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

        // Assign a unique ID to each message. This is crucial for selection.
        const messageId = `${author}-${chatIndex}-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`;

        messages.push({
          id: messageId, // Unique ID
          author: author,
          contentHtml: article, // Store the direct DOM Element
          contentText: fullText.trim(),
          timestamp: new Date(),
          originalIndex: chatIndex, // Keep original index for outline
        });

        if (!isUser) chatIndex++;
      }

      const _parsedTitle = Utils.parseChatTitleAndTags(title);

      return {
        _raw_title: title,
        title: _parsedTitle.title,
        tags: _parsedTitle.tags,
        author: CURRENT_PLATFORM,
        messages: messages,
        messageCount: messages.filter((m) => m.author === "user").length, // Count user messages as questions
        exportedAt: new Date(),
        exporterVersion: EXPORTER_VERSION,
        threadUrl: window.location.href,
      };
    },

    /**
     * Extracts chat data from Claude's DOM structure.
     * @param {Document} doc - The Document object.
     * @returns {object|null} The standardized chat data, or null.
     */
    extractClaudeChatData(doc) {
      const messageItems = [...doc.querySelectorAll(CLAUDE_MESSAGE_SELECTOR)];
      if (messageItems.length === 0) return null;

      const messages = [];
      let chatIndex = 1;
      const chatTitle = doc.title || DEFAULT_CHAT_TITLE;

      messageItems.forEach((item) => {
        const isUser = item.classList.contains(CLAUDE_USER_MESSAGE_CLASS);
        const author = isUser ? "user" : "ai";

        let messageContentHtml = null;
        let messageContentText = "";

        if (isUser) {
          // For user messages, the entire div is the content
          messageContentHtml = item;
          messageContentText = item.innerText.trim();
        } else {
          // For Claude messages, we need to filter out "thinking" blocks
          const claudeResponseContent = document.createElement("div");
          Array.from(item.children).forEach((child) => {
            const isThinkingBlock = child.className.includes(
              CLAUDE_THINKING_BLOCK_CLASS
            );
            const isArtifactBlock =
              (child.className.includes("pt-3") &&
                child.className.includes("pb-3")) ||
              child.querySelector(CLAUDE_ARTIFACT_BLOCK_CELL);

            // Only consider non-thinking, non-artifact blocks
            if (!isThinkingBlock && !isArtifactBlock) {
              const contentGrid = child.querySelector(".grid-cols-1");
              if (contentGrid) {
                // We will use the existing TurndownService to process this content
                claudeResponseContent.appendChild(contentGrid.cloneNode(true));
              }
            }
          });
          messageContentHtml = claudeResponseContent;
          messageContentText = claudeResponseContent.innerText.trim();
        }

        if (messageContentText) {
          const messageId = `${author}-${chatIndex}-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`;

          messages.push({
            id: messageId,
            author: author,
            contentHtml: messageContentHtml,
            contentText: messageContentText,
            timestamp: new Date(),
            originalIndex: chatIndex,
          });

          if (!isUser) chatIndex++;
        }
      });

      const _parsedTitle = Utils.parseChatTitleAndTags(chatTitle);

      return {
        _raw_title: chatTitle,
        title: _parsedTitle.title,
        tags: _parsedTitle.tags,
        author: CURRENT_PLATFORM,
        messages: messages,
        messageCount: messages.filter((m) => m.author === "user").length,
        exportedAt: new Date(),
        exporterVersion: EXPORTER_VERSION,
        threadUrl: window.location.href,
      };
    },

    /**
     * Extracts chat data from Copilot's DOM structure.
     * @param {Document} doc - The Document object.
     * @returns {object|null} The standardized chat data, or null.
     */
    extractCopilotChatData(doc) {
      const messageItems = [...doc.querySelectorAll(COPILOT_MESSAGE_SELECTOR)];
      if (messageItems.length === 0) return null;

      const messages = [];
      let chatIndex = 1;

      let rawTitle = "";
      const selected = doc.querySelector(
        '[role="option"][aria-selected="true"]'
      );
      if (selected) {
        rawTitle =
          selected.querySelector("p")?.textContent.trim() ||
          (selected.getAttribute("aria-label") || "")
            .split(",")
            .slice(1)
            .join(",")
            .trim();
      }
      if (!rawTitle) {
        rawTitle = (doc.title || "")
          .replace(/^\s*Microsoft[_\s-]*Copilot.*$/i, "")
          .replace(/\s*[-–|]\s*Copilot.*$/i, "")
          .trim();
      }
      if (!rawTitle) rawTitle = "Copilot Conversation";

      for (const item of messageItems) {
        const isUser = item.matches(COPILOT_USER_MESSAGE_SELECTOR);
        const author = isUser ? "user" : "ai";
        // The actual content is nested differently for user and AI messages
        const messageContentElem = isUser
          ? item.querySelector("div")
          : item.querySelector(":scope > div:nth-child(2)");

        if (!messageContentElem) continue;

        const messageId = `${author}-${chatIndex}-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`;

        messages.push({
          id: messageId,
          author: author,
          contentHtml: messageContentElem.cloneNode(true),
          contentText: messageContentElem.innerText.trim(),
          timestamp: new Date(),
          originalIndex: chatIndex,
        });

        if (author === "ai") chatIndex++;
      }

      const _parsedTitle = Utils.parseChatTitleAndTags(rawTitle);

      return {
        _raw_title: rawTitle,
        title: _parsedTitle.title,
        tags: _parsedTitle.tags,
        author: COPILOT,
        messages: messages,
        messageCount: messages.filter((m) => m.author === "user").length,
        exportedAt: new Date(),
        exporterVersion: EXPORTER_VERSION,
        threadUrl: window.location.href,
      };
    },

    /**
     * Extracts chat data from Gemini's DOM structure.
     * @param {Document} doc - The Document object.
     * @returns {object|null} The standardized chat data, or null.
     */
    extractGeminiChatData(doc) {
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
      } else {
        title = doc.title;
      }
      if (title.startsWith(GEMINI_TITLE_REPLACE_TEXT)) {
        title = title.replace(GEMINI_TITLE_REPLACE_TEXT, "").trim();
      }

      const messages = [];
      let chatIndex = 1;

      for (const item /* @type {HTMLElement} */ of messageItems) {
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

        // Assign a unique ID to each message. This is crucial for selection.
        const messageId = `${author}-${chatIndex}-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`;

        messages.push({
          id: messageId, // Unique ID
          author: author,
          contentHtml: messageContentElem, // Store the direct DOM Element
          contentText: messageContentElem.innerText.trim(),
          timestamp: new Date(),
          originalIndex: chatIndex, // Keep original index for outline
        });

        if (author === "ai") chatIndex++;
      }

      // Final fallback to the first user message if title is still default
      if (
        title === DEFAULT_CHAT_TITLE &&
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

      const _parsedTitle = Utils.parseChatTitleAndTags(title);

      return {
        _raw_title: title,
        title: _parsedTitle.title,
        tags: _parsedTitle.tags,
        author: CURRENT_PLATFORM,
        messages: messages,
        messageCount: messages.filter((m) => m.author === "user").length, // Count user messages as questions
        exportedAt: new Date(),
        exporterVersion: EXPORTER_VERSION,
        threadUrl: window.location.href,
      };
    },

    /**
     * Converts standardized chat data to Markdown format.
     * This function now expects a pre-filtered `chatData`.
     * @param {object} chatData - The standardized chat data (already filtered).
     * @param {TurndownService} turndownServiceInstance - Configured TurndownService.
     * @returns {{output: string, fileName: string}} Markdown string and filename.
     */
    formatToMarkdown(chatData, turndownServiceInstance) {
      let toc = "";
      let content = "";
      let exportChatIndex = 0; // Initialize to 0 for sequential user message numbering

      chatData.messages.forEach((msg) => {
        if (msg.author === "user") {
          exportChatIndex++; // Increment only for user messages
          const preview = Utils.truncate(
            msg.contentText.replace(/\s+/g, " "),
            70
          );
          toc += `- [${exportChatIndex}: ${Utils.escapeMd(
            preview
          )}](#chat-${exportChatIndex})\n`;
          content +=
            `### chat-${exportChatIndex}\n\n> ` +
            msg.contentText.replace(/\n/g, "\n> ") +
            "\n\n";
        } else {
          let markdownContent;
          try {
            markdownContent = turndownServiceInstance.turndown(msg.contentHtml);
          } catch (e) {
            console.error(
              `Error converting AI message ${msg.id} to Markdown:`,
              e
            );
            markdownContent = `[CONVERSION ERROR: Failed to render this section. Original content below]\n\n\`\`\`\n${msg.contentText}\n\`\`\`\n`;
          }
          content += markdownContent + "\n\n" + MARKDOWN_BACK_TO_TOP_LINK;
        }
        // Removed the incorrect increment logic from here
      });

      const localTime = Utils.formatLocalTime(chatData.exportedAt);

      const yaml = `---\ntitle: ${chatData.title}\ntags: [${chatData.tags.join(
        ", "
      )}]\nauthor: ${chatData.author}\ncount: ${
        chatData.messageCount
      }\nexporter: ${EXPORTER_VERSION}\ndate: ${localTime}\nurl: ${
        chatData.threadUrl
      }\n---\n`;
      const tocBlock = `## Table of Contents\n\n${toc.trim()}\n\n`;

      const finalOutput =
        yaml + `\n# ${chatData.title}\n\n` + tocBlock + content.trim() + "\n\n";

      const fileName = Utils.formatFileName(
        GM_getValue(GM_OUTPUT_FILE_FORMAT, OUTPUT_FILE_FORMAT_DEFAULT),
        chatData.title,
        chatData.tags,
        "md"
      );
      return { output: finalOutput, fileName: fileName };
    },

    /**
     * Converts standardized chat data to JSON format.
     * This function now expects a pre-filtered `chatData`.
     * @param {object} chatData - The standardized chat data (already filtered).
     * @param {TurndownService} turndownServiceInstance - Configured TurndownService.
     * @returns {{output: string, fileName: string}} JSON string and filename.
     */
    formatToJSON(chatData, turndownServiceInstance) {
      const processMessageContent = function (msg) {
        if (msg.author === "user") {
          return msg.contentText;
        } else {
          let markdownContent;
          try {
            markdownContent = turndownServiceInstance.turndown(msg.contentHtml);
          } catch (e) {
            console.error(
              `Error converting AI message ${msg.id} to Markdown:`,
              e
            );
            markdownContent = `[CONVERSION ERROR: Failed to render this section.]: ${msg.contentText}`;
          }
          return markdownContent;
        }
      };
      const jsonOutput = {
        title: chatData.title,
        tags: chatData.tags,
        author: chatData.author,
        count: chatData.messageCount,
        exporter: EXPORTER_VERSION,
        date: chatData.exportedAt.toISOString(),
        url: chatData.threadUrl,
        messages: chatData.messages.map((msg) => ({
          id: msg.id.split("-").slice(0, 2).join("-"), // Keep the ID for reference in JSON
          author: msg.author,
          content: processMessageContent(msg),
        })),
      };

      const fileName = Utils.formatFileName(
        GM_getValue(GM_OUTPUT_FILE_FORMAT, OUTPUT_FILE_FORMAT_DEFAULT),
        chatData.title,
        chatData.tags,
        "json"
      );

      return {
        output: JSON.stringify(jsonOutput, null, 2),
        fileName: fileName,
      };
    },

    /**
     * This function setups the rules for turndownServiceInstance
     * @param {TurndownService} turndownServiceInstance - Configured TurndownService.
     */
    setupTurndownRules(turndownServiceInstance) {
      if (CURRENT_PLATFORM === CHATGPT) {
        turndownServiceInstance.addRule("chatgptRemoveReactions", {
          filter: (node) =>
            node.nodeName === "DIV" &&
            // Check for the language div (2nd child).
            node.querySelector(
              ':scope > div:nth-child(1) > button[data-testid="copy-turn-action-button"]'
            ),
          replacement: () => "",
        });
        turndownServiceInstance.addRule("chatgptRemoveH6ChatGPTSaid", {
          filter: (node) =>
            node.nodeName === "H6" &&
            node.classList.contains("sr-only") &&
            node.textContent.trim().toLowerCase().startsWith("chatgpt said"),
          replacement: () => "",
        });
      }

      if (CURRENT_PLATFORM === COPILOT) {
        turndownServiceInstance.addRule("copilotRemoveReactions", {
          filter: (node) =>
            node.matches('[data-testid="message-item-reactions"]'),
          replacement: () => "",
        });

        // This single rule handles the entire Copilot code block structure.
        turndownServiceInstance.addRule("copilotCodeBlock", {
          filter: function (node, options) {
            // Filter for the grandparent div of the pre element using more concise CSS selectors.
            return (
              node.nodeName === "DIV" &&
              // Check for the language div (2nd child).
              node.querySelector(":scope > div:nth-child(1) > span") &&
              // Check for the code block div (3rd child) with a direct <pre> child.
              node.querySelector(":scope > div:nth-child(2) > div > pre")
            );
          },
          replacement: function (content, node) {
            // Get the language from the second child div.
            const languageNode = node.querySelector(
              ":scope > div:nth-child(1) > span"
            );
            const language = languageNode
              ? languageNode.textContent.trim().toLowerCase()
              : "";

            // Get the code content from the pre > code element within the third child div.
            const codeNode = node.querySelector(
              ":scope > div:nth-child(2) > div > pre > code"
            );
            if (!codeNode) return "";

            const codeText = codeNode.textContent || "";

            return "\n\n```" + language + "\n" + codeText + "\n```\n\n";
          },
        });

        turndownServiceInstance.addRule("copilotFooterLinks", {
          filter: function (node, options) {
            // Footer links for each message is an <a> with children: span, img, and span
            // Use the last span content as text
            return (
              node.nodeName === "A" &&
              node.querySelector(":scope > span:nth-child(1)") &&
              node.querySelector(":scope > img:nth-child(2)") &&
              node.querySelector(":scope > span:nth-child(3)")
            );
          },
          replacement: function (content, node) {
            // Get the link text from last span.
            const lastSpan = node.querySelector(":scope > span:nth-child(3)");
            const linkText = lastSpan
              ? lastSpan.textContent.trim()
              : node.getAttribute("href");

            return `[${linkText}](${node.getAttribute("href")}) `;
          },
        });
      }

      turndownServiceInstance.addRule("lineBreak", {
        filter: "br",
        replacement: () => "  \n",
      });

      turndownServiceInstance.addRule("heading", {
        filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
        replacement: (content, node) => {
          const hLevel = Number(node.nodeName.charAt(1));
          return `\n\n${"#".repeat(hLevel)} ${content}\n\n`;
        },
      });

      // Custom rule for list items to ensure proper nesting and markers
      turndownServiceInstance.addRule("customLi", {
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
            listItemMarkdown = `${indent}${turndownServiceInstance.options.bulletListMarker} ${processedContent}`;
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
        }.bind(turndownServiceInstance),
      });

      if (CURRENT_PLATFORM === CLAUDE) {
        // This single rule handles the entire Claude code block structure.
        turndownServiceInstance.addRule("claudeCodeBlock", {
          filter: function (node, options) {
            // Filter for the grandparent div of the pre element using more concise CSS selectors.
            return (
              node.nodeName === "DIV" &&
              // Check for the language div (2nd child).
              node.querySelector(":scope > div:nth-child(2)") &&
              // Check for the code block div (3rd child) with a direct <pre> child.
              node.querySelector(":scope > div:nth-child(3) > pre > code")
            );
          },
          replacement: function (content, node) {
            // Get the language from the second child div.
            const languageNode = node.querySelector(
              ":scope > div:nth-child(2)"
            );
            const language = languageNode
              ? languageNode.textContent.trim().toLowerCase()
              : "";

            // Get the code content from the pre > code element within the third child div.
            const codeNode = node.querySelector(
              ":scope > div:nth-child(3) > pre > code"
            );
            if (!codeNode) return "";

            const codeText = codeNode.textContent || "";

            return "\n\n```" + language + "\n" + codeText + "\n```\n\n";
          },
        });
      }

      turndownServiceInstance.addRule("code", {
        filter: "code",
        replacement: (content, node) => {
          if (node.parentNode.nodeName === "PRE") return content;
          return `\`${content}\``;
        },
      });

      // Rule for preformatted code blocks
      turndownServiceInstance.addRule("pre", {
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
          if (!codeElement) return content;
          const codeText = codeElement ? codeElement.textContent.trim() : "";

          // Ensure a blank line before the code section's language text if its parent is a list item
          let prefix = "\n"; // Default prefix for code blocks
          let prevSibling = node.previousElementSibling;

          // Check for a specific pattern: <p> immediately followed by <pre> inside an <li>
          if (prevSibling && prevSibling.nodeName === "P") {
            let parentLi = prevSibling.closest("li");
            if (parentLi && parentLi.contains(node)) {
              // Ensure the <pre> is also a descendant of the same <li>
              prefix = "\n\n"; // Add an extra newline for better separation
            }
          }

          return `${prefix}\`\`\`${lang}\n${codeText}\n\`\`\`\n`;
        },
      });

      turndownServiceInstance.addRule("strong", {
        filter: ["strong", "b"],
        replacement: (content) => `**${content}**`,
      });

      turndownServiceInstance.addRule("em", {
        filter: ["em", "i"],
        replacement: (content) => `_${content}_`,
      });

      turndownServiceInstance.addRule("blockQuote", {
        filter: "blockquote",
        replacement: (content) =>
          content
            .trim()
            .split("\n")
            .map((l) => `> ${l}`)
            .join("\n"),
      });

      turndownServiceInstance.addRule("link", {
        filter: "a",
        replacement: (content, node) =>
          `[${content}](${node.getAttribute("href")})`,
      });

      turndownServiceInstance.addRule("strikethrough", {
        filter: (node) => node.nodeName === "DEL",
        replacement: (content) => `~~${content}~~`,
      });

      // Rule for HTML tables to Markdown table format
      turndownServiceInstance.addRule("table", {
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
      turndownServiceInstance.addRule("paragraph", {
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

      // ChatGPT-specific rules for handling unique elements/classes
      if (CURRENT_PLATFORM === CHATGPT) {
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
        // turndownServiceInstance.addRule("remove-img", {
        //   filter: "img",
        //   replacement: () => "", // Remove image tags
        // });
      }

      // Gemini specific rule to remove language labels from being processed as content
      if (CURRENT_PLATFORM === GEMINI) {
        turndownServiceInstance.addRule("geminiCodeLanguageLabel", {
          filter: (node) =>
            node.nodeName === "SPAN" &&
            node.closest(".code-block-decoration") &&
            node.textContent.trim().length > 0, // Ensure it's not an an empty span
          replacement: () => "", // Replace with empty string
        });
      }

      turndownServiceInstance.addRule("images", {
        filter: (node) => node.nodeName === "IMG",
        replacement: (content, node) => {
          const src = node.getAttribute("src") || "";
          const alt = node.alt || "";
          return src ? `![${alt}](${src})` : "";
        },
      });
    },

    /**
     * Main export orchestrator. Extracts data, configures Turndown, and formats.
     * This function now filters messages based on _selectedMessageIds and visibility.
     * @param {string} format - The desired output format ('markdown' or 'json').
     */
    initiateExport(format) {
      // Use the _currentChatData that matches the outline's IDs
      const rawChatData = ChatExporter._currentChatData;
      let turndownServiceInstance = null;

      if (!rawChatData || rawChatData.messages.length === 0) {
        alert("No messages found to export.");
        return;
      }

      // --- Refresh ChatExporter._selectedMessageIds from current UI state and visibility ---
      ChatExporter._selectedMessageIds.clear(); // Clear previous state
      const outlineContainer = document.querySelector(
        `#${OUTLINE_CONTAINER_ID}`
      );
      if (outlineContainer) {
        // Only consider checkboxes that are checked AND visible
        const checkedVisibleCheckboxes = outlineContainer.querySelectorAll(
          ".outline-item-checkbox:checked"
        ); // This will only return visible ones if their parent `itemDiv` is hidden with `display:none` as `querySelectorAll` won't find them

        checkedVisibleCheckboxes.forEach((cb) => {
          // Ensure the parent element is actually visible before adding to selected
          const parentItemDiv = cb.closest("div");
          if (
            parentItemDiv &&
            window.getComputedStyle(parentItemDiv).display !== "none" &&
            cb.dataset.messageId
          ) {
            ChatExporter._selectedMessageIds.add(cb.dataset.messageId);
          }
        });

        // Also, manually add AI responses that follow selected *and visible* user messages.
        const visibleUserMessageIds = new Set();
        checkedVisibleCheckboxes.forEach((cb) => {
          const parentItemDiv = cb.closest("div");
          if (
            parentItemDiv &&
            window.getComputedStyle(parentItemDiv).display !== "none" &&
            cb.dataset.messageId
          ) {
            visibleUserMessageIds.add(cb.dataset.messageId);
          }
        });

        rawChatData.messages.forEach((msg, index) => {
          if (msg.author === "ai") {
            let prevUserMessageId = null;
            for (let i = index - 1; i >= 0; i--) {
              if (rawChatData.messages[i].author === "user") {
                prevUserMessageId = rawChatData.messages[i].id;
                break;
              }
            }
            if (
              prevUserMessageId &&
              visibleUserMessageIds.has(prevUserMessageId)
            ) {
              ChatExporter._selectedMessageIds.add(msg.id);
            }
          }
        });
      }
      // --- End Refresh ---

      // --- Filter messages based on selection ---
      const filteredMessages = rawChatData.messages.filter((msg) =>
        ChatExporter._selectedMessageIds.has(msg.id)
      );

      if (filteredMessages.length === 0) {
        alert(
          "No messages selected or visible for export. Please check at least one question in the outline or clear your search filter."
        );
        return;
      }

      // Create a new chatData object for the filtered export
      // Also, re-calculate messageCount for the filtered set
      const chatDataForExport = {
        ...rawChatData,
        messages: filteredMessages,
        messageCount: filteredMessages.filter((m) => m.author === "user")
          .length,
        exportedAt: new Date(), // Set current timestamp just before export
      };

      let fileOutput = null;
      let fileName = null;
      let mimeType = "";

      turndownServiceInstance = new TurndownService();
      ChatExporter.setupTurndownRules(turndownServiceInstance);

      if (format === "markdown") {
        // Pass the filtered chat data to formatToMarkdown
        const markdownResult = ChatExporter.formatToMarkdown(
          chatDataForExport,
          turndownServiceInstance
        );
        fileOutput = markdownResult.output;
        fileName = markdownResult.fileName;
        mimeType = "text/markdown;charset=utf-8";
      } else if (format === "json") {
        // Pass the filtered chat data to formatToJSON
        const jsonResult = ChatExporter.formatToJSON(
          chatDataForExport,
          turndownServiceInstance
        );
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

  // --- Injected CSS for Theme Overrides ---
  function injectThemeOverrideStyles() {
    const styleElement = document.createElement("style");
    styleElement.id = "ai-chat-exporter-theme-overrides";
    styleElement.textContent = `
      /* Always ensure the outline container and its children have a light theme */
      #${OUTLINE_CONTAINER_ID} {
        background-color: #fff !important;
        color: #333 !important;
      }

      /* Force the search input to have a light background and text color */
      #${OUTLINE_CONTAINER_ID} #outline-search-input {
        background-color: #fff !important;
        color: #333 !important;
        border: 1px solid #ddd !important;
      }

      /* --- Special rule for Gemini's search box on dark theme --- */
      /* Gemini's dark theme selector is very specific, so we need to match or exceed it. */
      .dark-theme #${OUTLINE_CONTAINER_ID} #outline-search-input {
        background-color: #fff !important;
        color: #333 !important;
      }

      /* Force scrollbar to be light for all browsers */
      /* For WebKit (Chrome, Safari, Gemini, ChatGPT) */
      #${OUTLINE_CONTAINER_ID} ::-webkit-scrollbar {
        width: 8px;
        background-color: #f1f1f1; /* Light track color */
      }
      
      #${OUTLINE_CONTAINER_ID} ::-webkit-scrollbar-thumb {
        background-color: #c1c1c1; /* Light thumb color */
        border-radius: 4px;
      }

      /* For Firefox */
      #${OUTLINE_CONTAINER_ID} {
        scrollbar-color: #c1c1c1 #f1f1f1 !important; /* Light thumb and track */
        scrollbar-width: thin !important;
      }
    `;
    document.head.appendChild(styleElement);
  }

  // --- UI Management ---
  const UIManager = {
    /**
     * Stores the timeout ID for the alert's auto-hide.
     * @type {number|null}
     */
    alertTimeoutId: null,
    _outlineIsCollapsed: false, // State for the outline collapse
    _lastProcessedChatUrl: null, // Track the last processed chat URL for Gemini
    _initialListenersAttached: false, // Track if the URL change handlers are initialized

    /**
     * Determines the appropriate width for the alert based on the chat's content area.
     * @returns {string} The width in pixels (e.g., '600px').
     */
    getTargetContentWidth() {
      let targetElement = null;
      let width = 0;

      if (CURRENT_PLATFORM === CHATGPT) {
        // Try to find the specific input container for ChatGPT
        targetElement = document.querySelector(
          "form > div.relative.flex.h-full.max-w-full.flex-1.flex-col"
        );
        if (!targetElement) {
          // Fallback to a broader chat content container if the specific input container is not found
          targetElement = document.querySelector(
            "div.w-full.md\\:max-w-2xl.lg\\:max-w-3xl.xl\\:max-w-4xl.flex-shrink-0.px-4"
          );
        }
      } else if (CURRENT_PLATFORM === GEMINI) {
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
      Utils.applyStyles(container, COMMON_CONTROL_PROPS);

      const markdownButton = document.createElement("button");
      markdownButton.id = "export-markdown-btn";
      markdownButton.textContent = "⬇ Export MD";
      markdownButton.title = `${EXPORT_BUTTON_TITLE_PREFIX}: Export to Markdown`;
      Utils.applyStyles(markdownButton, BUTTON_BASE_PROPS);
      markdownButton.onclick = () => ChatExporter.initiateExport("markdown");
      container.appendChild(markdownButton);

      const jsonButton = document.createElement("button");
      jsonButton.id = "export-json-btn";
      jsonButton.textContent = "⬇ JSON";
      jsonButton.title = `${EXPORT_BUTTON_TITLE_PREFIX}: Export to JSON`;
      Utils.applyStyles(jsonButton, {
        ...BUTTON_BASE_PROPS,
        ...BUTTON_SPACING_PROPS,
      });
      jsonButton.onclick = () => ChatExporter.initiateExport("json");
      container.appendChild(jsonButton);

      // --- Settings Button (NEW) ---
      const settingsButton = document.createElement("button");
      settingsButton.className = "export-button-settings";
      settingsButton.textContent = "⚙️";
      settingsButton.title = `${EXPORT_BUTTON_TITLE_PREFIX}: ⚙️ Settings: Configure Filename Format`;
      Utils.applyStyles(settingsButton, {
        ...BUTTON_BASE_PROPS,
        ...BUTTON_SPACING_PROPS,
      });
      settingsButton.addEventListener("click", () => {
        const currentFormat = GM_getValue(
          GM_OUTPUT_FILE_FORMAT,
          OUTPUT_FILE_FORMAT_DEFAULT
        );
        const newFormat = window.prompt(
          `+++++++  ${EXPORT_BUTTON_TITLE_PREFIX}  +++++++\n\n ` +
            `ENTER NEW FILENAME FORMAT:\n` +
            ` • sample1: {platform}__{tag1}__{title}__{timestampLocal}\n` +
            ` • sample2: {tag1}__{title}-v{exporter}-{timestamp}\n` +
            ` • current: ${currentFormat}\n\n` +
            `valid placeholders: \n  ` +
            `- {platform}              : e.g. chatgpt, gemini\n  ` +
            `- {title}                      : title, with tags removed\n  ` +
            `- {timestamp}          : YYYY-MM-DDTHH-mm-ss.sssZ\n  ` +
            `- {timestampLocal}: YYYY-MM-DDTHH-mm-ss[+/-]HHMM\n  ` +
            `- {tags}                     : all tags, hyphen-separated\n  ` +
            `- {tag1}                     : 1st tag\n  ` +
            `- {tag2}                     : 2nd tag\n  ` +
            `  ...\n  ` +
            `- {tag9}                     : 9th tag\n  ` +
            `- {exporter}             : AI Chat Exporter version\n`,
          currentFormat
        );

        if (newFormat !== null && newFormat !== currentFormat) {
          GM_setValue(GM_OUTPUT_FILE_FORMAT, newFormat);
          alert("Filename format updated successfully!");
          console.log("New filename format saved:", newFormat);
        } else if (newFormat === currentFormat) {
          // User clicked OK but didn't change the value, or entered same value
          console.log("Filename format not changed.");
        } else {
          // User clicked Cancel
          console.log("Filename format update cancelled.");
        }
      });
      container.appendChild(settingsButton);
      // --- End Settings Button ---

      document.body.appendChild(container);
    },

    /**
     * Adds and manages the collapsible outline div.
     */
    addOutlineControls() {
      let outlineContainer = document.querySelector(`#${OUTLINE_CONTAINER_ID}`);
      if (!outlineContainer) {
        outlineContainer = document.createElement("div");
        outlineContainer.id = OUTLINE_CONTAINER_ID;
        document.body.appendChild(outlineContainer);
      }

      // Apply base styles
      Utils.applyStyles(outlineContainer, OUTLINE_CONTAINER_PROPS);

      // Apply collapsed styles if state is collapsed
      if (UIManager._outlineIsCollapsed) {
        Utils.applyStyles(outlineContainer, OUTLINE_CONTAINER_COLLAPSED_PROPS);
      }

      UIManager.generateOutlineContent();
    },

    /**
     * Generates and updates the content of the outline div.
     * This function should be called whenever the chat data changes.
     */
    generateOutlineContent() {
      const outlineContainer = document.querySelector(
        `#${OUTLINE_CONTAINER_ID}`
      );
      if (!outlineContainer) return;

      // Extract fresh chat data
      let freshChatData = null;
      switch (CURRENT_PLATFORM) {
        case CHATGPT:
          freshChatData = ChatExporter.extractChatGPTChatData(document);
          break;
        case CLAUDE:
          freshChatData = ChatExporter.extractClaudeChatData(document);
          break;
        case COPILOT:
          freshChatData = ChatExporter.extractCopilotChatData(document);
          break;
        case GEMINI:
          freshChatData = ChatExporter.extractGeminiChatData(document);
          break;
        default:
          outlineContainer.style.display = "none"; // Hide if not supported
          return;
      }

      // Check if chat data has changed significantly to warrant a re-render
      // Compare message count and content of the last few messages as a heuristic
      // This is to avoid regenerating the outline on every minor DOM change.
      const hasDataChanged =
        !ChatExporter._currentChatData || // No previous data
        !freshChatData || // No new data
        freshChatData._raw_title !== ChatExporter._currentChatData._raw_title ||
        freshChatData.messages.length !==
          ChatExporter._currentChatData.messages.length ||
        (freshChatData.messages.length > 0 &&
          ChatExporter._currentChatData.messages.length > 0 &&
          freshChatData.messages[freshChatData.messages.length - 1]
            .contentText !==
            ChatExporter._currentChatData.messages[
              ChatExporter._currentChatData.messages.length - 1
            ].contentText);

      if (!hasDataChanged) {
        // If data hasn't changed, just ensure visibility based on message presence
        outlineContainer.style.display =
          freshChatData && freshChatData.messages.length > 0 ? "flex" : "none";
        return; // No need to regenerate content
      }

      // Update stored chat data
      ChatExporter._currentChatData = freshChatData;

      // Hide if no messages after update
      if (
        !ChatExporter._currentChatData ||
        ChatExporter._currentChatData.messages.length === 0
      ) {
        outlineContainer.style.display = "none";
        return;
      } else {
        outlineContainer.style.display = "flex";
      }

      // Clear existing content safely to avoid TrustedHTML error
      while (outlineContainer.firstChild) {
        outlineContainer.removeChild(outlineContainer.firstChild);
      }

      // Reset selections and check all by default (only on fresh rebuild)
      ChatExporter._selectedMessageIds.clear();

      // Header for Chat Outline (always visible)
      const headerDiv = document.createElement("div");
      Utils.applyStyles(headerDiv, OUTLINE_HEADER_PROPS);
      headerDiv.title = `AI Chat Exporter v${EXPORTER_VERSION}`;
      headerDiv.onclick = UIManager.toggleOutlineCollapse; // Only this div handles collapse

      const headerSpan = document.createElement("span");
      headerSpan.textContent = "AI Chat Exporter: Chat Outline";
      headerDiv.appendChild(headerSpan);

      const toggleButton = document.createElement("button");
      toggleButton.id = "outline-toggle-btn";
      toggleButton.textContent = UIManager._outlineIsCollapsed ? "▲" : "▼"; // Up/Down arrow
      Utils.applyStyles(toggleButton, OUTLINE_TOGGLE_BUTTON_PROPS);
      headerDiv.appendChild(toggleButton);

      outlineContainer.appendChild(headerDiv);

      const titleDiv = document.createElement("div");
      Utils.applyStyles(titleDiv, OUTLINE_TITLE_PROPS);
      titleDiv.textContent = freshChatData.title || DEFAULT_CHAT_TITLE;
      titleDiv.title = "tags: " + freshChatData.tags.join(", ");
      titleDiv.id = OUTLINE_TITLE_ID;
      outlineContainer.appendChild(titleDiv);

      // New: Select All checkbox and label section (below header)
      const selectAllContainer = document.createElement("div");
      Utils.applyStyles(selectAllContainer, SELECT_ALL_CONTAINER_PROPS);
      selectAllContainer.id = "outline-select-all-container"; // For easier hiding/showing

      const masterCheckbox = document.createElement("input");
      masterCheckbox.type = "checkbox";
      masterCheckbox.id = "outline-select-all";
      masterCheckbox.checked = true; // Default to checked
      Utils.applyStyles(masterCheckbox, OUTLINE_CHECKBOX_PROPS);
      // masterCheckbox.onchange will be set later after updateSelectedCountDisplay is defined and elements exist
      selectAllContainer.appendChild(masterCheckbox);

      const selectAllLabel = document.createElement("span");
      selectAllContainer.appendChild(selectAllLabel); // Append label here, content set later
      outlineContainer.appendChild(selectAllContainer);

      // Search Bar
      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.id = "outline-search-input";
      searchInput.placeholder =
        "Search text or regex in user queries & AI responses.";
      Utils.applyStyles(searchInput, SEARCH_INPUT_PROPS);
      outlineContainer.appendChild(searchInput);

      const noMatchMessage = document.createElement("div");
      noMatchMessage.id = "outline-no-match-message";
      noMatchMessage.textContent = "Your search text didn't match any items";
      Utils.applyStyles(noMatchMessage, NO_MATCH_MESSAGE_PROPS);
      noMatchMessage.style.display = "none"; // Hidden by default
      outlineContainer.appendChild(noMatchMessage);

      const hr = document.createElement("hr"); // Horizontal rule
      hr.style.cssText =
        "border: none; border-top: 1px solid #eee; margin: 5px 0;";
      outlineContainer.appendChild(hr);

      // List of messages
      const messageListDiv = document.createElement("div");
      messageListDiv.id = "outline-message-list";
      Utils.applyStyles(messageListDiv, MESSAGE_LIST_PROPS);

      let userQuestionCount = 0; // This will be 'y' (total items)

      const updateSelectedCountDisplay = () => {
        const totalUserMessages = userQuestionCount; // 'y'
        let selectedAndVisibleMessages = 0;

        // Only count if the outline is not collapsed
        if (!UIManager._outlineIsCollapsed) {
          const allCheckboxes = outlineContainer.querySelectorAll(
            ".outline-item-checkbox"
          );
          allCheckboxes.forEach((checkbox) => {
            // Check if the checkbox is checked AND its parent div is visible due to search filter
            const parentItemDiv = checkbox.closest("div");
            if (
              checkbox.checked &&
              parentItemDiv &&
              window.getComputedStyle(parentItemDiv).display !== "none"
            ) {
              selectedAndVisibleMessages++;
            }
          });
        }

        // Clear existing content safely
        while (selectAllLabel.firstChild) {
          selectAllLabel.removeChild(selectAllLabel.firstChild);
        }

        // Create a strong element for bold text
        const strongElement = document.createElement("strong");
        strongElement.appendChild(
          document.createTextNode("Items to export:  ")
        );
        strongElement.appendChild(
          document.createTextNode(selectedAndVisibleMessages.toString())
        );
        strongElement.appendChild(document.createTextNode(" out of "));
        strongElement.appendChild(
          document.createTextNode(totalUserMessages.toString())
        );

        selectAllLabel.appendChild(strongElement);
      };

      // Store references to the actual itemDiv elements for easy access during search
      const outlineItemElements = new Map(); // Map<messageId, itemDiv>

      ChatExporter._currentChatData.messages.forEach((msg, index) => {
        if (msg.author === "user") {
          userQuestionCount++; // Increment 'y'
          const itemDiv = document.createElement("div");
          Utils.applyStyles(itemDiv, OUTLINE_ITEM_PROPS);
          itemDiv.dataset.userMessageId = msg.id; // Store user message ID for search lookup

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = true; // Default to checked
          checkbox.className = "outline-item-checkbox"; // Add class for easy selection
          checkbox.dataset.messageId = msg.id; // Store message ID on checkbox
          Utils.applyStyles(checkbox, OUTLINE_CHECKBOX_PROPS);
          checkbox.onchange = (e) => {
            // Update master checkbox state based on individual checkboxes
            const allVisibleCheckboxes = Array.from(
              outlineContainer.querySelectorAll(
                ".outline-item-checkbox:not([style*='display: none'])"
              )
            );
            const allVisibleChecked = allVisibleCheckboxes.every(
              (cb) => cb.checked
            );
            masterCheckbox.checked = allVisibleChecked;
            updateSelectedCountDisplay(); // Update count on individual checkbox change
          };
          itemDiv.appendChild(checkbox);

          const itemText = document.createElement("span");
          itemText.textContent = `${userQuestionCount}: ${Utils.truncate(
            msg.contentText,
            40
          )}`; // Truncate to 40
          itemText.style.cursor = "pointer"; // Set cursor to hand
          itemText.style.textDecoration = "none"; // Remove underline
          itemText.title = `${userQuestionCount}: ${Utils.truncate(
            msg.contentText.replace(/\n+/g, "\n"),
            140
          )}`; // Truncate to 140 // Add tooltip

          // Add hover effect
          itemText.onmouseover = () => {
            itemText.style.backgroundColor = "#f0f0f0"; // Light gray background on hover
            itemText.style.color = "#5b3f87"; // Change text color on hover
          };
          itemText.onmouseout = () => {
            itemText.style.backgroundColor = "transparent"; // Revert background on mouse out
            itemText.style.color = "#333"; // Revert text color on mouse out (assuming default is #333, adjust if needed)
          };

          itemText.onclick = () => {
            // Find the original message element using the stored contentHtml reference
            const messageElement = ChatExporter._currentChatData.messages.find(
              (m) => m.id === msg.id
            )?.contentHtml;
            // console.log("clicked on message", msg.id, messageElement);
            if (messageElement) {
              messageElement.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }
          };
          itemDiv.appendChild(itemText);

          messageListDiv.appendChild(itemDiv);
          outlineItemElements.set(msg.id, itemDiv);

          // Add to selected IDs by default (will be refreshed on export anyway)
          ChatExporter._selectedMessageIds.add(msg.id);
        } else {
          // For AI responses, if they follow a selected user message, also add them to selected IDs
          // This is a pre-population, actual selection is determined on export.
          const prevUserMessage = ChatExporter._currentChatData.messages.find(
            (m, i) =>
              i < ChatExporter._currentChatData.messages.indexOf(msg) &&
              m.author === "user"
          );
          if (
            prevUserMessage &&
            ChatExporter._selectedMessageIds.has(prevUserMessage.id)
          ) {
            ChatExporter._selectedMessageIds.add(msg.id);
          }
        }
      });

      // Now set the master checkbox onchange after userQuestionCount is final
      masterCheckbox.onchange = (e) => {
        const isChecked = e.target.checked;
        // Only toggle visible checkboxes
        const visibleCheckboxes = outlineContainer.querySelectorAll(
          ".outline-item-checkbox:not([style*='display: none'])"
        );
        visibleCheckboxes.forEach((cb) => {
          cb.checked = isChecked;
        });
        updateSelectedCountDisplay(); // Update count on master checkbox change
      };

      outlineContainer.appendChild(messageListDiv);

      // Initial call to set the display text once all checkboxes are rendered and userQuestionCount is final
      // This call is now placed AFTER messageListDiv (containing all checkboxes) is appended to outlineContainer.
      updateSelectedCountDisplay();

      // --- Search Bar Logic ---
      searchInput.oninput = () => {
        const searchText = searchInput.value.trim(); // Get the raw input text
        let anyMatchFound = false;
        let searchRegex;
        let regexError = false;

        // Reset previous error message and style
        noMatchMessage.textContent = "Your search text didn't match any items";
        noMatchMessage.style.color = "#7e7e7e"; // Default color

        if (searchText === "") {
          // If search text is empty, no regex is needed, all items will be shown
        } else {
          try {
            // Create a RegExp object from the search input.
            // The 'i' flag is added by default for case-insensitive search.
            // Users can still specify other flags (e.g., /pattern/gi) directly in the input.
            searchRegex = new RegExp(searchText, "i");
          } catch (e) {
            regexError = true;
            // Display an error message for invalid regex
            noMatchMessage.textContent = `Invalid regex: ${e.message}`;
            noMatchMessage.style.color = "red"; // Make error message red
            noMatchMessage.style.display = "block";
            messageListDiv.style.display = "none";

            // Hide all outline items if there's a regex error
            outlineItemElements.forEach((itemDiv) => {
              itemDiv.style.display = "none";
            });
            masterCheckbox.checked = false; // No valid visible items
            updateSelectedCountDisplay(); // Update the count display
            return; // Exit the function early if regex is invalid
          }
        }

        const messages = ChatExporter._currentChatData.messages;
        const userMessageMap = new Map();

        // Group user messages with their immediate AI responses
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          if (msg.author === "user") {
            const userMsg = msg;
            let aiMsg = null;
            if (i + 1 < messages.length && messages[i + 1].author === "ai") {
              aiMsg = messages[i + 1];
            }
            userMessageMap.set(userMsg.id, { user: userMsg, ai: aiMsg });
          }
        }

        outlineItemElements.forEach((itemDiv, userMsgId) => {
          const userAiPair = userMessageMap.get(userMsgId);
          let match = false;

          if (userAiPair) {
            const userContent = userAiPair.user.contentText;
            const aiContent = userAiPair.ai ? userAiPair.ai.contentText : "";

            if (searchText === "") {
              match = true; // If search box is empty, consider it a match (show all)
            } else if (searchRegex) {
              // Use regex.test() for matching against content
              if (
                searchRegex.test(userContent) ||
                searchRegex.test(aiContent)
              ) {
                match = true;
              }
            }
          }

          if (match) {
            itemDiv.style.display = "flex";
            anyMatchFound = true;
          } else {
            itemDiv.style.display = "none";
          }
        });

        // Show/hide no match message and adjust message list visibility
        if (searchText !== "" && !anyMatchFound && !regexError) {
          noMatchMessage.style.display = "block";
          messageListDiv.style.display = "none";
        } else if (searchText === "" || anyMatchFound) {
          noMatchMessage.style.display = "none";
          if (!UIManager._outlineIsCollapsed) {
            // Only show message list if outline is expanded
            // Keep this as a fallback if messageListDiv display is not primarily controlled by flexGrow
            messageListDiv.style.display = "block";
          }
        }

        // After filtering, update master checkbox and count display based on visible items
        const visibleCheckboxes = outlineContainer.querySelectorAll(
          ".outline-item-checkbox:not([style*='display: none'])"
        );
        const allVisibleChecked =
          visibleCheckboxes.length > 0 &&
          Array.from(visibleCheckboxes).every((cb) => cb.checked);
        masterCheckbox.checked = allVisibleChecked;
        updateSelectedCountDisplay();
      };
      // --- End Search Bar Logic ---

      // Ensure visibility based on collapse state
      if (UIManager._outlineIsCollapsed) {
        titleDiv.style.display = "none";
        selectAllContainer.style.display = "none";
        searchInput.style.display = "none";
        noMatchMessage.style.display = "none";
        hr.style.display = "none";
        messageListDiv.style.display = "none";
      } else {
        titleDiv.style.display = "flex";
        selectAllContainer.style.display = "flex";
        searchInput.style.display = "block";
        // noMatchMessage and messageListDiv display will be handled by searchInput.oninput
        hr.style.display = "block";
      }
    },

    /**
     * Toggles the collapse state of the outline div.
     */
    toggleOutlineCollapse() {
      UIManager._outlineIsCollapsed = !UIManager._outlineIsCollapsed;
      // New: Save the new state to localStorage
      localStorage.setItem(
        OUTLINE_COLLAPSED_STATE_KEY,
        UIManager._outlineIsCollapsed.toString()
      );

      const outlineContainer = document.querySelector(
        `#${OUTLINE_CONTAINER_ID}`
      );
      const titleDiv = document.querySelector(`#${OUTLINE_TITLE_ID}`);
      const selectAllContainer = document.querySelector(
        "#outline-select-all-container"
      );
      const searchInput = document.querySelector("#outline-search-input");
      const noMatchMessage = document.querySelector(
        "#outline-no-match-message"
      );
      const hr = outlineContainer.querySelector("hr");
      const messageListDiv = document.querySelector("#outline-message-list");
      const toggleButton = document.querySelector("#outline-toggle-btn");

      if (UIManager._outlineIsCollapsed) {
        Utils.applyStyles(outlineContainer, {
          ...OUTLINE_CONTAINER_PROPS,
          ...OUTLINE_CONTAINER_COLLAPSED_PROPS,
        });
        if (titleDiv) titleDiv.style.display = "none";
        if (selectAllContainer) selectAllContainer.style.display = "none";
        if (searchInput) searchInput.style.display = "none";
        if (noMatchMessage) noMatchMessage.style.display = "none";
        if (hr) hr.style.display = "none";
        if (messageListDiv) messageListDiv.style.display = "none";
        if (toggleButton) toggleButton.textContent = "▲";
      } else {
        Utils.applyStyles(outlineContainer, OUTLINE_CONTAINER_PROPS);
        if (titleDiv) titleDiv.style.display = "flex";
        if (selectAllContainer) selectAllContainer.style.display = "flex";
        if (searchInput) searchInput.style.display = "block";
        // noMatchMessage and messageListDiv display depend on search state, not just collapse
        if (hr) hr.style.display = "block";
        // Trigger a re-evaluation of search filter if it was active
        const currentSearchText = searchInput
          ? searchInput.value.toLowerCase().trim()
          : "";
        if (currentSearchText !== "") {
          searchInput.dispatchEvent(new Event("input")); // Re-run search filter
        } else {
          // If no search text, ensure all messages are visible
          if (messageListDiv) messageListDiv.style.display = "block";
          const allItems = outlineContainer.querySelectorAll(
            ".outline-item-checkbox"
          );
          allItems.forEach((cb) => {
            const parentDiv = cb.closest("div");
            if (parentDiv) parentDiv.style.display = "flex";
          });
          if (noMatchMessage) noMatchMessage.style.display = "none";
        }
        if (toggleButton) toggleButton.textContent = "▼";
      }
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
      Utils.applyStyles(alertContainer, ALERT_PROPS);
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
      Utils.applyStyles(messageRow, ALERT_MESSAGE_ROW_PROPS);

      const messageSpan = document.createElement("span");
      messageSpan.textContent = message;
      messageRow.appendChild(messageSpan);

      const closeButton = document.createElement("button");
      closeButton.textContent = "×";
      Utils.applyStyles(closeButton, ALERT_CLOSE_BUTTON_PROPS);
      messageRow.appendChild(closeButton);
      alertContainer.appendChild(messageRow);

      // Checkbox for "never show again"
      const checkboxContainer = document.createElement("div");
      Utils.applyStyles(checkboxContainer, ALERT_CHECKBOX_CONTAINER_PROPS);

      const hideCheckbox = document.createElement("input");
      hideCheckbox.type = "checkbox";
      hideCheckbox.id = "hide-exporter-alert";
      Utils.applyStyles(hideCheckbox, ALERT_CHECKBOX_PROPS);
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
     * Attempts to auto-scroll the Gemini chat to the top to load all messages.
     * This function uses an iterative approach to handle dynamic loading.
     */
    autoScrollToTop: async function () {
      if (CURRENT_PLATFORM !== GEMINI) {
        // console.log("autoScrollToTop: Not on a Gemini hostname. Returning early.");
        return;
      }

      // Track the current URL to avoid re-scrolling the same chat repeatedly
      const currentUrl = window.location.href;

      // New: Check if we have already effectively started auto-scrolling for this URL.
      // UIManager._lastProcessedChatUrl will be null initially, or explicitly reset by handleUrlChange for new URLs.
      // It will be set to currentUrl *after* the initial message element is found.
      if (UIManager._lastProcessedChatUrl === currentUrl) {
        console.log(
          "Auto-scroll already initiated or completed for this URL. Skipping."
        );
        return;
      }

      // console.log(`Auto-scroll triggered for new URL: ${currentUrl}`);

      let scrollableElement =
        document.querySelector('[data-test-id="chat-history-container"]') || // **PRIMARY TARGET (CONFIRMED BY LOGS)**
        document.querySelector("#chat-history") || // Fallback to chat history div by ID
        document.querySelector("main") || // Fallback to main element
        document.documentElement; // Final fallback to the document's root element

      if (!scrollableElement) {
        // UIManager.showAlert(
        //   "Error: Could not find chat scroll area. Auto-scroll failed."
        // );
        return;
      }

      // UIManager.showAlert(
      //   "Auto-scrolling to load entire chat... Please wait."
      // );

      const AUTOSCROLL_MAT_PROGRESS_BAR_POLL_INTERVAL = 50;
      const AUTOSCROLL_MAT_PROGRESS_BAR_APPEAR_TIMEOUT = 3000;
      const AUTOSCROLL_MAT_PROGRESS_BAR_DISAPPEAR_TIMEOUT = 5000;
      const AUTOSCROLL_REPEAT_DELAY = 500;
      const AUTOSCROLL_MAX_RETRY = 3;
      const MESSAGE_ELEMENT_APPEAR_TIMEOUT = 5000;

      let previousMessageCount = -1;
      let retriesForProgressBar = 0;

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const waitForElementToAppear = async (
        selector,
        timeoutMs,
        checkInterval = AUTOSCROLL_MAT_PROGRESS_BAR_POLL_INTERVAL
      ) => {
        const startTime = Date.now();
        return new Promise((resolve) => {
          const interval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
              clearInterval(interval);
              resolve(element);
            } else if (Date.now() - startTime > timeoutMs) {
              clearInterval(interval);
              resolve(null);
            }
          }, checkInterval);
        });
      };

      const waitForElementToDisappear = async (
        selector,
        timeoutMs,
        checkInterval = AUTOSCROLL_MAT_PROGRESS_BAR_POLL_INTERVAL
      ) => {
        const startTime = Date.now();
        return new Promise((resolve) => {
          const interval = setInterval(() => {
            const element = document.querySelector(selector);
            if (
              !element ||
              (element.offsetWidth === 0 && element.offsetHeight === 0)
            ) {
              clearInterval(interval);
              resolve(true);
            } else if (Date.now() - startTime > timeoutMs) {
              clearInterval(interval);
              console.warn(
                `waitForElementToDisappear: Timeout waiting for '${selector}' to disappear.`
              );
              resolve(false);
            }
          }, checkInterval);
        });
      };

      // --- Wait for initial chat messages to appear ---
      // This is crucial for new chat loads from sidebar clicks.
      // console.log("Waiting for initial chat message elements...");
      const initialMessageElement = await waitForElementToAppear(
        GEMINI_MESSAGE_ITEM_SELECTOR,
        MESSAGE_ELEMENT_APPEAR_TIMEOUT
      );

      if (!initialMessageElement) {
        // UIManager.showAlert(
        //   "Timeout waiting for chat messages to appear. Auto-scroll cannot proceed."
        // );
        console.error(
          "Initial chat message elements did not appear within timeout."
        );
        // If initial messages don't appear, this URL was not successfully processed for auto-scroll.
        // So, reset _lastProcessedChatUrl to null to allow a retry or a different trigger for this URL.
        UIManager._lastProcessedChatUrl = null; // Add this line
        return;
      }
      // console.log("Initial chat message elements found. Starting scroll loop.");

      // Mark this URL as processed *only after* initial messages are found.
      // This ensures that autoScrollToTop will proceed if called for a new URL,
      // and will block subsequent calls for the *same* URL until _lastProcessedChatUrl is reset by handleUrlChange.
      UIManager._lastProcessedChatUrl = currentUrl; // Move this line from the beginning to here.

      // --- IMPORTANT: Attach URL change listeners here after initial chat message elements appears ---
      if (!UIManager._initialListenersAttached) {
        // Only attach them once
        UIManager.initUrlChangeObserver();
        UIManager._initialListenersAttached = true; // Mark that they are attached
      }

      while (true) {
        scrollableElement.scrollTop = 0;
        await delay(50); // Small delay after scroll

        // console.log("Scrolling to top, checking for progress bar...");
        const progressBarElement = await waitForElementToAppear(
          "mat-progress-bar.mdc-linear-progress--indeterminate",
          AUTOSCROLL_MAT_PROGRESS_BAR_APPEAR_TIMEOUT
        );

        if (progressBarElement) {
          retriesForProgressBar = 0; // Reset retries if progress bar appeared
          // console.log("Progress bar appeared. Waiting for it to disappear...");
          const disappeared = await waitForElementToDisappear(
            "mat-progress-bar.mdc-linear-progress--indeterminate",
            AUTOSCROLL_MAT_PROGRESS_BAR_DISAPPEAR_TIMEOUT
          );
          if (!disappeared) {
            console.warn(
              "autoScrollToTop: mat-progress-bar did not disappear within expected time."
            );
          }
        } else {
          // If progress bar doesn't appear, increment retry count
          retriesForProgressBar++;

          if (retriesForProgressBar > AUTOSCROLL_MAX_RETRY) {
            break;
          }
          await delay(AUTOSCROLL_REPEAT_DELAY);
          continue; // Continue loop to try scrolling again
        }

        const currentChatData = ChatExporter.extractGeminiChatData(document);
        const currentMessageCount = currentChatData
          ? currentChatData.messages.length
          : 0;

        if (currentMessageCount > previousMessageCount) {
          previousMessageCount = currentMessageCount;
          retriesForProgressBar = 0; // Reset retries if new messages found
        } else {
          // No new messages detected after a scroll attempt (and progress bar check)
          // If we had messages before, and now no new ones, it means we reached the top.
          // console.log("autoScrollToTop: No NEW messages detected after this load cycle. Checking for termination conditions.");
          if (previousMessageCount !== -1) {
            // console.log("autoScrollToTop: Assuming end of chat due to no new messages after loading.");
            break;
          }
        }

        await delay(AUTOSCROLL_REPEAT_DELAY);
      }

      // console.log("autoScrollToTop: Auto-scroll process complete. Final message count:", previousMessageCount);
      // UIManager.showAlert(
      //   "Auto-scroll complete. You can now export your chat."
      // );
      UIManager.addOutlineControls();
    },

    /**
     * Handles URL changes to trigger auto-scroll for new Gemini chats.
     * This will only be attached AFTER the initial page load auto-scroll finishes.
     */
    handleUrlChange: function () {
      const newUrl = window.location.href;
      // console.log(
      //   "URL Change Detected (popstate or customHistoryChange):",
      //   newUrl
      // );

      const isGeminiChatUrl =
        GEMINI_HOSTNAMES.some((host) => newUrl.includes(host)) &&
        newUrl.includes("/app");

      if (isGeminiChatUrl) {
        // Trigger auto-scroll for valid Gemini chat URLs.
        setTimeout(() => {
          UIManager.autoScrollToTop();
        }, 100); // Small delay to allow DOM to update before triggering
      } else {
        console.log(
          "URL is not a Gemini chat URL. Skipping auto-scroll for:",
          newUrl
        );
      }
    },

    /**
     * Initializes a MutationObserver to ensure the controls are always present
     * and to regenerate the outline on DOM changes.
     */
    initObserver() {
      const observer = new MutationObserver((mutations) => {
        // Only re-add export controls if they are missing
        if (!document.querySelector(`#${EXPORT_CONTAINER_ID}`)) {
          UIManager.addExportControls();
        }
        // Always ensure outline controls are present and regenerate content on changes
        // This covers new messages, and for Gemini, scrolling up to load more content.
        UIManager.addOutlineControls();
      });

      // Selector that includes chat messages and where new messages are added
      let targetNode = null;
      switch (CURRENT_PLATFORM) {
        case COPILOT:
          targetNode =
            document.querySelector('[data-content="conversation"]') ||
            document.body;
          break;
        case GEMINI:
          targetNode = document.querySelector("#__next") || document.body;
          break;
        default:
          targetNode = document.querySelector("main") || document.body;
      }

      observer.observe(targetNode, {
        childList: true,
        subtree: true,
        attributes: false,
      });

      // Additionally, for Gemini, listen for scroll events on the window or a specific scrollable div
      // if MutationObserver isn't sufficient for detecting all content loads.
      if (CURRENT_PLATFORM === GEMINI) {
        let scrollTimeout;
        window.addEventListener(
          "scroll",
          () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
              // Only regenerate if title or tags are different or current data count is less than actual count (implies more loaded)
              const newChatData = ChatExporter.extractGeminiChatData(document);
              if (
                newChatData &&
                ChatExporter._currentChatData &&
                (newChatData._raw_title !==
                  ChatExporter._currentChatData._raw_title ||
                  newChatData.messages.length >
                    ChatExporter._currentChatData.messages.length)
              ) {
                UIManager.addOutlineControls(); // Regenerate outline
              }
            }, 500); // Debounce scroll events
          },
          true
        ); // Use capture phase to ensure it works
      }
    },

    /**
     * Sets up the event listeners for URL changes (popstate and customHistoryChange).
     * This function will be called *after* the initial page load auto-scroll.
     */
    initUrlChangeObserver: function () {
      // console.log("Attaching URL change listeners.");
      window.addEventListener("popstate", UIManager.handleUrlChange);

      // Overwrite history.pushState and history.replaceState to dispatch custom event
      (function (history) {
        const pushState = history.pushState;
        history.pushState = function (state) {
          if (typeof history.onpushstate == "function") {
            history.onpushstate({ state: state });
          }
          const customEvent = new Event("customHistoryChange");
          window.dispatchEvent(customEvent);
          return pushState.apply(history, arguments);
        };

        const replaceState = history.replaceState;
        history.replaceState = function (state) {
          if (typeof history.onreplacestate == "function") {
            history.onreplacestate({ state: state });
          }
          const customEvent = new Event("customHistoryChange");
          window.dispatchEvent(customEvent);
          return replaceState.apply(history, arguments);
        };
      })(window.history);

      window.addEventListener("customHistoryChange", UIManager.handleUrlChange);
    },

    /**
     * Initializes the UI components by adding controls and setting up the observer.
     */
    init() {
      // New: Read collapsed state from localStorage on init
      const storedCollapsedState = localStorage.getItem(
        OUTLINE_COLLAPSED_STATE_KEY
      );
      UIManager._outlineIsCollapsed = storedCollapsedState === "true";

      // Add controls after DOM is ready
      if (
        document.readyState === "complete" ||
        document.readyState === "interactive"
      ) {
        // console.log("DOM is ready (complete or interactive). Setting timeout for UI controls.");
        setTimeout(() => {
          // console.log("Timeout elapsed. Adding export and outline controls.");
          UIManager.addExportControls();
          UIManager.addOutlineControls(); // Add outline after buttons
          // New: Initiate auto-scroll for Gemini after controls are set up
          // console.log("Checking if current host is a Gemini hostname...");
          if (CURRENT_PLATFORM === GEMINI) {
            setTimeout(() => {
              // console.log("Delayed auto-scroll initiated."); // Debug log
              UIManager.autoScrollToTop(); // This call will now use the async logic below
            }, AUTOSCROLL_INITIAL_DELAY);
          }
        }, DOM_READY_TIMEOUT); // DOM_READY_TIMEOUT is assumed to be defined elsewhere, e.g., 1000ms
      } else {
        // console.log("DOM not yet ready. Adding DOMContentLoaded listener.");
        window.addEventListener("DOMContentLoaded", () =>
          setTimeout(() => {
            // console.log("DOMContentLoaded event fired. Adding export and outline controls after timeout.");
            UIManager.addExportControls();
            UIManager.addOutlineControls(); // Add outline after buttons
            // New: Initiate auto-scroll for Gemini after controls are set up
            // console.log("Checking if current host is a Gemini hostname (from DOMContentLoaded).");
            if (CURRENT_PLATFORM === GEMINI) {
              setTimeout(() => {
                // console.log("Delayed auto-scroll initiated (from DOMContentLoaded)."); // Debug log
                UIManager.autoScrollToTop(); // This call will now use the async logic below
              }, AUTOSCROLL_INITIAL_DELAY);
            }
          }, DOM_READY_TIMEOUT)
        );
      }

      UIManager.initObserver();

      // To have a uniform look regardless if light or dark theme is used
      injectThemeOverrideStyles();
    },
  };

  // --- Script Initialization ---
  UIManager.init();
})();
