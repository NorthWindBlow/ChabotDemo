export const ImageGenerator = {
  name: 'image-generation',
  type: 'response',

  // ✅ 安全匹配：判空 + 只匹配我们关心的 trace
  match: ({ trace }) => {
    const t = trace?.type;
    const p = trace?.payload;
    const isImageGen = p?.name === 'image_generation';
    // Voiceflow 常见：自定义/组件类型，payload.name 标识你的组件名
    return (t === 'component' || t === 'custom') && isImageGen;
  },

  render: ({ trace, element }) => {
    // ✅ 所有操作都基于安全的 payload
    const payload = trace?.payload ?? {};
    let { prompt, apiKey, openaiModel, submitEvent } = payload;

    // 给默认值，避免 undefined 继续向下传
    openaiModel = openaiModel || 'gpt-image-1';      // 你自己的默认模型名
    submitEvent = submitEvent || 'image_generation_done';

    // UI 容器
    const container = document.createElement('div');
    container.className = 'image-generator-container';
    const style = document.createElement('style');
    style.textContent = `
      .image-generator-container { width:auto; max-width:100%; margin:1rem auto; text-align:center; }
      .image-generator-container img { width:100%; height:auto; display:block; margin:0 auto; }
      .loading-text { font-size:1rem; color:#555; margin:1rem 0; }
      .error-text { font-size:1rem; color:#c00; margin:1rem 0; }
    `;
    container.appendChild(style);
    element.appendChild(container);

    const loadingText = document.createElement('div');
    loadingText.className = 'loading-text';
    container.appendChild(loadingText);

    // ✅ 参数校验（直接在界面提示，不抛异常中断）
    if (!prompt) {
      loadingText.className = 'error-text';
      loadingText.textContent = 'Missing "prompt".';
      return () => container.remove();
    }
    if (!apiKey) {
      loadingText.className = 'error-text';
      loadingText.textContent = 'Missing "apiKey". (Do not expose secrets on client)';
      return () => container.remove();
    }

    loadingText.textContent = 'Generating image...';

    // ⚠️ 注意：在浏览器里直连 OpenAI 会暴露 Key，建议改为后端代理
    fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        prompt,
        n: 1,
        size: '1024x1024',
        model: openaiModel
      })
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const imageUrl = data?.data?.[0]?.url;
        if (!imageUrl) throw new Error('Image URL not found');

        loadingText.remove();

        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = prompt;
        container.appendChild(img);

        // ✅ 回传交互事件时也要兜底，防止再次中断
        try {
          window?.voiceflow?.chat?.interact?.({
            type: submitEvent,               // 例如自定义事件名 'image_generation_done'
            payload: { ok: true, imageUrl }  // 带回生成结果更实用
          });
        } catch (e) {
          // 静默失败即可，不要影响 UI
          console.warn('submitEvent failed:', e);
        }
      })
      .catch(err => {
        loadingText.className = 'error-text';
        loadingText.textContent = `Error generating image: ${err.message}`;
        console.error('ImageGenerator error:', err);
      });

    // 清理
    return () => container.remove();
  }
};
