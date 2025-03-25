export const SortableList = {
  name: 'SortableList',
  type: 'response',
  match: ({ trace }) =>
    trace.type === 'sortable_list' || trace.payload.name === 'sortable_list',

  render: ({ trace, element }) => {
    try {
      let { options, submitEvent } = trace.payload;
      if (!Array.isArray(options) || options.length === 0 || !submitEvent) {
        throw new Error(
          "Missing required input variables: options (non-empty array) or submitEvent"
        );
      }
      // 过滤掉 "None" 元素
      options = options.filter(item => item !== "None");

      // 状态数据：目标区域槽位数固定，与 options 数量一致；初始时均为空，
      // 来源区域保存所有选项
      const totalSlots = options.length;
      let targetSlots = new Array(totalSlots).fill(null);
      let sourceItems = [...options];

      // 创建整体容器和样式
      const container = document.createElement("div");
      container.className = "sortable-container";

      const style = document.createElement("style");
      style.textContent = `
        .sortable-container {
          width: 100%;
          margin: 1rem auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-family: sans-serif;
        }
        .target-container, .source-container {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          justify-content: center;
          align-items: center;
          min-height: 100px;
          border: 1px solid #ccc;
          padding: 10px;
          border-radius: 8px;
        }
        /* 为source-container添加相对定位以便伪元素定位 */
        .source-container {
          position: relative;
          border: none;
        }
        /* 在source-container中间显示透明文字 */
        .source-container::before {
          content: "Please drag this area button to the above area";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: rgba(0, 0, 0, 0.3);
          font-size: 1.5rem;
          pointer-events: none;
          z-index: 0;
          white-space: normal;
          text-align: center;
          width: 90%;
        }
        /* 虚线占位框：居中显示 data-index，字体放大 */
        .placeholder {
          width: 100px;
          height: 35px;
          border: 2px dashed #007AFF;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .placeholder::before {
          content: attr(data-index);
          font-weight: bold;
          opacity: 0.3;
          font-size: 1.5rem;
        }
        /* 选项按钮样式 */
        .option-btn {
          width: fit-content;
          padding: 0.5rem 1.5rem;
          margin: 0 auto;
          background: #007AFF;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: move;
          user-select: none;
          white-space: nowrap;
          min-width: 80px;
          text-align: center;
          z-index: 1;
        }
        .dragging {
          opacity: 0.5;
        }
        .drop-indicator {
          outline: 2px dashed #FF4500;
        }
        .submit-btn {
          background: linear-gradient(135deg, #007AFF, #0063CC);
          color: white;
          width: fit-content;
          border: none;
          padding: 0.5rem 1.5rem;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: block;
          margin: 0 auto;
        }
        .submit-btn:disabled {
          background: #808080;
          cursor: not-allowed;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,122,255,0.3);
        }
        /* 提交后禁用所有控件 */
        .submitted {
          pointer-events: none;
          opacity: 0.8;
        }
      `;
      container.appendChild(style);

      // 创建 form 元素，并构建两个区域
      const formElement = document.createElement("form");
      const targetContainer = document.createElement("div");
      targetContainer.className = "target-container";
      const sourceContainer = document.createElement("div");
      sourceContainer.className = "source-container";

      formElement.appendChild(targetContainer);
      formElement.appendChild(sourceContainer);

      // 提交按钮
      const submitButton = document.createElement("button");
      submitButton.type = "submit";
      submitButton.className = "submit-btn";
      submitButton.textContent = "Submit";
      formElement.appendChild(submitButton);

      container.appendChild(formElement);
      element.appendChild(container);

      // 用于记录当前拖拽数据
      let draggedData = null;

      // 渲染目标区域：空槽位显示虚线占位框，已填槽显示按钮
      function renderTarget() {
        targetContainer.innerHTML = "";
        targetSlots.forEach((item, index) => {
          if (item === null) {
            const placeholder = document.createElement("div");
            placeholder.className = "placeholder";
            placeholder.setAttribute("data-index", index + 1);
            placeholder.dataset.slotIndex = index;
            placeholder.addEventListener("dragover", handleTargetDragOver);
            placeholder.addEventListener("dragleave", handleDragLeave);
            placeholder.addEventListener("drop", handleTargetDrop);
            targetContainer.appendChild(placeholder);
          } else {
            const btn = document.createElement("div");
            btn.className = "option-btn";
            btn.textContent = item;
            btn.draggable = true;
            btn.dataset.slotIndex = index;
            btn.addEventListener("dragstart", handleDragStart);
            btn.addEventListener("dragend", handleDragEnd);
            // 同样允许在按钮上拖拽以便在目标区域内重新排序
            btn.addEventListener("dragover", handleTargetDragOver);
            btn.addEventListener("dragleave", handleDragLeave);
            btn.addEventListener("drop", handleTargetDrop);
            targetContainer.appendChild(btn);
          }
        });
      }

      // 渲染来源区域
      function renderSource() {
        sourceContainer.innerHTML = "";
        sourceItems.forEach((item, index) => {
          const btn = document.createElement("div");
          btn.className = "option-btn";
          btn.textContent = item;
          btn.draggable = true;
          btn.dataset.sourceIndex = index;
          btn.addEventListener("dragstart", handleDragStart);
          btn.addEventListener("dragend", handleDragEnd);
          sourceContainer.appendChild(btn);
        });
      }

      renderTarget();
      renderSource();

      // 拖拽开始：记录拖拽项、来源及索引，添加拖拽样式
      function handleDragStart(e) {
        const isSource = this.dataset.sourceIndex !== undefined;
        const isTarget = this.dataset.slotIndex !== undefined;
        draggedData = {
          item: this.textContent,
          origin: isSource ? "source" : "target",
          index: isSource ? parseInt(this.dataset.sourceIndex) : parseInt(this.dataset.slotIndex),
          element: this
        };
        this.classList.add("dragging");
        // 注意：对于目标区域的按钮，不再拖拽时立即清空槽位，
        // drop 时再更新状态，这样拖拽过程中按钮不会自动消失
      }

      function handleDragEnd(e) {
        if (draggedData && draggedData.element) {
          draggedData.element.classList.remove("dragging");
        }
        draggedData = null;
      }

      // 目标区域拖拽时添加视觉提示
      function handleTargetDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add("drop-indicator");
      }
      function handleDragLeave(e) {
        e.currentTarget.classList.remove("drop-indicator");
      }

      // 目标区域 drop：只接受空槽位
      function handleTargetDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove("drop-indicator");
        if (!draggedData) return;
        const dropIndex = parseInt(e.currentTarget.dataset.slotIndex);
        // 只允许放置到空槽位上
        if (targetSlots[dropIndex] === null) {
          if (draggedData.origin === "source") {
            // 从来源区域拖入：删除对应项
            sourceItems.splice(draggedData.index, 1);
          } else if (draggedData.origin === "target") {
            // 如果是目标区域内重新排序，若放到非原位置则清空原槽位
            if (dropIndex !== draggedData.index) {
              targetSlots[draggedData.index] = null;
            }
          }
          targetSlots[dropIndex] = draggedData.item;
          renderTarget();
          renderSource();
        }
      }

      // 来源区域拖拽：允许按钮在来源区域内重新排序或从目标区域拖回
      sourceContainer.addEventListener("dragover", (e) => {
        e.preventDefault();
        sourceContainer.classList.add("drop-indicator");
      });
      sourceContainer.addEventListener("dragleave", (e) => {
        sourceContainer.classList.remove("drop-indicator");
      });
      sourceContainer.addEventListener("drop", (e) => {
        e.preventDefault();
        sourceContainer.classList.remove("drop-indicator");
        if (!draggedData) return;
        // 根据鼠标位置确定插入的位置，实现磁吸效果
        const rect = sourceContainer.getBoundingClientRect();
        let insertIndex = sourceContainer.children.length;
        for (let i = 0; i < sourceContainer.children.length; i++) {
          const childRect = sourceContainer.children[i].getBoundingClientRect();
          if (e.clientX < childRect.left + childRect.width / 2) {
            insertIndex = i;
            break;
          }
        }
        if (draggedData.origin === "target") {
          // 从目标区域拖出时，清空原槽位
          targetSlots[draggedData.index] = null;
        } else if (draggedData.origin === "source") {
          sourceItems.splice(draggedData.index, 1);
        }
        sourceItems.splice(insertIndex, 0, draggedData.item);
        renderSource();
        renderTarget();
      });

      // 提交处理：检查所有目标槽位是否都已填满，若不全填满则提示，不允许提交
      const handleSubmit = (e) => {
        e.preventDefault();
        
        // 提交后禁用所有控件
        submitButton.disabled = true;
        submitButton.textContent = "Submitted";
        container.classList.add("submitted");

        const sortedOptions = targetSlots.concat(sourceItems);
        window.voiceflow.chat.interact({
          type: submitEvent,
          payload: {
            sortedOptions,
            confirmation: "Order submitted successfully"
          }
        });
      };

      formElement.addEventListener("submit", handleSubmit);

      // 返回清理函数
      return () => {
        formElement.removeEventListener("submit", handleSubmit);
        container.remove();
      };

    } catch (error) {
      console.error("SortableList Component Error:", error.message);
    }
  }
};

