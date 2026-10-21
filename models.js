/* LocalMind model registry.
   Add a model here and add a request adapter in fetchModelResponse() if its API shape differs.
   Keep provider API keys on a backend in production; browser keys are visible to users. */
window.LOCALMIND_API_KEY = '74448d346da387f028dc55cf96e194d3'; // Development only: paste your Kie.ai key here, or inject at runtime.

window.MODEL_CONFIG = {
  gemini: {
    name: 'Gemini 4 Argon', id: 'gemini-4-argon',
    endpoint: 'https://api.kie.ai/gemini-4-argon-openai/v1/chat/completions',
    reasoningType: 'pills', reasoningOptions: ['low', 'medium', 'high'], defaultReasoning: 'medium',
    icon: 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@1.91.0/icons/gemini-color.svg',
    meta: 'Fast · multimodal', accent: '#d97757', accentHover: '#e88a6c', accentGlow: 'rgba(217,119,87,.18)',
    gradient: 'linear-gradient(120deg,#4285F4,#EA4335,#FBBC05,#34A853)'
  },
  claude: {
    name: 'Claude Opus 5.5', id: 'claude-opus-5-5', endpoint: 'https://api.kie.ai/claude/v1/messages',
    reasoningType: 'slider', defaultReasoning: 'medium',
    icon: 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@1.91.0/icons/claude-color.svg',
    meta: 'Deep reasoning', accent: '#d97757', accentHover: '#e88a6c', accentGlow: 'rgba(217,119,87,.18)',
    gradient: 'linear-gradient(120deg,#8e513b,#e88a6c,#d97757)'
  },
  luna: {
    name: 'GPT-6 Luna', id: 'gpt-6-luna', endpoint: 'https://api.kie.ai/codex/v1/responses',
    reasoningType: 'pills', reasoningOptions: ['low', 'medium', 'high'], defaultReasoning: 'medium',
    icon: 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@1.91.0/icons/chatgpt-color.svg',
    meta: 'Advanced reasoning', accent: '#10a37f', accentHover: '#20b990', accentGlow: 'rgba(16,163,127,.18)',
    gradient: 'linear-gradient(120deg,#10a37f,#4ad7b0,#087f62)'
  },
  deepseek: {
    name: 'DeepSeek V4.1 Flash', id: 'deepseek-v4-1-flash', endpoint: 'https://api.kie.ai/openai/v1/responses',
    reasoningType: 'pills', reasoningOptions: ['low', 'medium', 'high'], defaultReasoning: 'medium',
    icon: 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@1.91.0/icons/deepseek-color.svg',
    meta: 'Fast · efficient coding', accent: '#4d6bfe', accentHover: '#7188ff', accentGlow: 'rgba(77,107,254,.18)',
    gradient: 'linear-gradient(120deg,#4d6bfe,#a17bff,#4d6bfe)'
  }
};
