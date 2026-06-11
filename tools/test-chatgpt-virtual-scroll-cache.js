const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

class FakeElement {
  constructor(tagName, attrs = {}, text = "", children = []) {
    this.tagName = tagName.toUpperCase();
    this.nodeName = this.tagName;
    this.attrs = attrs;
    this._text = text;
    this.children = children;
    this.style = {};
    this.dataset = {};
    this.className = attrs.class || "";
    this._cloneText = attrs.cloneText;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  getAttribute(name) {
    return this.attrs[name] || null;
  }

  get innerText() {
    const childText = this.children.map((child) => child.innerText).join("");
    return this._text + childText;
  }

  get textContent() {
    const childText = this.children.map((child) => child.textContent).join("");
    return this._text + childText;
  }

  set textContent(value) {
    this._text = value;
    this.children = [];
  }

  cloneNode(deep) {
    return new FakeElement(
      this.tagName,
      { ...this.attrs },
      this._cloneText !== undefined ? this._cloneText : this._text,
      deep ? this.children.map((child) => child.cloneNode(true)) : []
    );
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (node) => {
      if (matchesSelector(node, selector)) matches.push(node);
      node.children.forEach(visit);
    };
    this.children.forEach(visit);
    return matches;
  }

  matches(selector) {
    return matchesSelector(this, selector);
  }
}

function matchesSelector(node, selector) {
  if (selector === ".markdown, .whitespace-pre-wrap") {
    return Boolean(node.attrs.class && /\b(markdown|whitespace-pre-wrap)\b/.test(node.attrs.class));
  }
  if (selector === ".cm-content") {
    return Boolean(node.attrs.class && /\bcm-content\b/.test(node.attrs.class));
  }
  if (selector === ".user-message-inline-code") {
    return Boolean(
      node.attrs.class && /\buser-message-inline-code\b/.test(node.attrs.class)
    );
  }
  if (selector === "code") return node.tagName === "CODE";
  if (selector === "section[data-testid^='conversation-turn-']") {
    return (
      node.tagName === "SECTION" &&
      typeof node.attrs["data-testid"] === "string" &&
      node.attrs["data-testid"].startsWith("conversation-turn-")
    );
  }
  if (selector === "main") return node.tagName === "MAIN";
  return false;
}

function makeTurn(index, turn, text) {
  const children = text
    ? [new FakeElement("div", { class: turn === "assistant" ? "markdown" : "whitespace-pre-wrap" }, text)]
    : [];
  return new FakeElement(
    "section",
    { "data-testid": `conversation-turn-${index}`, "data-turn": turn },
    "",
    children
  );
}

function makeMultiBlockTurn(index, turn, texts) {
  return new FakeElement(
    "section",
    { "data-testid": `conversation-turn-${index}`, "data-turn": turn },
    "",
    texts.map((text) =>
      new FakeElement(
        "div",
        { class: turn === "assistant" ? "markdown" : "whitespace-pre-wrap" },
        text
      )
    )
  );
}

function makeDocument(turns) {
  const main = new FakeElement("main", {}, "", turns);
  return {
    title: "Virtual Scroll Chat - ChatGPT",
    head: new FakeElement("head"),
    body: new FakeElement("body", {}, "", [main]),
    documentElement: new FakeElement("html"),
    readyState: "complete",
    addEventListener: () => {},
    createElement: (tagName) => new FakeElement(tagName),
    getElementById: () => null,
    querySelector: (selector) => main.querySelector(selector),
    querySelectorAll: (selector) => main.querySelectorAll(selector),
  };
}

function loadExporter(initialDocument) {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "ai-chat-exporter.user.js"),
    "utf8"
  );
  const sandbox = {
    console,
    window: {
      location: { hostname: "chatgpt.com", origin: "https://chatgpt.com", pathname: "/c/test" },
      __AI_CHAT_EXPORTER_TEST__: {},
      addEventListener: () => {},
    },
    document: initialDocument,
    localStorage: { getItem: () => null, setItem: () => {} },
    GM_getValue: (_key, fallback) => fallback,
    GM_setValue: () => {},
    GM_registerMenuCommand: () => {},
    MutationObserver: class {
      observe() {}
    },
    TurndownService: class {},
    setTimeout: () => 0,
    alert: () => {},
    prompt: () => null,
  };
  sandbox.window.document = sandbox.document;
  vm.runInNewContext(source, sandbox, { filename: "ai-chat-exporter.user.js" });
  return sandbox;
}

const sandbox = loadExporter(
  makeDocument([
    makeTurn(1, "user", "first question"),
    makeTurn(2, "assistant", "first answer"),
    makeTurn(3, "user", ""),
    makeTurn(4, "assistant", ""),
  ])
);

assert.ok(
  sandbox.window.__AI_CHAT_EXPORTER_TEST__.ChatExporter,
  "expected test hook to expose ChatExporter"
);

const { ChatExporter, Utils } = sandbox.window.__AI_CHAT_EXPORTER_TEST__;
let firstScan = ChatExporter.extractChatGPTChatData(sandbox.document);
assert.strictEqual(
  JSON.stringify(firstScan.messages.map((message) => message.contentText)),
  JSON.stringify(["first question", "first answer"])
);

sandbox.document = makeDocument([
  makeTurn(1, "user", ""),
  makeTurn(2, "assistant", ""),
  makeTurn(3, "user", "second question"),
  makeTurn(4, "assistant", "second answer"),
]);
sandbox.window.document = sandbox.document;

let secondScan = ChatExporter.extractChatGPTChatData(sandbox.document);
assert.strictEqual(
  JSON.stringify(secondScan.messages.map((message) => message.contentText)),
  JSON.stringify(["first question", "first answer", "second question", "second answer"])
);
assert.strictEqual(secondScan.messageCount, 2);

sandbox.document = makeDocument([
  makeTurn(1, "user", "question with a long answer"),
  makeMultiBlockTurn(2, "assistant", [
    "short visible summary",
    "原因基本可以确定：你看到的主线程卡顿不是 glClientWaitSync(..., timeout=0) 等 fence 导致的。",
  ]),
]);
sandbox.window.document = sandbox.document;
ChatExporter._chatGPTTurnCache.clear();
ChatExporter._chatGPTCacheUrl = null;

let multiBlockScan = ChatExporter.extractChatGPTChatData(sandbox.document);
const assistantMessage = multiBlockScan.messages.find(
  (message) => message.author === "ai"
);
assert.ok(
  assistantMessage.contentText.includes("short visible summary"),
  "expected the first assistant content block to be exported"
);
assert.ok(
  assistantMessage.contentText.includes("原因基本可以确定"),
  "expected later assistant content blocks in the same turn to be exported"
);

const rules = {};
ChatExporter.setupTurndownRules({
  addRule: (name, rule) => {
    rules[name] = rule;
  },
});

const flattenedCodeNode = new FakeElement("code", {}, "line oneline two");
const cmContentPre = new FakeElement(
  "pre",
  { class: "cm-content q9tKkq_readonly m-0" },
  "line one\nline two",
  [flattenedCodeNode]
);
cmContentPre.previousElementSibling = null;
const convertedCodeBlock = rules.pre.replacement("", cmContentPre);
assert.ok(
  convertedCodeBlock.includes("line one\nline two"),
  "expected ChatGPT cm-content pre blocks to preserve innerText newlines"
);

sandbox.document = makeDocument([
  makeTurn(1, "user", "question with code"),
  new FakeElement(
    "section",
    { "data-testid": "conversation-turn-2", "data-turn": "assistant" },
    "",
    [
      new FakeElement("div", { class: "markdown" }, "", [
        new FakeElement("pre", {}, "", [
          new FakeElement(
            "pre",
            { class: "cm-content", cloneText: "line oneline two" },
            "line one\nline two",
            [new FakeElement("code", {}, "line oneline two")]
          ),
        ]),
      ]),
    ]
  ),
]);
sandbox.window.document = sandbox.document;
ChatExporter._chatGPTTurnCache.clear();
ChatExporter._chatGPTCacheUrl = null;

const clonedCodeScan = ChatExporter.extractChatGPTChatData(sandbox.document);
const clonedAssistant = clonedCodeScan.messages.find(
  (message) => message.author === "ai"
);
const clonedPre = clonedAssistant.contentHtml.querySelector(".cm-content");
assert.ok(
  clonedPre.innerText.includes("line one\nline two"),
  "expected cached ChatGPT code clones to keep live CodeMirror line breaks"
);

sandbox.document = makeDocument([
  new FakeElement(
    "section",
    { "data-testid": "conversation-turn-1", "data-turn": "user" },
    "",
    [
      new FakeElement(
        "div",
        { class: "whitespace-pre-wrap" },
        "",
        [
          new FakeElement(
            "code",
            { class: "user-message-inline-code" },
            "line one\nline two"
          ),
        ]
      ),
    ]
  ),
]);
sandbox.window.document = sandbox.document;
ChatExporter._chatGPTTurnCache.clear();
ChatExporter._chatGPTCacheUrl = null;

const userCodeScan = ChatExporter.extractChatGPTChatData(sandbox.document);
const markdownResult = ChatExporter.formatToMarkdown(userCodeScan, {
  turndown: (node) => node.innerText,
});
assert.ok(
  markdownResult.output.includes("> ```\n> line one\n> line two\n> ```"),
  "expected multiline ChatGPT user inline-code prompts to export as fenced blocks"
);

const chineseTitleFileName = Utils.formatFileName(
  "{platform}_{title}",
  "主线程卡顿原因分析",
  [],
  "md"
);
assert.strictEqual(
  chineseTitleFileName,
  "chatgpt_主线程卡顿原因分析.md",
  "expected non-Latin chat titles to be preserved in filenames"
);

console.log("chatgpt virtual scroll cache test passed");
