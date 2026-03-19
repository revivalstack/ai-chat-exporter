// ==UserScript==
// @name         AI Exporter DOM Selector Tester (v2.0)
// @namespace    https://github.com/revivalstack/ai-chat-exporter
// @version      2.0.0
// @description  Comprehensive DOM check for ChatGPT, Gemini, Claude, and Copilot.
// @author       Mic Mejia (Refactored by Google Gemini)
// @match        https://chatgpt.com/*
// @match        https://claude.ai/*
// @match        https://www.copilot.com/*
// @match        https://gemini.google.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const SELECTORS_TO_TEST = {
    chatgpt: {
      platformName: "ChatGPT",
      selectors: [
        {
          name: "Message Turn",
          selector: "[data-testid^='conversation-turn-']",
        },
        { name: "Content Wrapper", selector: ".agent-turn, .user-turn" },
        { name: "Code Block", selector: "pre" },
      ],
    },
    gemini: {
      platformName: "Gemini",
      selectors: [
        { name: "User Query", selector: "user-query" },
        { name: "Model Response", selector: "model-response" },
        { name: "Conversation Container", selector: ".conversation-container" },
      ],
    },
    claude: {
      platformName: "Claude",
      selectors: [
        { name: "Message Grid", selector: "div.grid.grid-cols-1" },
        {
          name: "User Message Selector",
          selector: '[data-testid="user-message"]',
        },
        {
          name: "User Input",
          selector: "[data-testid='user-message']",
          optional: true,
        },
      ],
    },
    copilot: {
      platformName: "Copilot",
      selectors: [
        { name: "User Message Wrapper", selector: ".group\\/user-message" },
        { name: "AI Message Wrapper", selector: ".group\\/ai-message" },
        { name: "Content Item", selector: ".group\\/ai-message-item" },
      ],
    },
  };

  const TEST_UI_ID = "exporter-test-overlay";

  function runTest() {
    const host = window.location.hostname;
    let platformKey = "";

    if (host.includes("chatgpt")) platformKey = "chatgpt";
    else if (host.includes("gemini")) platformKey = "gemini";
    else if (host.includes("claude")) platformKey = "claude";
    else if (host.includes("copilot")) platformKey = "copilot";

    if (!platformKey) {
      alert("Platform not supported for testing.");
      return;
    }

    const config = SELECTORS_TO_TEST[platformKey];
    let results = `--- TEST RESULTS: ${config.platformName} ---\n\n`;
    let allPassed = true;

    config.selectors.forEach((s) => {
      const found = document.querySelector(s.selector);
      const status = found
        ? "✅ PASSED"
        : s.optional
        ? "⚠️ MISSING (OPTIONAL)"
        : "❌ FAILED";
      if (!found && !s.optional) allPassed = false;
      results += `${status}: ${s.name} ('${s.selector}')\n`;
    });

    console.log(results);
    alert(
      results +
        (allPassed
          ? "\n\nSelectors are stable."
          : "\n\nWarning: Crucial DOM elements missing!")
    );
  }

  // Add a simple floating button to trigger the test manually
  function injectTestButton() {
    if (document.getElementById(TEST_UI_ID)) return;
    const btn = document.createElement("button");
    btn.id = TEST_UI_ID;
    btn.innerText = "🔍 TEST DOM";
    btn.style =
      "position:fixed; bottom:80px; right:20px; z-index:9999; padding:10px; background:#ff4757; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);";
    btn.onclick = runTest;
    document.body.appendChild(btn);
  }

  // Wait for page load
  setTimeout(injectTestButton, 2000);
})();
