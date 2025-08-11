export const RatingSlider = {
  name: 'RatingSlider',
  type: 'response',
  match: ({ trace }) =>
    trace.type === 'rating_slider' || trace.payload?.name === 'rating_slider',

  render: ({ trace, element }) => {
    try {
      let { options, submitEvent } = trace.payload;

      if (!options || !submitEvent) {
        throw new Error("Missing required parameters");
      }

      let raw = typeof options === 'string'
        ? options.trim().replace(/^[‘’“”"'`]+|[‘’“”"'`]+$/g, '')
        : options;

      let mapping;
      try {
        if (typeof raw === 'string') {
          let parsed = JSON.parse(raw);
          if (typeof parsed === 'string') parsed = JSON.parse(parsed);
          mapping = parsed;
        } else if (typeof raw === 'object') {
          mapping = raw;
        } else {
          throw new Error();
        }
      } catch {
        throw new Error("Options must be a valid JSON string or object");
      }

      const optionKeys = Object.keys(mapping);
      if (optionKeys.length === 0) {
        throw new Error("No options found in payload");
      }

      const container = document.createElement('div');
      container.className = 'rating-slider-container';

      const style = document.createElement('style');
      style.textContent = `
        .rating-slider-container {
          width: 100%;
          padding: 0.2rem 0.5rem;
          box-sizing: border-box;
          font-family: -apple-system, sans-serif;
          font-size: 0.9em;
        }
        
        .option-row {
          display: flex;
          flex-direction: column;
          margin: 0.8rem 0;
          width: 100%;
        }
        
        .option-label {
          font-weight: 500;
          color: #333;
          margin-bottom: 0.2rem;
          word-break: break-word;
          font-size: 0.9em;
        }
        
        .slider-container {
          position: relative;
          width: 100%;
        }
        
        .scale-labels {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
          font-size: 0.9em;
          color: #666;
        }
        
        input[type="range"] {
          -webkit-appearance: none;
          width: 100%;
          height: 3px;
          background: #ddd;
          border-radius: 2px;
          outline: none;
          margin: 0;
        }
        
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          background: #007AFF;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .value-display {
          text-align: center;
          font-weight: 400;
          color: #007AFF;
          font-size: 0.9em;
          margin-top: 0.2rem;
        }
        
        .other-input {
          margin-top: 0.3rem;
          padding: 0.2rem 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          width: 100%;
          display: none;
          box-sizing: border-box;
          font-size: 0.9em;
        }
        
        .submit-btn {
          display: block;
          margin: 1rem auto 0.5rem;
          padding: 0.4rem 1.2rem;
          background: linear-gradient(135deg, #007AFF, #0063CC);
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 0.9em;
          cursor: pointer;
        }
        
        .submit-btn:disabled {
          background: #999;
          cursor: not-allowed;
        }
        
        @media (max-width: 600px) {
          .option-label, .other-input, .value-display {
            font-size: 0.9em;
          }
        }
      `;
      container.appendChild(style);

      const findNearestIndex = (val, positions) => {
        return positions.reduce((prevIdx, curr, idx) => {
          return Math.abs(curr - val) < Math.abs(positions[prevIdx] - val) ? idx : prevIdx;
        }, 0);
      };

      optionKeys.forEach(option => {
        const maxVal = parseInt(mapping[option], 10);
        const labels = Array.from({ length: maxVal + 1 }, (_, i) => i);
        const positions = labels.map((_, i) => Math.round((i / (labels.length - 1)) * 100));

        const row = document.createElement('div');
        row.className = 'option-row';

        const labelEl = document.createElement('div');
        labelEl.className = 'option-label';
        labelEl.textContent = option;

        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'slider-container';

        const scaleLabels = document.createElement('div');
        scaleLabels.className = 'scale-labels';
        scaleLabels.innerHTML = `<span>${labels[0]}</span><span>${labels[labels.length - 1]}</span>`;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = 0;
        slider.max = 100;
        slider.value = 0;

        const valueDisplay = document.createElement('div');
        valueDisplay.className = 'value-display';

        const otherInput = document.createElement('input');
        otherInput.type = 'text';
        otherInput.placeholder = 'Pleass type your answer';
        otherInput.className = 'other-input';

        const updateDisplay = val => {
          const valInt = parseInt(val, 10);
          const idx = findNearestIndex(valInt, positions);
          const mappedVal = labels[idx];
          valueDisplay.textContent = mappedVal;
          slider.value = positions[idx];

          if (option.trim().toLowerCase() === 'other' && mappedVal > 0) {
            otherInput.style.display = 'block';
          } else {
            otherInput.style.display = 'none';
          }
        };

        slider.addEventListener('input', e => updateDisplay(e.target.value));
        updateDisplay(slider.value);

        sliderContainer.appendChild(scaleLabels);
        sliderContainer.appendChild(slider);
        sliderContainer.appendChild(valueDisplay);
        sliderContainer.appendChild(otherInput);
        row.appendChild(labelEl);
        row.appendChild(sliderContainer);
        container.appendChild(row);
      });

      const submitButton = document.createElement('button');
      submitButton.className = 'submit-btn';
      submitButton.textContent = 'Submit';

      // submitButton.onclick = e => {
      //   e.preventDefault();
      //   const results = Array.from(container.querySelectorAll('.option-row')).map(row => {
      //     const opt = row.querySelector('.option-label').textContent;
      //     const slider = row.querySelector('input[type="range"]');
      //     const val = parseInt(slider.value, 10);

      //     const scaleLabels = Array.from({ length: parseInt(mapping[opt], 10) + 1 }, (_, i) => i);
      //     const positions = scaleLabels.map((_, i) => Math.round((i / (scaleLabels.length - 1)) * 100));
      //     const idx = findNearestIndex(val, positions);
      //     const actualValue = scaleLabels[idx];

      //     const entry = { option: opt, score: actualValue };
      //     if (opt.trim().toLowerCase() === 'other' && actualValue > 0) {
      //       entry.detail = row.querySelector('.other-input').value || '';
      //     }
      //     return entry;
      //   });
      submitButton.onclick = e => {
        e.preventDefault();
        // Validation: if "Other" is selected (score > 0), require input
        const rows = container.querySelectorAll('.option-row');
        for (const row of rows) {
          const opt = row.querySelector('.option-label').textContent.trim().toLowerCase();
          if (opt === 'other') {
            const slider = row.querySelector('input[type="range"]');
            const rawVal = parseInt(slider.value, 10);
            const max = parseInt(mapping[row.querySelector('.option-label').textContent], 10);
            const scaleLabels = Array.from({ length: max + 1 }, (_, i) => i);
            const positions = scaleLabels.map((_, i) => Math.round((i / (scaleLabels.length - 1)) * 100));
            const idx = findNearestIndex(rawVal, positions);
            const actualValue = scaleLabels[idx];
            if (actualValue > 0) {
              const otherInputField = row.querySelector('.other-input');
              if (!otherInputField.value.trim()) {
                alert('Please provide a response for "Other".');
                otherInputField.focus();
                return;
              }
            }
          }
        }

        // Gather results
        const results = Array.from(rows).map(row => {
          const opt = row.querySelector('.option-label').textContent;
          const slider = row.querySelector('input[type="range"]');
          const val = parseInt(slider.value, 10);
          const scaleLabels = Array.from({ length: parseInt(mapping[opt], 10) + 1 }, (_, i) => i);
          const positions = scaleLabels.map((_, i) => Math.round((i / (scaleLabels.length - 1)) * 100));
          const idx = findNearestIndex(val, positions);
          const actualValue = scaleLabels[idx];
          const entry = { option: opt, score: actualValue };
          if (opt.trim().toLowerCase() === 'other' && actualValue > 0) {
            entry.detail = row.querySelector('.other-input').value;
          }
          return entry;
        });

        window.voiceflow.chat.interact({
          type: submitEvent,
          payload: { result: results, confirmation: 'Options submitted successfully' }
        });

        container.querySelectorAll('input, button').forEach(el => el.disabled = true);
        submitButton.textContent = 'Submitted';
      };

      container.appendChild(submitButton);
      element.appendChild(container);
      return () => container.remove();
    } catch (error) {
      console.error("RatingSlider Error:", error.message);
      const errorDiv = document.createElement('div');
      errorDiv.style.color = 'red';
      errorDiv.textContent = `评分组件加载失败: ${error.message}`;
      element.appendChild(errorDiv);
    }
  }
};


