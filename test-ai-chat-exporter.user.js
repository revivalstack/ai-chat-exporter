// ==UserScript==
// @name         AI Exporter DOM Selector Tester
// @namespace    https://github.com/revivalstack/ai-chat-exporter
// @version      1.0.17
// @description  Checks if key DOM selectors used by AI Chat Exporter are still valid on ChatGPT and Google Gemini. Triggered by a manual button click.
// @author       ChatGPT / Google Gemini (via User)
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @match        https://gemini.google.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // --- Constants for Selectors to Test ---
  const SELECTORS_TO_TEST = {
    chatgpt: {
      platformName: "ChatGPT",
      selectors: [
        { name: "Main Message Article", selector: "article" },
        { name: "Text Base Div", selector: "div.text-base" },
        { name: "Message Header (h5)", selector: "h5" },
        {
          name: "Code Block Language Span",
          selector: ".flex.items-center.text-token-text-secondary",
          optional: true,
        },
        {
          name: "Popup Div Class (Turndown)",
          selector: ".popover",
          optional: true,
        },
        {
          name: "Button Specific Class (Turndown)",
          selector: ".text-sm",
          optional: true,
        },
        {
          name: "Exporter Button Container (Meta-Check)",
          selector: "#export-controls-container",
          optional: true,
        },
        {
          name: "ChatGPT Input Area 1 (getTargetContentWidth)",
          selector:
            "form > div.relative.flex.h-full.max-w-full.flex-1.flex-col",
          optional: true,
        },
        {
          name: "ChatGPT Input Area 2 (getTargetContentWidth fallback)",
          selector:
            "div.w-full.md\\:max-w-2xl.lg\\:max-w-3xl.xl\\:max-w-4xl.flex-shrink-0.px-4",
          optional: true,
        },
      ],
    },
    gemini: {
      platformName: "Google Gemini",
      selectors: [
        { name: "User Query Item", selector: "user-query" },
        { name: "Model Response Item", selector: "model-response" },
        { name: "Message Content Wrapper (AI)", selector: "message-content" },
        {
          name: "Sidebar Active Chat Title",
          selector:
            'div[data-test-id="conversation"].selected .conversation-title',
        },
        {
          name: "User Query Content Class (query-content)",
          selector: ".query-content",
        },
        {
          name: "Code Block Parent (.code-block)",
          selector: ".code-block",
          optional: true,
        },
        {
          name: "Code Block Language Span (.code-block-decoration span)",
          selector: ".code-block-decoration span",
          optional: true,
        },
        {
          name: "Gemini Input Area 1 (getTargetContentWidth)",
          selector: "gb-chat-input-textarea-container",
          optional: true,
        },
        {
          name: "Gemini Input Area 2 (getTargetContentWidth fallback)",
          selector: "div.flex.flex-col.w-full.relative.max-w-3xl.m-auto",
          optional: true,
        },
        {
          name: "Exporter Button Container (Meta-Check)",
          selector: "#export-controls-container",
          optional: true,
        },
        {
          name: "Exporter Alert Container (Scroll Warning)",
          selector: "#exporter-alert-container",
          optional: true,
        },
      ],
    },
  };

  // --- UI for Test Results ---
  const TEST_UI_ID = "ai-exporter-test-status";
  const RUN_BUTTON_ID = "ai-exporter-run-test-button";
  const TEST_DETAILS_LIST_ID = "ai-exporter-test-details-list"; // New ID for the detailed list container
  const UI_STYLES = `
          #${TEST_UI_ID} {
            position: fixed;
            top: 200px; /* Changed from bottom */
            right: 20px; /* Changed from left */
            z-index: 99999;
            padding: 8px 12px;
            border-radius: 8px;
            font-family: sans-serif;
            font-size: 13px;
            color: white;
            background-color: #5b3f86; /* Set main background to requested color */
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
            opacity: 1;
            transition: opacity 0.5s ease-in-out;
            max-height: 90vh; /* Allow it to grow, but not cover the whole screen */
            overflow-y: auto; /* Add scroll for many tests */
          }
          #${TEST_UI_ID}.status-ok { background-color: #4CAF50; } /* Green */
          #${TEST_UI_ID}.status-warning { background-color: #FFC107; } /* Orange */
          #${TEST_UI_ID}.status-error { background-color: #F44336; } /* Red */
          #${TEST_UI_ID}.status-info { background-color: #5b3f86; } /* Keep info color same as default background */
          #${TEST_UI_ID} .spinner {
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid #fff;
            border-radius: 50%;
            width: 14px;
            height: 14px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          #${RUN_BUTTON_ID} {
            background-color: #000000; /* Black background */
            color: white; /* White text */
            font-weight: bold; /* Bold font */
            border: none;
            padding: 6px 10px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            margin-top: 5px;
            align-self: center;
          }
          #${RUN_BUTTON_ID}:hover {
            background-color: #333333; /* Dark gray on hover */
          }
          #${TEST_UI_ID} .node-count {
            font-size: 11px;
            opacity: 0.8;
            margin-top: -5px;
          }
          #${TEST_UI_ID} .platform-name {
            font-weight: bold;
            margin-bottom: -5px;
          }
          #${TEST_DETAILS_LIST_ID} { /* New styles for the detailed list */
            list-style: none;
            padding: 0;
            margin: 10px 0 0;
            width: 100%; /* Ensure it takes full width of the container */
          }
          #${TEST_DETAILS_LIST_ID} li {
            margin-bottom: 3px;
            display: flex;
            align-items: center;
            gap: 5px;
          }
          #${TEST_DETAILS_LIST_ID} .status-icon {
            font-weight: bold;
            font-size: 1.1em;
            line-height: 1;
            width: 15px; /* Fixed width for alignment */
            text-align: center;
          }
          #${TEST_DETAILS_LIST_ID} .status-icon.pass {
            color: #8BC34A; /* Light green */
          }
          #${TEST_DETAILS_LIST_ID} .status-icon.fail {
            color: #FF5722; /* Orange-red */
          }
        `;

  let currentPlatform = null;
  let testResults = {};
  let statusUI = null;
  let testAttempts = 0;
  const MAX_TEST_ATTEMPTS = 5;
  const RETRY_INTERVAL_MS = 1500;
  let observer = null;

  // --- Helper Functions ---

  function getPlatform() {
    if (
      window.location.host.includes("openai.com") ||
      window.location.host.includes("chatgpt.com")
    ) {
      return "chatgpt";
    } else if (window.location.host.includes("gemini.google.com")) {
      return "gemini";
    }
    return null;
  }

  function createStatusUI() {
    const existingUI = document.getElementById(TEST_UI_ID);
    if (existingUI) {
      statusUI = existingUI;
      return;
    }

    const style = document.createElement("style");
    style.textContent = UI_STYLES;
    document.head.appendChild(style);

    statusUI = document.createElement("div");
    statusUI.id = TEST_UI_ID;
    document.body.appendChild(statusUI);

    const platformNameSpan = document.createElement("div");
    platformNameSpan.className = "platform-name";
    statusUI.appendChild(platformNameSpan);

    const messageSpan = document.createElement("span");
    statusUI.appendChild(messageSpan);

    const nodeCountSpan = document.createElement("div");
    nodeCountSpan.className = "node-count";
    statusUI.appendChild(nodeCountSpan);

    // New: Container for the detailed list of test results
    const detailsListContainer = document.createElement("ul");
    detailsListContainer.id = TEST_DETAILS_LIST_ID;
    statusUI.appendChild(detailsListContainer);

    const runButton = document.createElement("button");
    runButton.id = RUN_BUTTON_ID;
    runButton.textContent = "Run Tests";
    runButton.onclick = () => {
      testAttempts = 0;
      const platformConfig = SELECTORS_TO_TEST[getPlatform()];

      updateStatusUI(
        "Running tests...",
        "info",
        true,
        null,
        platformConfig ? platformConfig.platformName : null,
        [] // Pass empty details to clear previous list
      );

      setTimeout(() => {
        performTest();
      }, 500);
    };
    statusUI.appendChild(runButton);

    updateStatusUI(
      "Click 'Run Tests' to check selectors.",
      "info",
      false,
      null,
      null,
      []
    );
  }

  function updateStatusUI(
    message,
    type,
    showSpinner = false,
    nodeCount = null,
    platformName = null,
    detailedResults = null // New parameter for detailed results
  ) {
    if (!statusUI) {
      createStatusUI();
    }

    // Update main elements
    const messageSpan = statusUI.querySelector("span");
    const nodeCountSpan = statusUI.querySelector(".node-count");
    const platformNameEl = statusUI.querySelector(".platform-name");
    const spinnerDiv = statusUI.querySelector(".spinner");
    const runButton = document.getElementById(RUN_BUTTON_ID);

    if (spinnerDiv) spinnerDiv.remove();

    statusUI.classList.remove(
      "status-ok",
      "status-warning",
      "status-error",
      "status-info"
    );
    statusUI.classList.add(`status-${type}`);

    messageSpan.textContent = message;

    if (showSpinner) {
      const spinner = document.createElement("div");
      spinner.className = "spinner";
      statusUI.insertBefore(spinner, messageSpan);
    }

    if (nodeCount !== null) {
      nodeCountSpan.textContent = `DOM Nodes: ${nodeCount.toLocaleString()}`;
      nodeCountSpan.style.display = "block";
    } else {
      nodeCountSpan.style.display = "none";
    }

    if (platformName !== null) {
      platformNameEl.textContent = platformName;
      platformNameEl.style.display = "block";
    } else {
      platformNameEl.style.display = "none";
    }

    // Handle detailed test results list
    const detailsListContainer = document.getElementById(TEST_DETAILS_LIST_ID);
    if (detailsListContainer) {
      // FIX: Use removeChild to clear content due to TrustedHTML policy
      while (detailsListContainer.firstChild) {
        detailsListContainer.removeChild(detailsListContainer.firstChild);
      }

      if (detailedResults && detailedResults.length > 0) {
        detailedResults.forEach((result) => {
          const listItem = document.createElement("li");
          const iconSpan = document.createElement("span");
          iconSpan.className = "status-icon";

          if (result.found) {
            iconSpan.textContent = "✓";
            iconSpan.classList.add("pass");
          } else {
            iconSpan.textContent = "✗";
            iconSpan.classList.add("fail");
          }
          listItem.appendChild(iconSpan);

          const textSpan = document.createElement("span");
          textSpan.textContent = result.name;
          listItem.appendChild(textSpan);
          detailsListContainer.appendChild(listItem);
        });
        detailsListContainer.style.display = "block"; // Show the list
      } else {
        detailsListContainer.style.display = "none"; // Hide if no results
      }
    }

    if (runButton) {
      runButton.style.display = "block";
    }
  }

  function performTest() {
    testAttempts++;
    currentPlatform = getPlatform();

    if (!currentPlatform) {
      console.log(
        "AI Exporter Test: Not on a recognized ChatGPT or Gemini page."
      );
      updateStatusUI(
        "Not an AI Chat Page",
        "info",
        false,
        null,
        "Unknown Platform",
        []
      );
      return;
    }

    const platformConfig = SELECTORS_TO_TEST[currentPlatform];
    const totalNodes = document.querySelectorAll("*").length;

    console.group(
      `AI Exporter Test: Attempt ${testAttempts} - Checking selectors for ${platformConfig.platformName}`
    );
    testResults = {
      platform: platformConfig.platformName,
      passed: 0,
      failed: 0,
      details: [],
    };

    let allCriticalPassed = true;

    platformConfig.selectors.forEach((item) => {
      const found = document.querySelector(item.selector);
      const status = found ? "PASS" : "FAIL";
      const result = {
        name: item.name,
        selector: item.selector,
        found: !!found,
        status: status,
      };

      if (!found) {
        if (!item.optional) {
          testResults.failed++;
          allCriticalPassed = false;
        }
        console.error(
          `  ${status}: ${item.name} - '${item.selector}' NOT FOUND`
        );
      } else {
        testResults.passed++;
      }
      testResults.details.push(result);
    });

    console.groupEnd();

    let statusText = testResults.failed > 0 ? "Failed" : "OK";
    let summaryMessage = `Summary: ${testResults.passed}/${platformConfig.selectors.length} ${statusText}`;
    let uiType = testResults.failed > 0 ? "error" : "ok";

    const shouldRetry = !allCriticalPassed && testAttempts < MAX_TEST_ATTEMPTS;

    if (shouldRetry) {
      updateStatusUI(
        `${summaryMessage} Retrying... (${testAttempts}/${MAX_TEST_ATTEMPTS})`,
        "warning",
        true,
        totalNodes,
        platformConfig.platformName,
        testResults.details // Pass details for display during retry
      );
      setTimeout(performTest, RETRY_INTERVAL_MS);
    } else {
      updateStatusUI(
        summaryMessage,
        uiType,
        false,
        totalNodes,
        platformConfig.platformName,
        testResults.details // Pass final details
      );
      console.log("AI Exporter Test Final Summary:", testResults);
      if (allCriticalPassed && observer) {
        observer.disconnect();
        console.log(
          "AI Exporter Test: Disconnecting MutationObserver as selectors are stable."
        );
      }
    }
  }

  // --- Script Initialization ---

  function initObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver((mutationsList, observer) => {
      const isStillChecking = statusUI && statusUI.querySelector(".spinner");
      const hasSignificantChanges = mutationsList.some(
        (mutation) =>
          mutation.type === "childList" &&
          mutation.addedNodes.length > 0 &&
          mutation.target.nodeName !== "SCRIPT" &&
          mutation.target.id !== TEST_UI_ID
      );

      if (isStillChecking || hasSignificantChanges) {
        // Observer is active, but we don't auto-trigger performTest here for manual test mode.
        // It's primarily for ensuring the UI elements exist and don't disappear.
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  }

  createStatusUI();
  initObserver();
})();
