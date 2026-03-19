// ==UserScript==
// @name         Set Gemini Chat Title Prefix
// @namespace    https://github.com/revivalstack/chatgpt-exporter
// @version      1.0.0
// @description  Adds a customizable prefix to Gemini chat titles, by default, a checkmark.
// @author       Mic Mejia (Refactored by Google Gemini)
// @match        https://gemini.google.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @noframes
// ==/UserScript==

(function () {
  "use strict";

  const DEFAULT_CHAT_TITLE_PREFIX = "✓ ";
  const GM_CONTROLS_CHAT_TITLE_PREFIX = "aiChatExporter_chatTitlePrefix";
  const SIDEBAR_SELECTOR =
    'a[data-test-id="conversation"].selected .conversation-title';
  const TOPBAR_SELECTOR = "conversation-actions .conversation-title";

  GM_registerMenuCommand("Set Title Prefix", () => {
    const currentPrefix = GM_getValue(
      GM_CONTROLS_CHAT_TITLE_PREFIX,
      DEFAULT_CHAT_TITLE_PREFIX
    );
    const newPrefix = prompt(
      "Enter the prefix you want to use:",
      currentPrefix
    );
    if (newPrefix !== null) {
      GM_setValue(GM_CONTROLS_CHAT_TITLE_PREFIX, newPrefix);
    }
  });

  async function applyPrefixToActiveChat() {
    const prefix = GM_getValue(
      GM_CONTROLS_CHAT_TITLE_PREFIX,
      DEFAULT_CHAT_TITLE_PREFIX
    );
    const trimmedPrefix = prefix.trim();

    // 1. Check UI for existing prefix using your provided selectors
    const sidebarTitle = document.querySelector(SIDEBAR_SELECTOR);
    const topbarTitle = document.querySelector(TOPBAR_SELECTOR);

    // If either UI element already shows the prefix, we stop immediately.
    if (
      (sidebarTitle &&
        sidebarTitle.textContent.trim().startsWith(trimmedPrefix)) ||
      (topbarTitle && topbarTitle.textContent.trim().startsWith(trimmedPrefix))
    ) {
      return;
    }

    // 2. Locate the active chat container to find the menu button
    const activeChatLink = document.querySelector(
      'a[data-test-id="conversation"].selected'
    );
    if (!activeChatLink) return;

    const container =
      activeChatLink.closest(".conversation-actions-container") ||
      activeChatLink.parentElement;
    const menuButton = container.querySelector(
      '[data-test-id="actions-menu-button"]'
    );
    if (!menuButton) return;

    // 3. Perform the rename
    menuButton.click();

    await new Promise((r) => setTimeout(r, 400));
    const renameButton = document.querySelector(
      '[data-test-id="rename-button"]'
    );
    if (!renameButton) return;
    renameButton.click();

    await new Promise((r) => setTimeout(r, 600));
    const input = document.querySelector('[data-test-id="edit-title-input"]');
    const saveButton = document.querySelector('[data-test-id="save-button"]');

    if (input && saveButton) {
      // Final safety check inside the actual input field
      if (!input.value.trim().startsWith(trimmedPrefix)) {
        input.value = prefix + input.value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));

        setTimeout(() => {
          if (!saveButton.disabled) saveButton.click();
        }, 200);
      } else {
        const cancelButton = document.querySelector("button[mat-dialog-close]");
        if (cancelButton) cancelButton.click();
      }
    }
  }

  // Handle URL changes when clicking through the sidebar
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (location.href.includes("/app/")) {
        // Wait for Gemini to update the active classes
        setTimeout(applyPrefixToActiveChat, 1200);
      }
    }
  });

  observer.observe(document.body, { subtree: true, childList: true });

  // Initial run
  if (location.href.includes("/app/")) {
    setTimeout(applyPrefixToActiveChat, 2000);
  }
})();
