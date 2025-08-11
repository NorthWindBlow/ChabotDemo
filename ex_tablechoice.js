export const TableChoice = {
  name: 'TableChoice',
  type: 'response',
  match: ({ trace }) =>
    trace.type === 'table_choice' || trace.payload?.name === 'table_choice',
  
  render: ({ trace, element }) => {
    try {
      let { options, submitEvent } = trace.payload;

      if (!options || !submitEvent) {
        throw new Error(
          `Missing required parameter${!options ? ' options' : ''}${
            !options && !submitEvent ? ' and' : ''
          }${!submitEvent ? ' submitEvent' : ''}`
        );
      }

      // 去除首尾引号与空白，并解析 JSON（支持双重编码）
      let raw = options;
      if (typeof raw === 'string') {
        raw = raw.trim().replace(/^[‘’“”"'`]+|[‘’“”"'`]+$/g, '');
        try {
          let parsed = JSON.parse(raw);
          if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed);
          }
          raw = parsed;
        } catch {
          throw new Error("Options must be a valid JSON string");
        }
      }
      if (typeof raw !== 'object' || !raw.Row || !raw.Column) {
        throw new Error("Options must be an object with Row and Column arrays");
      }

      const rows = raw.Row;
      const cols = raw.Column;

      // 创建容器与样式
      const container = document.createElement('div');
      container.className = 'table-choice-container';
      const style = document.createElement('style');
      style.textContent = `
        .table-choice-container { overflow-x: auto; padding: 1rem; font-family: -apple-system, sans-serif; }
        table.table-choice { border-collapse: collapse; width: 100%; }
        table.table-choice th, table.table-choice td { border: 1px solid #ddd; padding: 0.5rem; text-align: center; }
        table.table-choice th { background: #f5f5f5; font-weight: 500; }
        table.table-choice td { cursor: pointer; transition: background-color 0.2s; }
        table.table-choice td.selected { background: #007AFF; color: #fff; }
        .submit-btn { margin-top: 1rem; padding: 0.5rem 1.5rem; background: linear-gradient(135deg, #007AFF, #0063CC); color: #fff; border: none; border-radius: 8px; cursor: pointer; }
        .submit-btn:disabled { background: #999; cursor: not-allowed; }
      `;
      container.appendChild(style);

      // 构建表格
      const table = document.createElement('table');
      table.className = 'table-choice';

      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      headRow.appendChild(document.createElement('th')); // 顶角空白格
      cols.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      // 创建每一行
      rows.forEach(rowLabel => {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = rowLabel;
        tr.appendChild(th);

        cols.forEach(colLabel => {
          const td = document.createElement('td');
          td.dataset.row = rowLabel;
          td.dataset.col = colLabel;
          td.addEventListener('click', () => {
            td.classList.toggle('selected');
          });
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      container.appendChild(table);

      // 提交按钮
      const submitBtn = document.createElement('button');
      submitBtn.className = 'submit-btn';
      submitBtn.textContent = 'Submit';
      submitBtn.onclick = e => {
        e.preventDefault();
        // 构造结果映射
        const result = {};
        rows.forEach(r => result[r] = []);
        container.querySelectorAll('td.selected').forEach(cell => {
          const r = cell.dataset.row;
          const c = cell.dataset.col;
          result[r].push(c);
        });
        // 发送结果
        window.voiceflow.chat.interact({
          type: submitEvent,
          payload: { result: result, confirmation: 'TableChoice submitted successfully' }
        });
        // 禁用交互
        container.querySelectorAll('td, button').forEach(el => el.disabled = true);
        submitBtn.textContent = 'Submitted';
        submitBtn.disabled = true;
      };
      container.appendChild(submitBtn);

      element.appendChild(container);
      return () => container.remove();

    } catch (error) {
      console.error("TableChoice Error:", error.message);
      const errDiv = document.createElement('div');
      errDiv.style.color = 'red';
      errDiv.textContent = `TableChoice 加载失败: ${error.message}`;
      element.appendChild(errDiv);
    }
  }
};
