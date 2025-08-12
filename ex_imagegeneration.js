export const ImageGenerator = {
  name: 'ImageGenerator',
  type: 'response',
  match: ({ trace }) =>
    trace.type === 'image_generation' || trace.payload?.name === 'image_generation',

  render: ({ trace, element }) => {
    try {
      // 解构所需的参数，包括 submitEvent
      let { prompt, apiKey, openaiModel, submitEvent } = trace.payload;

      if (!prompt || !apiKey || !openaiModel || !submitEvent) {
        throw new Error("Missing required input variables: prompt, apiKey, openaiModel, or submitEvent");
      }

      // 创建容器
      const container = document.createElement('div');
      container.className = 'image-generator-container';

      // 样式定义
      const style = document.createElement('style');
      style.textContent = `
        .image-generator-container {
          width: auto;
          max-width: 100%;
          margin: 1rem auto;
          text-align: center;
        }
        .image-generator-container img {
          width: 100%;
          height: auto;
          display: block;
          margin: 0 auto;
        }
        .loading-text {
          font-size: 1rem;
          color: #555;
          margin: 1rem 0;
        }
      `;
      container.appendChild(style);
      element.appendChild(container);

      // 显示加载提示
      const loadingText = document.createElement('div');
      loadingText.className = 'loading-text';
      loadingText.textContent = 'Generating image...';
      container.appendChild(loadingText);

      // 调用 OpenAI API 接口生成图片
      fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          prompt: prompt,
          n: 1,
          size: "1024x1024",
          model: openaiModel
        })
      })
        .then(response => {
          if (!response.ok) {
            throw new Error("Failed to generate image");
          }
          return response.json();
        })
        .then(data => {
          if (data && data.data && data.data[0] && data.data[0].url) {
            const imageUrl = data.data[0].url;
            // 移除加载提示
            loadingText.remove();
            // 创建并展示图片
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = prompt;
            container.appendChild(img);

            // 在展示图片后，通过 submitEvent 返回交互事件
            window.voiceflow.chat.interact({
              type: submitEvent,
              payload: {
                confirmation: 'Options submitted successfully'
              }
            });
          } else {
            throw new Error("Image URL not found in response");
          }
        })
        .catch(error => {
          loadingText.textContent = 'Error generating image.';
          console.error("ImageGenerator Component Error:", error.message);
        });

      // 清理工作
      return () => {
        container.remove();
      };

    } catch (error) {
      console.error("ImageGenerator Component Error:", error.message);
    }
  }
};
