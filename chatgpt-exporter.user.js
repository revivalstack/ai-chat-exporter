// ==UserScript==
// @name         ChatGPT Exporter by RevivalStack
// @namespace    https://github.com/revivalstack/chatgpt-exporter
// @version      1.0.0
// @description  Export your ChatGPT conversation into a properly and elegently formatted Markdown, with TOC, YAML headers, back to top links and more.
// @author       Mic Mejia
// @homepage     https://github.com/micmejia
// @license      MIT License
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";
  const version = "1.0.0";

  // Inline Turndown (v7.1.2) for CSP-safe markdown conversion
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
      this.addRule("customLi", {
        filter: "li",
        replacement: function (content, node) {
          if (node.parentNode.nodeName === "UL") {
            let indent = "";
            let liAncestorCount = 0;
            let parent = node.parentNode;

            // Traverse up the DOM tree to count <li> ancestors
            while (parent) {
              if (parent.nodeName === "LI") {
                liAncestorCount++;
              }
              parent = parent.parentNode;
            }

            // Generate the indentation string
            for (let i = 0; i < liAncestorCount; i++) {
              indent += "    "; // Add 4 spaces for each <li> ancestor
            }
            return indent + "- " + content.trim();
          } else if (node.parentNode.nodeName === "OL") {
            let siblings = Array.from(node.parentNode.children).filter(
              (child) => child.nodeName === "LI"
            );
            let index = siblings.indexOf(node);
            return `\n${index + 1}. ${content.trim()}`;
          }
          return content; // Fallback for other cases
        },
      });
      this.addRule("code", {
        filter: "code",
        replacement: (content, node) => {
          if (node.parentNode.nodeName === "PRE") return content;
          return `\`${content}\``;
        },
      });
      this.addRule("pre", {
        filter: "pre",
        replacement: (content, node) => {
          const match = /^(\w+)CopyEdit([\s\S]+)/.exec(node.textContent);
          return match
            ? `\n\n\`\`\`${match[1]}\n${match[2]}\n\`\`\`\n\n`
            : `\n\n\`\`\`\n${node.textContent}\n\`\`\`\n\n`;
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
      //   // Handle task lists (checkboxes)
      //   this.addRule('task-list', {
      //     filter: function(node) {
      //       return node.nodeName === 'UL' && node.querySelector('li input[type="checkbox"]');
      //     },
      //     replacement: function(content, node) {
      //       const taskItems = node.querySelectorAll('li');
      //       return taskItems.map(function(item) {
      //         const checkbox = item.querySelector('input[type="checkbox"]');
      //         const checked = checkbox && checkbox.checked ? 'x' : ' ';
      //         const text = item.textContent.trim();
      //         return `- [${checked}] ${text}`;
      //       }).join('\n');
      //     }
      //   });

      // Handle strikethrough (~~text~~)
      this.addRule("strikethrough", {
        filter: function (node) {
          return node.nodeName === "DEL";
        },
        replacement: function (content) {
          return `~~${content}~~`;
        },
      });

      this.addRule("table", {
        // Filter for 'table' HTML elements
        filter: "table",

        /**
         * Replacement function for table nodes.
         * @param {string} content - The already markdown-converted content of the table's children (not directly used for structure).
         * @param {HTMLElement} node - The HTML <table> element being processed.
         * @returns {string} The Markdown representation of the table.
         */
        replacement: function (content, node) {
          // Select all header rows from <thead>
          const headerRows = Array.from(node.querySelectorAll("thead tr"));
          // Select all body rows from <tbody>
          const bodyRows = Array.from(node.querySelectorAll("tbody tr"));
          // Select all footer rows from <tfoot>
          const footerRows = Array.from(node.querySelectorAll("tfoot tr"));

          let allRowsContent = []; // This array will store arrays of cell contents for each row

          /**
           * Helper function to extract text content from cells within a given row element.
           * It handles both <th> and <td> cells and cleans up whitespace.
           * @param {HTMLElement} rowElement - The <tr> element to process.
           * @returns {string[]} An array of cleaned text content for each cell.
           */
          function getRowCellsContent(rowElement) {
            const cells = Array.from(rowElement.querySelectorAll("th, td"));
            // Get text content, replace multiple spaces with single, and trim leading/trailing whitespace
            return cells.map((cell) =>
              cell.textContent.replace(/\s+/g, " ").trim()
            );
          }

          // --- Step 1: Gather all row data ---

          // Process THEAD rows: Only take the first header row if it exists
          if (headerRows.length > 0) {
            allRowsContent.push(getRowCellsContent(headerRows[0]));
          }

          // Process TBODY rows
          bodyRows.forEach((row) => {
            allRowsContent.push(getRowCellsContent(row));
          });

          // Process TFOOT rows
          footerRows.forEach((row) => {
            allRowsContent.push(getRowCellsContent(row));
          });

          // If no rows were found, return an empty string
          if (allRowsContent.length === 0) {
            return "";
          }

          // --- Step 2: Determine Table Structure and Pad Cells ---

          // Determine if the first row collected is meant to be a header row (i.e., it came from a <thead>)
          const isFirstRowAHeader = headerRows.length > 0;

          // Find the maximum number of columns across all rows to ensure uniform width
          const maxCols = Math.max(...allRowsContent.map((row) => row.length));

          // Pad all rows to ensure they have the same number of columns, filling missing cells with empty strings
          const paddedRows = allRowsContent.map((row) => {
            const paddedRow = [...row];
            while (paddedRow.length < maxCols) {
              paddedRow.push(""); // Add empty strings for any cells that are missing in shorter rows
            }
            return paddedRow;
          });

          // --- Step 3: Build the Markdown Table String ---

          let markdownTable = "";

          // Case 1: The table has an explicit <thead> (or its first row is designated as a header)
          if (isFirstRowAHeader) {
            // Add the header row
            markdownTable += "| " + paddedRows[0].join(" | ") + " |\n";
            // Add the separator line
            markdownTable += "|" + Array(maxCols).fill("---").join("|") + "|\n";
            // Add the remaining rows (body and footer)
            for (let i = 1; i < paddedRows.length; i++) {
              markdownTable += "| " + paddedRows[i].join(" | ") + " |\n";
            }
          } else {
            // Case 2: No explicit <thead>, treat all rows as body rows, but still add a separator after the first row
            // This is common practice for simple Markdown tables where the first line implicitly becomes the header.
            for (let i = 0; i < paddedRows.length; i++) {
              markdownTable += "| " + paddedRows[i].join(" | ") + " |\n";
              // Add separator after the first row. If there's only one row, it acts as both header and body.
              if (i === 0) {
                markdownTable +=
                  "|" + Array(maxCols).fill("---").join("|") + "|\n";
              }
            }
          }

          // Trim any trailing newline characters to prevent extra blank lines
          return markdownTable.trim();
        },
      });
    }

    addRule(key, rule) {
      this.rules.push({ key, ...rule });
    }

    turndown(rootNode) {
      let output = "";

      function process(node) {
        if (node.nodeType === 3) return node.nodeValue;
        if (node.nodeType !== 1) return "";

        const rule = this.rules.find(
          (r) =>
            (typeof r.filter === "string" &&
              r.filter === node.nodeName.toLowerCase()) ||
            (Array.isArray(r.filter) &&
              r.filter.includes(node.nodeName.toLowerCase())) ||
            (typeof r.filter === "function" && r.filter(node))
        );

        const content = Array.from(node.childNodes)
          .map((n) => process.call(this, n))
          .join("");
        if (rule) return rule.replacement(content, node, this.options);
        return content;
      }

      output = Array.from(rootNode.childNodes)
        .map((n) => process.call(this, n))
        .join("");
      return output.trim().replace(/\n{3,}/g, "\n\n");
    }
  }

  function slugify(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
  }

  function formatLocalTime(d) {
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
  }

  function truncate(str, len = 70) {
    return str.length <= len ? str : str.slice(0, len).trim() + "…";
  }

  function escapeMd(text) {
    return text.replace(/[|\\`*_{}\[\]()#+\-!>]/g, "\\$&");
  }

  function addExportButton() {
    if (document.querySelector("#floating-export-btn")) return;

    const btn = document.createElement("button");
    btn.id = "floating-export-btn";
    btn.textContent = "⬇ Export Chat";
    btn.title = `Chatgpt Exporter v${version}`;
    btn.style = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            padding: 10px 14px;
            background-color: #5b3f86;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;

    btn.onclick = () => {
      const service = new TurndownService();
      service.addRule("popup-div", {
        filter: function (node) {
          // Check if the element is a <div> with the class 'popover'
          return node.nodeName === "DIV" && node.classList.contains("popover");
        },
        replacement: function (content) {
          // Replace <br> and other block elements with line breaks (\n)
          const textWithLineBreaks = content
            .replace(/<br\s*\/?>/gi, "\n") // Replace <br> tags with newlines
            .replace(/<\/(p|div|h[1-6]|ul|ol|li)>/gi, "\n") // Replace closing block-level tags
            .replace(/<(?:p|div|h[1-6]|ul|ol|li)[^>]*>/gi, "\n") // Replace opening block-level tags
            .replace(/<\/?[^>]+(>|$)/g, "") // Strip remaining HTML tags
            .replace(/\n+/g, "\n"); // Ensure no multiple newlines

          // Wrap the plain text content in a Markdown code block
          return "\n```\n" + textWithLineBreaks + "\n```\n";
        },
      });
      service.addRule("buttonWithSpecificClass", {
        filter: function (node) {
          return (
            node.nodeName === "BUTTON" && node.classList.contains("text-sm")
          );
        },
        replacement: function (content) {
          return content.trim() ? `__${content}__\n\n` : "";
        },
      });
      service.addRule("remove-img", {
        filter: "img",
        replacement: (content) => "",
      });
      service.addRule("paragraphWithNewlinesIfNotInListOrTableAncestor", {
        filter: "p",
        replacement: function (content, node) {
          // Check all ancestors of the <p> tag
          let currentNode = node.parentNode;
          while (currentNode) {
            if (
              currentNode.nodeName === "LI" ||
              currentNode.nodeName === "TH" ||
              currentNode.nodeName === "TR"
            ) {
              return content; // If any ancestor is <li>, <th>, or <tr>, no newlines
            }
            currentNode = currentNode.parentNode;
          }

          // If no ancestor is <li>, <th>, or <tr>, add newlines before and after
          return `\n\n${content}\n\n`;
        },
      });

      const articles = [...document.querySelectorAll("article")];
      if (articles.length === 0) {
        alert("No messages found.");
        return;
      }

      let toc = "";
      let title = document.title.replace(" - ChatGPT", "").trim() || "chat";
      let content = "";

      let chatIndex = 1;
      for (let i = 0; i < articles.length; i++) {
        let seen = new Set();
        const article = articles[i];
        const header = article.querySelector("h5")?.textContent?.trim() || "";
        const divs = article.querySelectorAll("div.text-base");
        let fullText = "";
        divs.forEach((div) => {
          const key = div.innerText.trim();
          if (!key || seen.has(key)) return;
          seen.add(key);
          fullText += key + "\n";
        });

        if (!fullText.trim()) continue;

        if (header.toLowerCase().includes("you said")) {
          const preview = truncate(fullText.trim().replace(/\s+/g, " "), 70);
          toc += `- [${chatIndex}: ${escapeMd(preview)}](#chat-${chatIndex})\n`;
          content +=
            `### chat-${chatIndex}\n\n> ` +
            fullText.trim().replace(/\n/g, "\n> ") +
            "\n\n";
        } else {
          let gptText = article ? service.turndown(article) : "";
          content += gptText + "\n\n___\n###### [top](#table-of-contents)\n";
          chatIndex++;
        }
      }

      const now = new Date();
      const localTime = formatLocalTime(now);
      const yaml = `---\nthread_name: ${title}\nmessage_count: ${
        chatIndex - 1
      }\nexporter_version: ${version}\nexported_at: ${localTime}\n---\n`;
      const tocBlock = `## Table of Contents\n\n${toc.trim()}\n\n`;
      const finalOutput =
        yaml + `\n# ${title}\n\n` + tocBlock + content.trim() + "\n\n";

      const fileName = `chatgpt_${slugify(title)}_${localTime}.md`;

      const blob = new Blob([finalOutput], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    };

    document.body.appendChild(btn);
  }

  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    setTimeout(addExportButton, 1000);
  } else {
    window.addEventListener("DOMContentLoaded", () =>
      setTimeout(addExportButton, 1000)
    );
  }

  const observer = new MutationObserver(() => {
    if (!document.querySelector("#floating-export-btn")) {
      addExportButton();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
