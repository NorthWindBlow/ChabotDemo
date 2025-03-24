export const SortableList = {
  name: 'SortableList',
  type: 'response',
  match: ({ trace }) =>
    trace.type === 'sortable_list' || trace.payload.name === 'sortable_list',

  render: ({ trace, element }) => {
    try {
      let { options, submitEvent, requiredCount, allowMore } = trace.payload;
      if (!Array.isArray(options) || options.length === 0 || !submitEvent) {
        throw new Error(
          "Missing required input variables: options (non-empty array) or submitEvent"
        );
      }
      // 过滤掉 "None" 元素
      options = options.filter(item => item !== "None");

      // 设置默认值：
      // 如果未传 requiredCount，则默认为所有选项数（即原有行为）
      if (typeof requiredCount !== 'number' || requiredCount < 1) {
        requiredCount = options.length;
      }
      // 默认 allowMore 为 false，即必须正好选择 requiredCount 个选项
      if (typeof allowMore !== 'boolean') {
        allowMore = false;
      }

      // 状态数据：
      // 固定模式：目标区域槽位数固定为 requiredCount
      // 动态模式：目标区域初始为空，但要求至少选择 requiredCount 个
      let sourceItems = [...options];
      let targetSlots = null;
      let targetItems = null;
      if (!allowMore) {
        targetSlots = new Array(requiredCount).fill(null);
      } else {
        targetItems = [];
      }

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
          position: relative;
        }
        /* 固定模式下的占位框 */
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
        /* 按钮样式 */
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
        /* 来源区域中间的提示文字 */
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
      `;
      container.appendChild(style);

      // 创建 form 元素，构建两个区域：目标区域和来源区域
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

      // 渲染目标区域
      function renderTarget() {
        targetContainer.innerHTML = "";
        if (!allowMore) {
          // 固定模式：显示固定数量的槽位
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
              btn.addEventListener("dragover", handleTargetDragOver);
              btn.addEventListener("dragleave", handleDragLeave);
              btn.addEventListener("drop", handleTargetDrop);
              targetContainer.appendChild(btn);
            }
          });
        } else {
          // 动态模式：目标区域初始为空，但可以添加任意数量选项
          targetItems.forEach((item, index) => {
            const btn = document.createElement("div");
            btn.className = "option-btn";
            btn.textContent = item;
            btn.draggable = true;
            btn.dataset.targetIndex = index;
            btn.addEventListener("dragstart", handleDragStart);
            btn.addEventListener("dragend", handleDragEnd);
            btn.addEventListener("dragover", handleTargetItemDragOver);
            btn.addEventListener("dragleave", handleDragLeave);
            btn.addEventListener("drop", handleTargetItemDrop);
            targetContainer.appendChild(btn);
          });
          // 为目标容器添加整体拖拽监听，实现空白处的插入
          targetContainer.addEventListener("dragover", handleTargetContainerDragOver);
          targetContainer.addEventListener("dragleave", handleDragLeave);
          targetContainer.addEventListener("drop", handleTargetContainerDrop);
        }
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
        const isTarget = this.dataset.slotIndex !== undefined || this.dataset.targetIndex !== undefined;
        draggedData = {
          item: this.textContent,
          origin: isSource ? "source" : "target",
          index: isSource
            ? parseInt(this.dataset.sourceIndex)
            : (this.dataset.slotIndex !== undefined
                ? parseInt(this.dataset.slotIndex)
                : parseInt(this.dataset.targetIndex)),
          element: this
        };
        this.classList.add("dragging");
      }

      function handleDragEnd(e) {
        if (draggedData && draggedData.element) {
          draggedData.element.classList.remove("dragging");
        }
        draggedData = null;
      }

      // 固定模式目标区域拖拽事件
      function handleTargetDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add("drop-indicator");
      }
      function handleTargetDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove("drop-indicator");
        if (!draggedData) return;
        const dropIndex = parseInt(e.currentTarget.dataset.slotIndex);
        // 只允许放置到空槽位上
        if (targetSlots[dropIndex] === null) {
          if (draggedData.origin === "source") {
            sourceItems.splice(draggedData.index, 1);
          } else if (draggedData.origin === "target") {
            if (dropIndex !== draggedData.index) {
              targetSlots[draggedData.index] = null;
            }
          }
          targetSlots[dropIndex] = draggedData.item;
          renderTarget();
          renderSource();
        }
      }

      // 动态模式目标区域：在各个按钮上实现拖拽重新排序
      function handleTargetItemDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add("drop-indicator");
      }
      function handleTargetItemDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove("drop-indicator");
        if (!draggedData) return;
        const dropIndex = parseInt(e.currentTarget.dataset.targetIndex);
        if (draggedData.origin === "source") {
          sourceItems.splice(draggedData.index, 1);
        } else if (draggedData.origin === "target") {
          if (dropIndex !== draggedData.index) {
            targetItems.splice(draggedData.index, 1);
          } else {
            return;
          }
        }
        targetItems.splice(dropIndex, 0, draggedData.item);
        renderTarget();
        renderSource();
      }

      // 动态模式目标容器整体拖拽事件（用于在空白处或末尾插入）
      function handleTargetContainerDragOver(e) {
        e.preventDefault();
        targetContainer.classList.add("drop-indicator");
      }
      function handleTargetContainerDrop(e) {
        e.preventDefault();
        targetContainer.classList.remove("drop-indicator");
        if (!draggedData) return;
        let children = Array.from(targetContainer.querySelectorAll('.option-btn'));
        let insertIndex = targetItems.length; // 默认插入末尾
        for (let i = 0; i < children.length; i++) {
          const childRect = children[i].getBoundingClientRect();
          if (e.clientX < childRect.left + childRect.width / 2) {
            insertIndex = i;
            break;
          }
        }
        if (draggedData.origin === "source") {
          sourceItems.splice(draggedData.index, 1);
        } else if (draggedData.origin === "target") {
          targetItems.splice(draggedData.index, 1);
        }
        targetItems.splice(insertIndex, 0, draggedData.item);
        renderTarget();
        renderSource();
      }

      // 来源区域拖拽：允许在来源区域内重新排序或从目标区域拖回
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
          if (allowMore) {
            targetItems.splice(draggedData.index, 1);
          } else {
            targetSlots[draggedData.index] = null;
          }
        } else if (draggedData.origin === "source") {
          sourceItems.splice(draggedData.index, 1);
        }
        sourceItems.splice(insertIndex, 0, draggedData.item);
        renderSource();
        renderTarget();
      });

      // 提交处理：检查目标区域中是否满足要求
      const handleSubmit = (e) => {
        e.preventDefault();
        if (!allowMore) {
          if (targetSlots.some(item => item === null)) {
            alert("Please fill in all the placeholders before submitting!");
            return;
          }
        } else {
          if (targetItems.length < requiredCount) {
            alert(`Please select at least ${requiredCount} option${requiredCount > 1 ? 's' : ''} before submitting!`);
            return;
          }
        }
        // 提交后禁用所有控件
        submitButton.disabled = true;
        submitButton.textContent = "Submitted";
        container.classList.add("submitted");

        const sortedOptions = !allowMore
          ? targetSlots.concat(sourceItems)
          : targetItems.concat(sourceItems);
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

