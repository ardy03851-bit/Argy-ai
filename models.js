/* =====================================================================
   models.js — LocalMind model registry
   ---------------------------------------------------------------------
   TO ADD A NEW MODEL:
     1. Add a new key to the MODELS object below.
     2. Add the same key to MODEL_ORDER (or omit it — missing keys are
        auto-appended at the end).
   Everything else (dropdown, icon, gradient glow, reasoning control,
   request builder, response parser) is derived from this file.

   Each model must implement:
     name              Display name
     id                API model id
     meta              Subtitle shown in the dropdown
     icon              Brand icon URL
     gradient          CSS gradient for the animated glow border
     glow              rgba() color for the avatar drop-shadow
     streaming         true if the endpoint emits OpenAI-style SSE
     reasoning         { type: 'pills'|'slider', options:[], defaults:{coding,simple,default} }
     buildRequest(ctx) => { endpoint, body, headers? }
                          ctx = { messages, systemPrompt, reasoning, attachments, mode }
     parseResponse(json) => { text, thinking, truncated }   (non-streaming)
     parseStreamEvent(json) => { thinking, content } | null (streaming)
   ===================================================================== */

(function () {
  'use strict';

  const ENDPOINTS = {
    gemini:   'https://api.kie.ai/gemini-4-argon-openai/v1/chat/completions',
    claude:   'https://api.kie.ai/claude/v1/messages',
    luna:     'https://api.kie.ai/codex/v1/responses',
    deepseek: 'https://api.kie.ai/openai/v1/responses'
  };

  const imagesFrom = (attachments) => attachments.filter(a => a.type === 'image');

  /* Shared parser for OpenAI "Responses" style payloads (GPT-6, DeepSeek) */
  function parseOpenAIResponses(json) {
    if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
    let text = '', thinking = '', truncated = false;

    (json.output || []).forEach(item => {
      if (item.type === 'reasoning') {
        if (Array.isArray(item.summary)) thinking += item.summary.map(s => s.text || '').join('\n');
        if (Array.isArray(item.content)) thinking += item.content.map(c => c.text || '').join('');
      }
      if (item.type === 'message' && Array.isArray(item.content)) {
        item.content.forEach(c => {
          if ((c.type === 'output_text' || c.type === 'text') && c.text) text += c.text;
        });
      }
    });

    if (!text && typeof json.output_text === 'string') text = json.output_text;
    if (json.status === 'incomplete' || json.incomplete_details) truncated = true;

    return { text, thinking, truncated };
  }

  /* Shared request builder for OpenAI "Responses" style endpoints */
  function buildResponsesRequest({ endpoint, modelId, messages, systemPrompt, reasoning, attachments }) {
    const images = imagesFrom(attachments);
    const input = messages.map((m, idx) => {
      const parts = [{ type: m.role === 'user' ? 'input_text' : 'output_text', text: m.content }];
      if (m.role === 'user' && idx === messages.length - 1 && images.length) {
        images.forEach(img => parts.push({ type: 'input_image', image_url: img.content }));
      }
      return { type: 'message', role: m.role, content: parts };
    });
    return {
      endpoint,
      body: {
        model: modelId,
        stream: false,
        instructions: systemPrompt,
        input,
        reasoning: { effort: reasoning },
        max_output_tokens: 32000
      }
    };
  }

  /* ── Registry ─────────────────────────────────────────────────────── */
  const MODELS = {

    /* ── Gemini ───────────────────────────────────────────────────── */
    gemini: {
      name: 'Gemini 4 Argon',
      id: 'gemini-4-argon',
      meta: 'Fast · multimodal',
      icon: 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@1.91.0/icons/gemini-color.svg',
      gradient: 'linear-gradient(120deg, #4285F4, #EA4335, #FBBC05, #34A853, #4285F4)',
      glow: 'rgba(66, 133, 244, 0.5)',
      streaming: true,
      reasoning: {
        type: 'pills',
        options: ['low', 'medium', 'high'],
        defaults: { coding: 'high', simple: 'low', default: 'medium' }
      },
      buildRequest({ messages, systemPrompt, reasoning, attachments }) {
        const images = imagesFrom(attachments);
        const out = [];
        if (systemPrompt) out.push({ role: 'system', content: systemPrompt });
        messages.forEach((m, idx) => {
          if (m.role === 'user') {
            const parts = [{ type: 'text', text: m.content }];
            if (idx === messages.length - 1 && images.length) {
              images.forEach(img => parts.push({ type: 'image_url', image_url: { url: img.content } }));
            }
            out.push({ role: 'user', content: parts });
          } else {
            out.push({ role: m.role, content: m.content });
          }
        });
        return {
          endpoint: ENDPOINTS.gemini,
          body: {
            messages: out,
            tools: [{ type: 'function', function: { name: 'googleSearch' } }],
            stream: true,
            include_thoughts: true,
            reasoning_effort: reasoning
          }
        };
      },
      parseStreamEvent(json) {
        if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
        if (!json.choices || !json.choices[0]) return null;
        const delta = json.choices[0].delta || {};
        let thinking = '', content = '';
        if (delta.reasoning_content) thinking += delta.reasoning_content;
        if (delta.reasoning) thinking += delta.reasoning;
        if (delta.thinking) thinking += delta.thinking;
        if (delta.content != null) {
          if (typeof delta.content === 'string') {
            content += delta.content;
          } else if (Array.isArray(delta.content)) {
            for (const part of delta.content) {
              if (!part) continue;
              const isThought = part.thought === true || (part.type && /thought|reasoning/i.test(part.type));
              if (isThought) { if (part.text) thinking += part.text; }
              else if (part.type === 'text' || typeof part.text === 'string') { if (part.text) content += part.text; }
            }
          }
        }
        if (!thinking && !content) return null;
        return { thinking, content };
      }
    },

    /* ── Claude ───────────────────────────────────────────────────── */
    claude: {
      name: 'Claude Opus 5.5',
      id: 'claude-opus-5-5',
      meta: 'Top-tier reasoning',
      icon: 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@1.91.0/icons/claude-color.svg',
      gradient: 'linear-gradient(120deg, #D97757, #F2B59C, #E88A6C, #D97757)',
      glow: 'rgba(217, 119, 87, 0.5)',
      streaming: false,
      reasoning: {
        type: 'slider',
        options: ['minimal', 'low', 'medium', 'high', 'max'],
        defaults: { coding: 'max', simple: 'low', default: 'medium' }
      },
      buildRequest({ messages, systemPrompt, reasoning, attachments }) {
        const maxTokens = { minimal: 8192, low: 12288, medium: 16384, high: 24576, max: 32000 };
        const images = imagesFrom(attachments);
        const claudeMessages = messages.map((m, idx) => {
          if (m.role === 'user' && idx === messages.length - 1 && images.length) {
            const parts = [{ type: 'text', text: m.content }];
            images.forEach(img => parts.push({ type: 'image_url', image_url: { url: img.content } }));
            return { role: 'user', content: parts };
          }
          return { role: m.role, content: m.content };
        });
        return {
          endpoint: ENDPOINTS.claude,
          body: {
            model: 'claude-opus-5-5',
            messages: claudeMessages,
            system: systemPrompt,
            max_tokens: maxTokens[reasoning] || 32000,
            stream: false,
            thinkingFlag: true
          }
        };
      },
      parseResponse(json) {
        if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
        let text = '', thinking = '', truncated = false;
        if (Array.isArray(json.content)) {
          json.content.forEach(block => {
            if (block.type === 'thinking' && block.thinking) thinking += block.thinking;
            if (block.type === 'text' && block.text) text += block.text;
          });
        } else if (typeof json.content === 'string') {
          text = json.content;
        }
        if (json.stop_reason === 'max_tokens') truncated = true;
        return { text, thinking, truncated };
      }
    },

    /* ── GPT-6 Luna ───────────────────────────────────────────────── */
    luna: {
      name: 'GPT-6 Luna',
      id: 'gpt-6-luna',
      meta: 'Advanced reasoning',
      icon: 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@1.91.0/icons/chatgpt-color.svg',
      gradient: 'linear-gradient(120deg, #10A37F, #7EE7C4, #0A7A5E, #10A37F)',
      glow: 'rgba(16, 163, 127, 0.5)',
      streaming: false,
      reasoning: {
        type: 'pills',
        options: ['low', 'medium', 'high'],
        defaults: { coding: 'high', simple: 'low', default: 'medium' }
      },
      buildRequest(ctx) {
        return buildResponsesRequest({ ...ctx, endpoint: ENDPOINTS.luna, modelId: 'gpt-6-luna' });
      },
      parseResponse: parseOpenAIResponses
    },

    /* ── DeepSeek ─────────────────────────────────────────────────── */
    deepseek: {
      name: 'DeepSeek V4.1 Flash',
      id: 'deepseek-v4-1-flash',
      meta: 'Fast · efficient coding',
      icon: 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@1.91.0/icons/deepseek-color.svg',
      gradient: 'linear-gradient(120deg, #4D6BFE, #A78BFA, #8C52FF, #4D6BFE)',
      glow: 'rgba(77, 107, 254, 0.5)',
      streaming: false,
      reasoning: {
        type: 'pills',
        options: ['low', 'medium', 'high'],
        defaults: { coding: 'high', simple: 'low', default: 'medium' }
      },
      buildRequest(ctx) {
        return buildResponsesRequest({ ...ctx, endpoint: ENDPOINTS.deepseek, modelId: 'deepseek-v4-1-flash' });
      },
      parseResponse: parseOpenAIResponses
    }
  };

  /* Dropdown order — keys not listed are appended automatically */
  const MODEL_ORDER = ['gemini', 'claude', 'luna', 'deepseek'];
  Object.keys(MODELS).forEach(k => { if (!MODEL_ORDER.includes(k)) MODEL_ORDER.push(k); });

  window.MODELS = MODELS;
  window.MODEL_ORDER = MODEL_ORDER;
})();
