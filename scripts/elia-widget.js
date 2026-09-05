/**
 * Widget Elia - assistant de support du portail client Bluewaive.
 * Adapté du widget Elia de bluewaive-lp/js/chat-widget.js (source de vérité pour le
 * composant visuel, le comportement de messagerie, l'avatar et le webhook n8n) :
 * même comportement, même endpoint, mêmes en-têtes de charte interne du portail.
 *
 * Ce script n'est chargé que sur les pages protégées /client/:agencyId/... (voir
 * lib/app.js, pageFiles) - jamais sur /login, /forgot-password, /reset-password ou
 * /roi-simulator. Il n'est jamais injecté côté serveur : sa seule condition
 * d'affichage est la présence de sa balise <script> dans le HTML déjà servi sous
 * garde de session.
 *
 * Confidentialité : le payload envoyé au webhook reste strictement
 * { sessionId, message, timestamp } - sessionId est un identifiant aléatoire généré
 * dans le navigateur, jamais dérivé de agencyId/email/session. Aucune donnée
 * Airtable, Retell, ni aucun cookie n'est lue ou transmise par ce script.
 *
 * Isolation par client : agencyId est lu uniquement dans l'URL déjà affichée par le
 * navigateur (window.location.pathname, /client/:agencyId/...), jamais depuis un
 * cookie ou une réponse API, et sert uniquement à préfixer les clés localStorage
 * (historique + sessionId) - il n'est jamais inclus dans une requête réseau. Deux
 * agences utilisant le même navigateur ont donc chacune leur propre historique et
 * leur propre sessionId de conversation.
 */
(function () {
  'use strict';

  function getAgencyNamespace() {
    var match = window.location.pathname.match(/^\/client\/([^/]+)/);
    return match ? match[1] : 'default';
  }

  var ns = getAgencyNamespace();

  var config = Object.assign(
    {
      webhookUrl: 'https://n8n.srv1552822.hstgr.cloud/webhook/bluewaive-chat',
      title: 'Bluewaive',
      subtitle: 'Elia - Assistante support',
      greeting: 'Bonjour, je suis Elia, l’assistante support Bluewaive. Je peux vous aider à vous orienter dans votre espace client, vos documents et les prochaines étapes de votre projet. Je n’accède pas à vos données confidentielles et je ne peux pas modifier votre dossier. Comment puis-je vous aider ?',
      avatarUrl: '/elia-avatar.png',
      // Préfixées par l'agence courante (voir getAgencyNamespace) : un client ne
      // retrouve jamais l'historique d'un autre client sur le même navigateur.
      storageKey: 'bw_elia_history_v1__' + ns,
      sessionKey: 'bw_elia_session_id_v1__' + ns,
      maxHistory: 50,
      requestTimeoutMs: 30000,
    },
    window.BLUEWAIVE_ELIA_CONFIG || {}
  );

  if (!config.webhookUrl) {
    console.warn('[elia] webhookUrl manquant - le widget ne pourra pas envoyer de messages.');
  }

  var ICONS = {
    open: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12C4 7.58 7.8 4 12.5 4S21 7.58 21 12s-3.8 8-8.5 8c-1.02 0-2-.17-2.9-.49L4 21l1.4-4.2C4.5 15.4 4 13.76 4 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-9 0l1 12a1 1 0 001 1h8a1 1 0 001-1l1-12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12l16-8-6 8 6 8-16-8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  };

  // Message affiché quand Elia ne peut pas répondre (erreur réseau, timeout, webhook
  // indisponible). Contrairement au widget commercial de bluewaive-lp, on ne pousse
  // jamais vers une prise de rendez-vous ici : le client est déjà signé, on le
  // renvoie vers son interlocuteur Bluewaive habituel et on rappelle que le reste du
  // portail (documents, devis, factures...) continue de fonctionner normalement.
  var FALLBACK = {
    text: 'Elia est temporairement indisponible. Le reste de votre espace client (documents, devis, factures, projet) reste accessible normalement. Vous pouvez réessayer dans un instant ou contacter directement votre interlocuteur Bluewaive.',
    phone: '06 95 70 73 82',
    phoneHref: 'tel:+33695707382',
    email: 'christel@bluewaive.fr',
    emailHref: 'https://mail.google.com/mail/?view=cm&fs=1&to=christel@bluewaive.fr',
  };

  // ---------- Utilitaires ----------

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function uid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Rendu markdown minimal et sûr (échappement HTML d'abord, puis substitutions ciblées).
  function renderMarkdown(raw) {
    var codeBlocks = [];
    var text = escapeHtml(raw);

    // Blocs de code ```...```
    text = text.replace(/```([\s\S]*?)```/g, function (_, code) {
      codeBlocks.push('<pre><code>' + code.replace(/^\n/, '') + '</code></pre>');
      return ' ' + (codeBlocks.length - 1) + ' ';
    });

    // Code inline
    text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    // Gras
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    // Italique
    text = text.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    // Liens [texte](url)
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Listes à puces (lignes consécutives commençant par "- " ou "* ")
    var lines = text.split('\n');
    var htmlLines = [];
    var inList = false;
    lines.forEach(function (line) {
      var m = line.match(/^\s*[-*]\s+(.*)$/);
      if (m) {
        if (!inList) { htmlLines.push('<ul>'); inList = true; }
        htmlLines.push('<li>' + m[1] + '</li>');
      } else {
        if (inList) { htmlLines.push('</ul>'); inList = false; }
        htmlLines.push(line);
      }
    });
    if (inList) htmlLines.push('</ul>');
    text = htmlLines.join('\n');

    // Paragraphes (double saut de ligne) puis retours à la ligne simples
    text = text
      .split(/\n{2,}/)
      .map(function (block) {
        if (/^<(ul|pre)/.test(block.trim())) return block;
        return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
      })
      .join('');

    // Restaure les blocs de code
    text = text.replace(/ (\d+) /g, function (_, i) {
      return codeBlocks[Number(i)];
    });

    return text;
  }

  // ---------- Widget ----------

  function EliaWidget() {
    this.messages = this.loadHistory();
    this.isOpen = false;
    this.isStreaming = false;
    this.abortController = null;
    this.sessionId = this.loadSessionId();
    this.buildDom();
    this.bindEvents();
    this.renderMessages();
  }

  EliaWidget.prototype.loadSessionId = function () {
    try {
      var existing = localStorage.getItem(config.sessionKey);
      if (existing) return existing;
      var fresh = uid();
      localStorage.setItem(config.sessionKey, fresh);
      return fresh;
    } catch (e) {
      return uid();
    }
  };

  EliaWidget.prototype.loadHistory = function () {
    try {
      var raw = localStorage.getItem(config.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  EliaWidget.prototype.saveHistory = function () {
    try {
      var trimmed = this.messages.slice(-config.maxHistory);
      localStorage.setItem(config.storageKey, JSON.stringify(trimmed));
    } catch (e) {
      /* stockage indisponible (navigation privée, quota) - on continue sans persister */
    }
  };

  EliaWidget.prototype.buildDom = function () {
    var launcher = document.createElement('button');
    launcher.className = 'bw-chat-launcher';
    launcher.type = 'button';
    launcher.setAttribute('aria-label', 'Ouvrir l’assistant Elia');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.innerHTML = config.avatarUrl
      ? '<img class="bw-chat-launcher-avatar bw-chat-icon-open" src="' + escapeHtml(config.avatarUrl) + '" alt="" />' +
        '<span class="bw-chat-icon-close">' + ICONS.close + '</span>'
      : '<span class="bw-chat-icon-open">' + ICONS.open + '</span>' +
        '<span class="bw-chat-icon-close">' + ICONS.close + '</span>';

    var win = document.createElement('div');
    win.className = 'bw-chat-window';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', config.title + ' - ' + config.subtitle);
    win.innerHTML =
      '<div class="bw-chat-header">' +
        '<div class="bw-chat-header-info">' +
          (config.avatarUrl ? '<img class="bw-chat-header-avatar" src="' + escapeHtml(config.avatarUrl) + '" alt="" />' : '') +
          '<div>' +
            '<div class="bw-chat-header-title">' + escapeHtml(config.title) + '</div>' +
            '<div class="bw-chat-header-subtitle">' + escapeHtml(config.subtitle) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="bw-chat-header-actions">' +
          '<button type="button" class="bw-chat-header-btn bw-chat-reset" aria-label="Effacer la conversation" title="Effacer la conversation">' + ICONS.trash + '</button>' +
          '<button type="button" class="bw-chat-header-btn bw-chat-close" aria-label="Fermer le chat" title="Fermer">' + ICONS.close + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="bw-chat-messages" role="log" aria-live="polite"></div>' +
      '<form class="bw-chat-form">' +
        '<textarea class="bw-chat-textarea" rows="1" placeholder="Écrivez votre message…" aria-label="Votre message"></textarea>' +
        '<button type="submit" class="bw-chat-send" aria-label="Envoyer">' + ICONS.send + '</button>' +
      '</form>';

    document.body.appendChild(launcher);
    document.body.appendChild(win);

    this.el = {
      launcher: launcher,
      window: win,
      messages: win.querySelector('.bw-chat-messages'),
      form: win.querySelector('.bw-chat-form'),
      textarea: win.querySelector('.bw-chat-textarea'),
      sendBtn: win.querySelector('.bw-chat-send'),
      resetBtn: win.querySelector('.bw-chat-reset'),
      closeBtn: win.querySelector('.bw-chat-close'),
    };
  };

  EliaWidget.prototype.bindEvents = function () {
    var self = this;

    this.el.launcher.addEventListener('click', function () { self.toggleOpen(); });
    this.el.closeBtn.addEventListener('click', function () { self.setOpen(false); });
    this.el.resetBtn.addEventListener('click', function () { self.resetConversation(); });

    this.el.form.addEventListener('submit', function (e) {
      e.preventDefault();
      self.handleSubmit();
    });

    this.el.textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        self.handleSubmit();
      }
    });

    this.el.textarea.addEventListener('input', function () {
      self.el.textarea.style.height = 'auto';
      self.el.textarea.style.height = Math.min(self.el.textarea.scrollHeight, 100) + 'px';
    });

    // Ne coupe pas l'auto-scroll si l'utilisateur remonte volontairement dans l'historique.
    this.stickToBottom = true;
    this.el.messages.addEventListener('scroll', function () {
      var el = self.el.messages;
      self.stickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    });
  };

  EliaWidget.prototype.toggleOpen = function () { this.setOpen(!this.isOpen); };

  EliaWidget.prototype.setOpen = function (open) {
    this.isOpen = open;
    this.el.window.classList.toggle('bw-chat-open', open);
    this.el.launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
    this.el.launcher.setAttribute('aria-label', open ? 'Fermer l’assistant Elia' : 'Ouvrir l’assistant Elia');
    if (open) {
      this.scrollToBottom(true);
      this.el.textarea.focus();
    }
  };

  EliaWidget.prototype.resetConversation = function () {
    if (this.isStreaming) return;
    this.messages = [];
    this.saveHistory();
    this.renderMessages();
  };

  EliaWidget.prototype.scrollToBottom = function (force) {
    if (!force && !this.stickToBottom) return;
    this.el.messages.scrollTop = this.el.messages.scrollHeight;
  };

  EliaWidget.prototype.renderMessages = function () {
    var container = this.el.messages;
    container.innerHTML = '';

    if (this.messages.length === 0) {
      container.appendChild(this.buildMessageEl({ id: 'elia-greeting', role: 'assistant', content: config.greeting }));
      return;
    }

    var self = this;
    this.messages.forEach(function (msg) {
      container.appendChild(self.buildMessageEl(msg));
    });
    this.scrollToBottom(true);
  };

  EliaWidget.prototype.buildMessageEl = function (msg) {
    var wrapper = document.createElement('div');
    wrapper.className = 'bw-chat-msg bw-chat-msg-' + msg.role;
    wrapper.dataset.id = msg.id;

    if (msg.role === 'assistant' && config.avatarUrl) {
      var avatar = document.createElement('img');
      avatar.className = 'bw-chat-msg-avatar';
      avatar.src = config.avatarUrl;
      avatar.alt = '';
      wrapper.appendChild(avatar);
    }

    var bubble = document.createElement('div');
    bubble.className = 'bw-chat-bubble';
    bubble.innerHTML = renderMarkdown(msg.content || '');
    wrapper.appendChild(bubble);

    if (msg.role === 'error') {
      var fallback = document.createElement('div');
      fallback.className = 'bw-chat-fallback';
      fallback.innerHTML =
        '<a class="bw-chat-fallback-item" href="' + escapeHtml(FALLBACK.phoneHref) + '">' + escapeHtml(FALLBACK.phone) + '</a>' +
        '<a class="bw-chat-fallback-item" href="' + escapeHtml(FALLBACK.emailHref) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(FALLBACK.email) + '</a>';
      wrapper.appendChild(fallback);

      var retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'bw-chat-retry';
      retry.textContent = 'Réessayer';
      var self = this;
      retry.addEventListener('click', function () { self.retryLastMessage(); });
      wrapper.appendChild(retry);
    }

    return wrapper;
  };

  EliaWidget.prototype.handleSubmit = function () {
    var text = this.el.textarea.value.trim();
    if (!text || this.isStreaming) return;
    this.el.textarea.value = '';
    this.el.textarea.style.height = 'auto';
    this.pushMessage({ id: uid(), role: 'user', content: text });
    this.sendToWebhook(text);
  };

  EliaWidget.prototype.retryLastMessage = function () {
    // Retire la bulle d'erreur, puis renvoie le dernier message utilisateur.
    var lastUser = null;
    for (var i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'error') continue;
      if (this.messages[i].role === 'user') { lastUser = this.messages[i]; break; }
      break;
    }
    this.messages = this.messages.filter(function (m) { return m.role !== 'error'; });
    this.saveHistory();
    this.renderMessages();
    if (lastUser) this.sendToWebhook(lastUser.content);
  };

  EliaWidget.prototype.pushMessage = function (msg) {
    this.messages.push(msg);
    this.saveHistory();
    this.el.messages.appendChild(this.buildMessageEl(msg));
    this.scrollToBottom(true);
  };

  EliaWidget.prototype.setStreaming = function (streaming) {
    this.isStreaming = streaming;
    this.el.textarea.disabled = streaming;
    this.el.sendBtn.disabled = streaming;
  };

  EliaWidget.prototype.showTyping = function () {
    this.hideTyping();
    var typing = document.createElement('div');
    typing.className = 'bw-chat-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    this.el.typing = typing;
    this.el.messages.appendChild(typing);
    this.scrollToBottom();
  };

  EliaWidget.prototype.hideTyping = function () {
    if (this.el.typing && this.el.typing.parentNode) this.el.typing.parentNode.removeChild(this.el.typing);
    this.el.typing = null;
  };

  // Payload strictement limité à { sessionId, message, timestamp } - jamais
  // agencyId, email, nom de client, cookie ou donnée Airtable/Retell. sessionId est
  // un identifiant aléatoire propre au navigateur (voir loadSessionId), sans lien
  // avec l'identité du client.
  EliaWidget.prototype.sendToWebhook = function (text) {
    var self = this;

    if (!config.webhookUrl) {
      this.pushMessage({ id: uid(), role: 'error', content: 'Configuration manquante : aucune URL de webhook n’est définie.' });
      return;
    }

    this.setStreaming(true);
    this.showTyping();

    this.abortController = new AbortController();
    var timeoutId = setTimeout(function () { self.abortController.abort(); }, config.requestTimeoutMs);

    var payload = {
      sessionId: this.sessionId,
      message: text,
      timestamp: new Date().toISOString(),
    };

    fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: this.abortController.signal,
    })
      .then(function (response) {
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return self.consumeResponse(response);
      })
      .catch(function () {
        clearTimeout(timeoutId);
        self.hideTyping();
        self.pushMessage({ id: uid(), role: 'error', content: FALLBACK.text });
      })
      .then(function () {
        self.setStreaming(false);
      });
  };

  // Lit la réponse du webhook n8n en flux si possible, sinon retombe sur un JSON/texte complet.
  EliaWidget.prototype.consumeResponse = function (response) {
    var self = this;
    var assistantMsg = { id: uid(), role: 'assistant', content: '' };
    var started = false;

    function ensureBubble() {
      if (started) return;
      started = true;
      self.hideTyping();
      self.messages.push(assistantMsg);
      self.el.messages.appendChild(self.buildMessageEl(assistantMsg));
    }

    function updateBubble(fullText) {
      assistantMsg.content = fullText;
      var wrapper = self.el.messages.querySelector('[data-id="' + assistantMsg.id + '"] .bw-chat-bubble');
      if (wrapper) wrapper.innerHTML = renderMarkdown(fullText);
      self.scrollToBottom();
    }

    if (!response.body || !window.ReadableStream) {
      return response.text().then(function (raw) {
        var text = self.extractTextFromPayload(raw);
        ensureBubble();
        updateBubble(text);
        self.finalizeAssistantMessage(assistantMsg);
      });
    }

    var reader = response.body.getReader();
    var decoder = new TextDecoder('utf-8');
    var buffer = '';

    function readChunk() {
      return reader.read().then(function (result) {
        if (result.done) {
          // Réponse non-streamée envoyée en un seul bloc JSON (ex. Respond to Webhook classique) :
          // le texte affiché serait alors le JSON brut, on le désenveloppe avant de finaliser.
          var trimmed = buffer.trim();
          if (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '"') {
            var unwrapped = self.extractTextFromPayload(trimmed);
            if (unwrapped !== trimmed) updateBubble(unwrapped);
          }
          self.finalizeAssistantMessage(assistantMsg);
          return;
        }
        var chunkText = decoder.decode(result.value, { stream: true });
        buffer += self.parseStreamChunk(chunkText);
        ensureBubble();
        updateBubble(buffer);
        return readChunk();
      });
    }

    return readChunk();
  };

  // n8n peut streamer du texte brut token par token, ou des lignes SSE `data: {...}`.
  EliaWidget.prototype.parseStreamChunk = function (chunkText) {
    if (chunkText.indexOf('data:') === -1) return chunkText;

    var out = '';
    var lines = chunkText.split('\n');
    lines.forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed.startsWith('data:')) {
        out += line;
        return;
      }
      var payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') return;
      try {
        var parsed = JSON.parse(payload);
        if (typeof parsed === 'string') out += parsed;
        else if (parsed && typeof parsed.content === 'string') out += parsed.content;
        else if (parsed && typeof parsed.chunk === 'string') out += parsed.chunk;
        else if (parsed && typeof parsed.text === 'string') out += parsed.text;
      } catch (e) {
        out += payload;
      }
    });
    return out;
  };

  EliaWidget.prototype.extractTextFromPayload = function (raw) {
    try {
      var parsed = JSON.parse(raw);
      if (typeof parsed === 'string') return parsed;
      if (parsed && typeof parsed.output === 'string') return parsed.output;
      if (parsed && typeof parsed.text === 'string') return parsed.text;
      if (parsed && typeof parsed.message === 'string') return parsed.message;
      return raw;
    } catch (e) {
      return raw;
    }
  };

  EliaWidget.prototype.finalizeAssistantMessage = function (assistantMsg) {
    if (!assistantMsg.content) {
      assistantMsg.content = 'Désolé, je n’ai pas pu générer de réponse.';
      var wrapper = this.el.messages.querySelector('[data-id="' + assistantMsg.id + '"] .bw-chat-bubble');
      if (wrapper) wrapper.innerHTML = renderMarkdown(assistantMsg.content);
    }
    this.saveHistory();
    this.scrollToBottom();
  };

  function init() {
    new EliaWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
