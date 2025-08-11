export const MultipleChoice = {
  name: 'MultipleChoice',
  type: 'response',
  match: ({ trace }) =>
    trace.type === 'multiple_choice' || trace.payload?.name === 'multiple_choice',

  render: ({ trace, element }) => {
    try {
      let { options: rawOptions, selectionLimit = 999, submitEvent } = trace.payload;

      function parseOptions(rawOptions) {
        if (Array.isArray(rawOptions)) {
          return rawOptions;
        }
        if (typeof rawOptions !== 'string') {
          throw new Error(`options must be an Array or string, but got ${typeof rawOptions}`);
        }
      
        let s = rawOptions.trim();
        if (/^['"`‘’“”`].*['"`‘’“”`]$/.test(s)) {
          s = s.slice(1, -1).trim();
        }
      
        s = s
          .replace(/[\u201C\u201D\u201F\uFF02]/g, '"')
          .replace(/[\u2018\u2019\u201A\u201B\uFF07]/g, "'");
      
        s = s.replace(/'([^']*)'/g, '"$1"');
      
        let parsed;
        try {
          parsed = JSON.parse(s);
        } catch (err1) {
          throw new Error(`Invalid JSON for options after normalization: ${err1.message}`);
        }
      
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch (err2) {
            throw new Error(`Invalid JSON for options on second pass: ${err2.message}`);
          }
        }
      
        if (!Array.isArray(parsed)) {
          throw new Error(`Parsed options is not an array: ${typeof parsed}`);
        }
      
        return parsed;
      }

      let options = parseOptions(rawOptions);

      if (!Array.isArray(options) || options.length === 0 || !submitEvent) {
        throw new Error("Missing required input variables: options (non-empty array) or submitEvent");
      }

      options = options.filter(item => item !== "None");

      const container = document.createElement('div');
      container.className = 'multiple-choice-container';

      const style = document.createElement('style');
      style.textContent = `
        .multiple-choice-container {
          display: flex;
          flex-direction: column;
          gap: 6px;              /* 更紧凑的行间距 */
          font-family: sans-serif;
          font-size: 0.9rem;   /* 略小字体 */
        }
        .options-flow {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;              /* 选项间距更小 */
          padding: 6px;
        }
        .option {
          padding: 0.2rem 0.6rem; /* 更小的内边距 */
          border: 1px solid #d2d2d7;
          border-radius: 6px;
          cursor: pointer;
          transition: 0.2s;
          max-width: 100%;
          min-width: 0;
        }
        .option.selected { background: #007AFF; border-color: #007AFF; color: #fff; }
        .option-text { white-space: normal; word-wrap: break-word; line-height: 1.2; }
        .mc-form button[type="submit"] {
          padding: 0.2rem 0.6rem;
          border-radius: 6px;
          font-size: 0.9rem;
          white-space: normal;
          word-wrap: break-word;
        }
        .mc-form button[type="submit"]:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }
        .other-input input { font-size: 0.9rem; padding: 0.2rem; margin-top: 4px; }
        .submitted { pointer-events: none; opacity: 0.7; }
      `;
      container.appendChild(style);
      element.appendChild(container);

      const form = document.createElement('form');
      form.className = 'mc-form';
      container.appendChild(form);

      const flowContainer = document.createElement('div');
      flowContainer.className = 'options-flow';
      form.appendChild(flowContainer);

      const updateCheckboxState = () => {
        const checkboxes = Array.from(form.querySelectorAll('input[name="option"]'));
        const checkedCount = checkboxes.filter(cb => cb.checked).length;
        checkboxes.forEach(cb => {
          cb.disabled = !cb.checked && checkedCount >= selectionLimit;
        });
      };

      options.forEach(option => {
        const label = document.createElement('label');
        label.className = 'option';
        label.innerHTML = `
          <input type="checkbox" name="option" value="${option}">
          <span class="option-text">${option}</span>
        `;
        const input = label.querySelector('input');
        input.addEventListener('change', () => {
          label.classList.toggle('selected', input.checked);
          updateCheckboxState();
        });
        flowContainer.appendChild(label);
      });

      const hasOtherOption = options.includes("Other");
      let otherInputContainer = null;
      if (hasOtherOption) {
        otherInputContainer = document.createElement('div');
        otherInputContainer.className = 'other-input';
        otherInputContainer.innerHTML = `
          <input type="text" id="other-option" placeholder="Please type your answer">
        `;
        form.appendChild(otherInputContainer);
        const otherCheckbox = form.querySelector('input[value="Other"]');
        otherInputContainer.style.display = otherCheckbox.checked ? 'block' : 'none';
        otherCheckbox.addEventListener('change', () => {
          otherInputContainer.style.display = otherCheckbox.checked ? 'block' : 'none';
          updateCheckboxState();
        });
      }

      const submitButton = document.createElement('button');
      submitButton.type = 'submit';
      submitButton.textContent = 'Submit';
      form.appendChild(submitButton);

      const submitHandler = event => {
        event.preventDefault();

        let selectedOptions = Array.from(form.querySelectorAll('input[name="option"]:checked'))
          .map(cb => cb.value);

        if (hasOtherOption && selectedOptions.includes("Other")) {
          const otherValue = form.querySelector('#other-option').value.trim();
          selectedOptions = selectedOptions.filter(v => v !== "Other");
          if (otherValue) selectedOptions.push(`Other: ${otherValue}`);
        }

        if (!selectedOptions.length) {
          alert('Please select at least one option.');
          return;
        }

        form.querySelectorAll('input, button').forEach(el => el.disabled = true);
        submitButton.textContent = 'Submitted';
        container.classList.add('submitted');

        window.voiceflow.chat.interact({
          type: submitEvent,
          payload: { result: selectedOptions, confirmation: 'Options submitted successfully' }
        });
      };

      form.addEventListener('submit', submitHandler);

      return () => {
        form.removeEventListener('submit', submitHandler);
        container.remove();
      };

    } catch (error) {
      console.error('MultipleChoice Component Error:', error.message);
    }
  }
};
