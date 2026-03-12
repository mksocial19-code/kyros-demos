(function () {
  "use strict";

  // --- Config from data attributes ---
  var script =
    document.currentScript ||
    document.querySelector('script[data-company]');
  var CONFIG = {
    company: script.getAttribute("data-company") || "Our Company",
    phone: script.getAttribute("data-phone") || "",
    services: script.getAttribute("data-services") || "",
    apiUrl: script.getAttribute("data-api-url") || "",
  };

  // Resolve API base (strip trailing slash)
  var API_BASE = CONFIG.apiUrl
    ? CONFIG.apiUrl.replace(/\/+$/, "")
    : script.src.replace(/\/widget\.js.*$/, "");

  // --- State ---
  var isOpen = false;
  var messages = [];
  var history = [];
  var collectedLead = { name: "", email: "", phone: "" };
  var leadSent = false;

  // --- Styles ---
  var STYLES = document.createElement("style");
  STYLES.textContent =
    '#kyros-chat-widget *,#kyros-chat-widget *::before,#kyros-chat-widget *::after{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}' +
    "#kyros-chat-bubble{position:fixed;bottom:24px;right:24px;width:60px;height:60px;border-radius:50%;background:#0D0D0D;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.2);z-index:99999;transition:transform .2s ease;}" +
    "#kyros-chat-bubble:hover{transform:scale(1.08);}" +
    "#kyros-chat-bubble svg{width:28px;height:28px;fill:#FFFFFF;}" +
    "#kyros-chat-window{position:fixed;bottom:100px;right:24px;width:380px;max-height:560px;background:#FFFFFF;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.15);z-index:99999;display:none;flex-direction:column;overflow:hidden;}" +
    "#kyros-chat-window.open{display:flex;}" +
    "#kyros-chat-header{background:#0D0D0D;color:#FFFFFF;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;}" +
    "#kyros-chat-header-title{font-size:15px;font-weight:600;}" +
    "#kyros-chat-header-close{background:none;border:none;color:#FFFFFF;cursor:pointer;font-size:20px;line-height:1;padding:0 4px;opacity:.7;}" +
    "#kyros-chat-header-close:hover{opacity:1;}" +
    "#kyros-chat-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;min-height:300px;max-height:400px;background:#FFFFFF;}" +
    ".kyros-msg{max-width:85%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.5;word-wrap:break-word;}" +
    ".kyros-msg.bot{align-self:flex-start;background:#F5F5F5;color:#0D0D0D;border-bottom-left-radius:4px;}" +
    ".kyros-msg.user{align-self:flex-end;background:#0D0D0D;color:#FFFFFF;border-bottom-right-radius:4px;}" +
    ".kyros-msg.typing{align-self:flex-start;background:#F5F5F5;color:#6B6B6B;border-bottom-left-radius:4px;font-style:italic;}" +
    "#kyros-chat-input-bar{display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid #E0E0E0;background:#FFFFFF;}" +
    "#kyros-chat-input{flex:1;border:1px solid #E0E0E0;border-radius:999px;padding:10px 16px;font-size:14px;outline:none;color:#0D0D0D;background:#F5F5F5;}" +
    "#kyros-chat-input::placeholder{color:#6B6B6B;}" +
    "#kyros-chat-input:focus{border-color:#6B6B6B;}" +
    "#kyros-chat-send{width:38px;height:38px;border-radius:999px;border:none;background:#0D0D0D;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s;}" +
    "#kyros-chat-send:hover{opacity:.85;}" +
    "#kyros-chat-send:disabled{opacity:.4;cursor:default;}" +
    "#kyros-chat-send svg{width:16px;height:16px;fill:#FFFFFF;}" +
    "@media(max-width:767px){" +
    "#kyros-chat-window{bottom:0;right:0;left:0;width:100%;max-height:100%;height:100%;border-radius:0;}" +
    "#kyros-chat-messages{max-height:none;flex:1;}" +
    "#kyros-chat-bubble{bottom:16px;right:16px;}" +
    "}";
  document.head.appendChild(STYLES);

  // --- DOM ---
  var widget = document.createElement("div");
  widget.id = "kyros-chat-widget";

  // Bubble
  var bubble = document.createElement("div");
  bubble.id = "kyros-chat-bubble";
  bubble.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>';
  bubble.addEventListener("click", toggleChat);

  // Window
  var chatWindow = document.createElement("div");
  chatWindow.id = "kyros-chat-window";

  var header = document.createElement("div");
  header.id = "kyros-chat-header";
  header.innerHTML =
    '<span id="kyros-chat-header-title">' +
    escapeHTML(CONFIG.company) +
    "</span>";
  var closeBtn = document.createElement("button");
  closeBtn.id = "kyros-chat-header-close";
  closeBtn.innerHTML = "&#10005;";
  closeBtn.addEventListener("click", toggleChat);
  header.appendChild(closeBtn);

  var msgContainer = document.createElement("div");
  msgContainer.id = "kyros-chat-messages";

  var inputBar = document.createElement("div");
  inputBar.id = "kyros-chat-input-bar";

  var input = document.createElement("input");
  input.id = "kyros-chat-input";
  input.type = "text";
  input.placeholder = "Type a message...";
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  var sendBtn = document.createElement("button");
  sendBtn.id = "kyros-chat-send";
  sendBtn.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
  sendBtn.addEventListener("click", sendMessage);

  inputBar.appendChild(input);
  inputBar.appendChild(sendBtn);

  chatWindow.appendChild(header);
  chatWindow.appendChild(msgContainer);
  chatWindow.appendChild(inputBar);

  widget.appendChild(chatWindow);
  widget.appendChild(bubble);
  document.body.appendChild(widget);

  // --- Functions ---
  function escapeHTML(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
      chatWindow.classList.add("open");
      bubble.style.display = "none";
      if (messages.length === 0) {
        addBotMessage(
          "Hi! I'm the virtual assistant for " +
            CONFIG.company +
            ". What can I help you with today?"
        );
      }
      input.focus();
    } else {
      chatWindow.classList.remove("open");
      bubble.style.display = "flex";
    }
  }

  function addBotMessage(text) {
    messages.push({ role: "assistant", text: text });
    renderMessage(text, "bot");
  }

  function addUserMessage(text) {
    messages.push({ role: "user", text: text });
    renderMessage(text, "user");
  }

  function renderMessage(text, type) {
    var msg = document.createElement("div");
    msg.className = "kyros-msg " + type;
    msg.textContent = text;
    msgContainer.appendChild(msg);
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  function showTyping() {
    var msg = document.createElement("div");
    msg.className = "kyros-msg typing";
    msg.id = "kyros-typing";
    msg.textContent = "Typing...";
    msgContainer.appendChild(msg);
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById("kyros-typing");
    if (el) el.remove();
  }

  function sendMessage() {
    var text = input.value.trim();
    if (!text) return;

    addUserMessage(text);
    input.value = "";
    sendBtn.disabled = true;

    // Build history for API
    history.push({ role: "user", content: text });

    showTyping();

    fetch(API_BASE + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: history,
        company: CONFIG.company,
        services: CONFIG.services,
      }),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        hideTyping();
        var reply = data.reply || "Sorry, something went wrong. Please try again.";
        addBotMessage(reply);
        history.push({ role: "assistant", content: reply });

        // Try to extract lead info from conversation
        extractLeadInfo(text);

        // If lead captured flag, try to submit lead
        if (data.leadCaptured && !leadSent) {
          submitLead();
        }

        sendBtn.disabled = false;
        input.focus();
      })
      .catch(function () {
        hideTyping();
        addBotMessage("Sorry, I'm having trouble connecting. Please try again or call us at " + CONFIG.phone + ".");
        sendBtn.disabled = false;
      });
  }

  function extractLeadInfo(text) {
    // Simple heuristic extraction from user messages
    if (!collectedLead.email) {
      var emailMatch = text.match(
        /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/
      );
      if (emailMatch) collectedLead.email = emailMatch[0];
    }
    if (!collectedLead.phone) {
      var phoneMatch = text.match(
        /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/
      );
      if (phoneMatch) collectedLead.phone = phoneMatch[0];
    }
    if (!collectedLead.name) {
      // Check if user said "my name is X" or "I'm X" or "this is X"
      var nameMatch = text.match(
        /(?:my name is|i'm|i am|this is|name's|call me)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/i
      );
      if (nameMatch) collectedLead.name = nameMatch[1];
    }
  }

  function submitLead() {
    if (leadSent) return;
    if (!collectedLead.name && !collectedLead.email && !collectedLead.phone) return;

    leadSent = true;

    // Build summary from conversation
    var summary = messages
      .filter(function (m) { return m.role === "user"; })
      .map(function (m) { return m.text; })
      .join(" | ")
      .substring(0, 500);

    fetch(API_BASE + "/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: collectedLead.name || "Unknown",
        email: collectedLead.email || "",
        phone: collectedLead.phone || "",
        company_name: CONFIG.company,
        message_summary: summary,
      }),
    }).catch(function () {
      // Silently fail — don't disrupt chat
      leadSent = false;
    });
  }
})();
