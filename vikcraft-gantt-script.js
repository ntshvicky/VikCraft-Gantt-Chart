/**
 * VikCraftGantt - A vanilla JavaScript Gantt Chart Library
 */
class VikCraftGantt {
    constructor(containerId, tasks, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error("Gantt chart container not found!");
            return;
        }

        // --- Core Properties ---
        this.rawTasks = tasks;
        this.options = {
            features: { zoom: true, viewModes: true, columnResize: true },
            ...options
        };
        
        // NEW: Allow user-defined columns, with a default fallback
        this.columnData = this.options.columns || [
            { id: 'name', text: 'Task Name', flex: '1 1 220px', type: 'text' },
            { id: 'start', text: 'Start Date', flex: '0 0 90px', type: 'date' },
            { id: 'end', text: 'End Date', flex: '0 0 90px', type: 'date' },
            { id: 'assignedUser', text: 'Assignees', flex: '0 0 120px', type: 'multiselect', optionsSource: 'resources' }
        ];
        
        this.tasks = this.processTasks(this.rawTasks);
        
        // --- View & Sizing ---
        this.viewMode = 'day';
        this.dayWidth = 50;
        this.rowHeight = 40;

        // --- Drag State ---
        this.isDragging = false;
        this.isResizing = false;
        this.isResizingPanel = false;
        this.isResizingColumn = false;

        this.createEditModal();
        this.setupModalEventListeners();
        this.render();

        this.setTheme(this.options.theme);

    }

    render() {
        this.calculateDateRange();
        this.createLayout();
        this.renderGrid();
        this.renderTimeline();
        this.renderBars();
        this.renderDependencies();
        this.setupEventListeners();
        this.updateGridLines();
    }

    createLayout() {
        this.container.innerHTML = '';
        this.container.classList.add('vikcraft-gantt-container'); // Renamed class

        const icons = { zoomIn: `➕`, zoomOut: `➖`, zoomFit: `⛶`, day: `D`, week: `W`, month: `M` };

        this.gridContainer = this.createDiv('gantt-grid-container');
        this.resizer = this.createDiv('gantt-resizer');
        this.chartContainer = this.createDiv('gantt-chart-container');
        
        // --- Left Side Headers ---
        const gridHeaderContainer = this.createDiv('gantt-header'); // Top header for Task List title
        gridHeaderContainer.innerHTML = `<div class="gantt-header-title">Task List</div><button id="add-task-btn" class="btn-add-task">+ Add Task</button>`;
        
        const gridColumnHeader = this.createDiv('gantt-grid-header'); // Second header for column titles
        this.columnData.forEach((col, index) => {
            const cell = this.createDiv(`gantt-grid-cell ${col.id}`, col.text);
            cell.style.flex = col.flex;
            if (this.options.features.columnResize && index < this.columnData.length - 1) {
                const resizer = this.createDiv('gantt-header-resizer');
                resizer.dataset.columnIndex = index;
                cell.appendChild(resizer);
            }
            gridColumnHeader.appendChild(cell);
        });
        
        this.gridBody = this.createDiv('gantt-grid-body');
        this.gridContainer.append(gridHeaderContainer, gridColumnHeader, this.gridBody);

        // --- Right Side Headers ---
        const chartHeaderContainer = this.createDiv('gantt-header'); // Top header for Timeline title
        chartHeaderContainer.innerHTML = `<div class="gantt-header-title">Timeline</div>`;

        this.timelineHeader = this.createDiv('gantt-timeline-header'); // Second header for dates and controls
        this.timelineDatesContainer = this.createDiv('gantt-timeline-dates');
        const controls = this.createDiv('gantt-controls');

        if (this.options.features.zoom) {
            controls.innerHTML += `<button id="zoom-in-btn" title="Zoom In">${icons.zoomIn}</button><button id="zoom-out-btn" title="Zoom Out">${icons.zoomOut}</button><button id="zoom-fit-btn" title="Zoom to Fit">${icons.zoomFit}</button>`;
        }
        if (this.options.features.viewModes) {
            controls.innerHTML += `<button id="day-view-btn" class="${this.viewMode === 'day' ? 'active' : ''}" title="Day View">${icons.day}</button><button id="week-view-btn" class="${this.viewMode === 'week' ? 'active' : ''}" title="Week View">${icons.week}</button><button id="month-view-btn" class="${this.viewMode === 'month' ? 'active' : ''}" title="Month View">${icons.month}</button>`;
        }
        this.timelineHeader.append(this.timelineDatesContainer, controls);
        
        this.barsContainer = this.createDiv('gantt-bars-container');
        this.barsContainer.innerHTML = `<div class="gantt-grid-lines"></div>`;
        
        // Append all parts to the chart container
        this.chartContainer.append(chartHeaderContainer, this.timelineHeader, this.barsContainer);
        this.container.append(this.gridContainer, this.resizer, this.chartContainer);
    }
    
    
    setupEventListeners() {
        this.resizer.addEventListener('mousedown', () => { this.isResizingPanel = true; });
        this.barsContainer.addEventListener('mousedown', this.handleBarMouseDown.bind(this));
        
        window.addEventListener('mousemove', this.handleGlobalMouseMove.bind(this));
        window.addEventListener('mouseup', this.handleGlobalMouseUp.bind(this));

        this.container.querySelector('#add-task-btn').addEventListener('click', () => this.openNewTaskModal());
        
        this.gridBody.addEventListener('click', (e) => {
            const row = e.target.closest('.gantt-grid-row');
            if (!row) return;

            const taskId = row.dataset.taskId;
            if (e.target.closest('.gantt-action-btn.edit')) {
                this.openEditModal(taskId);
            }
            if (e.target.closest('.gantt-action-btn.delete')) {
                if (confirm('Are you sure you want to delete this task?')) {
                    this.deleteTask(taskId);
                }
            }
        });

        this.gridBody.addEventListener('dblclick', (e) => {
            const row = e.target.closest('.gantt-grid-row');
            if (row) this.openEditModal(row.dataset.taskId);
        });

        if (this.options.features.zoom) {
            this.container.querySelector('#zoom-in-btn').addEventListener('click', () => this.zoomIn());
            this.container.querySelector('#zoom-out-btn').addEventListener('click', () => this.zoomOut());
            this.container.querySelector('#zoom-fit-btn').addEventListener('click', () => this.zoomToFit());
        }
        if (this.options.features.viewModes) {
            this.container.querySelector('#day-view-btn').addEventListener('click', () => this.changeView('day'));
            this.container.querySelector('#week-view-btn').addEventListener('click', () => this.changeView('week'));
            this.container.querySelector('#month-view-btn').addEventListener('click', () => this.changeView('month'));
        }
        
        if (this.options.features.columnResize) {
            this.container.querySelector('.gantt-grid-header').addEventListener('mousedown', this.handleColumnResizeMouseDown.bind(this));
        }

        this.setupScrollSync();
    }
    
    setupModalEventListeners() {
        this.editModal.querySelector('#modal-save-btn').addEventListener('click', () => this.saveTaskFromModal());
        this.editModal.querySelector('#modal-cancel-btn').addEventListener('click', () => this.closeEditModal());
        
        // Ensure delete button exists before adding listener
        const deleteBtn = this.editModal.querySelector('#modal-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                const taskId = this.editModal.querySelector('#modal-task-id').value;
                if (confirm('Are you sure you want to delete this task?')) {
                    this.deleteTask(taskId);
                    this.closeEditModal();
                }
            });
        }
    }

    handleGlobalMouseMove(e) {
        if (this.isResizingPanel) {
            const newWidth = e.clientX - this.gridContainer.getBoundingClientRect().left;
            this.gridContainer.style.width = `${newWidth}px`;
        } else if (this.isDragging || this.isResizing) {
            const deltaX = e.clientX - this.dragStartX;
            const deltaDays = Math.round(deltaX / this.dayWidth);
            let newStart, newEnd;
            if (this.isDragging) {
                newStart = new Date(this.initialTaskStart.getTime() + deltaDays * 86400000);
                newEnd = new Date(this.initialTaskEnd.getTime() + deltaDays * 86400000);
            } else { // isResizing
                newStart = this.draggedTask.start;
                newEnd = new Date(this.initialTaskEnd.getTime() + deltaDays * 86400000);
                if (newEnd < newStart) newEnd = newStart;
            }
            
            const taskIndex = this.tasks.findIndex(t => t.id === this.draggedTask.id);
            this.tasks[taskIndex].start = newStart;
            this.tasks[taskIndex].end = newEnd;
            
            const row = this.gridBody.querySelector(`[data-task-id="${this.draggedTask.id}"]`);
            if (row) {
                // Update start/end date in the grid
                const startCell = row.querySelector('.gantt-grid-cell.start');
                const endCell = row.querySelector('.gantt-grid-cell.end');
                if(startCell) startCell.textContent = newStart.toLocaleDateString();
                if(endCell) endCell.textContent = newEnd.toLocaleDateString();
            }

            this.renderBars();
            this.renderDependencies();
        } else if (this.isResizingColumn) {
            const deltaX = e.clientX - this.resizingColumn.startX;
            const newWidth = this.resizingColumn.startWidth + deltaX;
            if (newWidth > 40) {
                const newFlex = `0 0 ${newWidth}px`;
                const colIndex = this.resizingColumn.index;
                this.columnData[colIndex].flex = newFlex;
                
                this.resizingColumn.element.style.flex = newFlex;
                
                this.gridBody.querySelectorAll('.gantt-grid-row').forEach(row => {
                    row.children[colIndex].style.flex = newFlex;
                });
            }
        }
    }

    handleGlobalMouseUp() {
        if (this.isDragging || this.isResizing) {
            const updatedRawTask = {
                ...this.draggedTask,
                start: this.draggedTask.start.toISOString().split('T')[0],
                end: this.draggedTask.end.toISOString().split('T')[0],
            };
            
            // Find and update the task in the main rawTasks array
            const taskIndex = this.rawTasks.findIndex(t => t.id === updatedRawTask.id);
            if (taskIndex !== -1) {
                this.rawTasks[taskIndex] = updatedRawTask;
            }
            
            // ** CHANGE HERE: Trigger the onTaskUpdate callback **
            if (this.options.onTaskUpdate) {
                this.options.onTaskUpdate(updatedRawTask);
            }
        }
        
        if (this.isResizingColumn) {
            this.renderGrid();
        }

        this.isDragging = false;
        this.isResizing = false;
        this.isResizingPanel = false;
        this.isResizingColumn = false;
    }
    
    renderGrid() {
        this.gridBody.innerHTML = '';
        this.tasks.forEach((task, index) => {
            const row = this.createDiv('gantt-grid-row');
            row.style.height = `${this.rowHeight}px`;
            row.dataset.taskId = task.id;
            
            this.columnData.forEach(col => {
                let cellContent; // This will hold the HTML for the cell
                let cellText = ''; // This will hold the plain text for the tooltip

                const value = task[col.id];
                
                switch (col.id) {
                    case 'sl_no':
                        cellText = `${index + 1}`;
                        cellContent = cellText;
                        break;
                    case 'name':
                        cellText = value || '';
                        cellContent = `<span class="task-name-indent" style="--indent-padding: ${task.level * 20}px">${cellText}</span>`;
                        break;
                    case 'start':
                    case 'end':
                        cellText = value ? new Date(value).toLocaleDateString() : '';
                        cellContent = cellText;
                        break;
                    case 'assignedUser':
                        if (Array.isArray(value) && this.options.resources) {
                            // Convert resource IDs to names
                            const resourceNames = value.map(userId => {
                                const resource = this.options.resources.find(r => r.id === userId);
                                return resource ? resource.name : `ID: ${userId}`;
                            });
                            cellText = resourceNames.join(', ');
                        } else {
                            cellText = value || '';
                        }
                        cellContent = cellText;
                        break;
                    case 'progress':
                        cellText = `${value || 0}%`;
                        cellContent = cellText;
                        break;
                    // Handle new custom fields dynamically
                    default:
                        cellText = value !== undefined && value !== null ? String(value) : '';
                        cellContent = cellText;
                }
                
                const cell = this.createDiv(`gantt-grid-cell ${col.id}`);
                cell.style.flex = col.flex;
                cell.innerHTML = cellContent;
                cell.title = cellText; // ** ADD THIS LINE to set the tooltip **
                
                row.appendChild(cell);
            });

            const actions = this.createDiv('gantt-task-actions');
            actions.innerHTML = `
                <button class="gantt-action-btn edit" title="Edit">✏️</button>
                <button class="gantt-action-btn delete" title="Delete">🗑️</button>
            `;
            row.appendChild(actions);

            this.gridBody.appendChild(row);
        });
    }

    createEditModal() {
        const modalOverlay = this.createDiv('gantt-modal-overlay');
        modalOverlay.id = 'gantt-edit-modal';

        // Check if a custom modal template is provided
        if (this.options.modalTemplate) {
            modalOverlay.innerHTML = this.options.modalTemplate;
        } else {
            // Default modal structure generation based on columnData
            let formHtml = `<input type="hidden" id="modal-task-id">`;

            // Always include parent and dependencies, even if not in columnData for default modal
            const coreFields = ['name', 'start', 'end', 'progress'];
            const relationFields = ['parent', 'assignedUser', 'dependencies']; // Special handling for dropdowns/multiselects

            this.columnData.forEach(col => {
                // Skip sl_no as it's an index, not an editable field
                if (col.id === 'sl_no' || relationFields.includes(col.id)) return; 

                const label = col.text || col.id;
                let inputType = 'text'; // Default
                let htmlInput = '';

                // Determine input type based on common IDs or explicit 'type' in columnData
                if (col.type) {
                    inputType = col.type;
                } else if (col.id.includes('date')) {
                    inputType = 'date';
                } else if (col.id.includes('progress')) {
                    inputType = 'number';
                }

                htmlInput = `<input type="${inputType}" id="modal-task-${col.id}" ${col.id === 'name' || col.id === 'start' || col.id === 'end' ? 'required' : ''} ${inputType === 'number' ? 'min="0" max="100"' : ''}>`;
                
                formHtml += `<div class="form-group"><label for="modal-task-${col.id}">${label}</label>${htmlInput}</div>`;
            });

            // Add standard dropdowns not covered by general column iteration, if they are relevant
            // Parent Task (always available in default modal)
            formHtml += `<div class="form-group"><label for="modal-task-parent">Parent Task</label><select id="modal-task-parent"></select></div>`;
            
            // Assigned Resources (if applicable and not covered)
            const assignedUserCol = this.columnData.find(c => c.id === 'assignedUser');
            if (assignedUserCol && !formHtml.includes('id="modal-task-assignedUser"')) {
                formHtml += `<div class="form-group"><label for="modal-task-assignedUser">Assigned Resources</label><select id="modal-task-assignedUser" multiple></select></div>`;
            }

            // Dependencies (if applicable and not covered)
            const dependenciesCol = this.columnData.find(c => c.id === 'dependencies');
            if (dependenciesCol && !formHtml.includes('id="modal-task-dependencies"')) {
                formHtml += `<div class="form-group"><label for="modal-task-dependencies">Dependencies</label><select id="modal-task-dependencies" multiple></select></div>`;
            }


            modalOverlay.innerHTML = `
                <div class="gantt-modal">
                    <h2 id="modal-title">Edit Task</h2>
                    <div class="gantt-modal-content">
                        <form onsubmit="return false;">
                            ${formHtml}
                        </form>
                    </div>
                    <div class="gantt-modal-actions">
                        <button class="btn-delete" id="modal-delete-btn">Delete</button>
                        <button class="btn-cancel" id="modal-cancel-btn">Cancel</button>
                        <button class="btn-save" id="modal-save-btn">Save</button>
                    </div>
                </div>`;
        }
        document.body.appendChild(modalOverlay);
        this.editModal = modalOverlay;
    }

    saveTaskFromModal() {
        const form = this.editModal.querySelector('form');
        if (!form.reportValidity()) return;
        
        const id = form.querySelector('#modal-task-id').value;
        const taskData = {};

        // Iterate through columnData to get values dynamically
        this.columnData.forEach(col => {
            const inputElement = form.querySelector(`#modal-task-${col.id}`);
            if (inputElement) {
                if (inputElement.type === 'number') {
                    taskData[col.id] = parseInt(inputElement.value, 10);
                } else if (inputElement.tagName === 'SELECT' && inputElement.multiple) {
                    taskData[col.id] = [...inputElement.options].filter(opt => opt.selected).map(opt => opt.value);
                } else {
                    taskData[col.id] = inputElement.value;
                }
            }
        });

        // Handle parent and dependencies separately as they are "relationships" not strictly "columns"
        const parentIdInput = form.querySelector('#modal-task-parent');
        if (parentIdInput) {
            taskData.parent = parentIdInput.value ? parseInt(parentIdInput.value, 10) : null;
        }

        const dependenciesInput = form.querySelector('#modal-task-dependencies');
        if (dependenciesInput) {
            taskData.dependencies = [...dependenciesInput.options].filter(opt => opt.selected).map(opt => parseInt(opt.value));
        }

        // Handle assignedUser separately if it's a multiselect
        const assignedUserInput = form.querySelector('#modal-task-assignedUser');
        if (assignedUserInput && assignedUserInput.multiple) {
            taskData.assignedUser = [...assignedUserInput.options].filter(opt => opt.selected).map(opt => opt.value);
        } else if (assignedUserInput) { // single select
            taskData.assignedUser = assignedUserInput.value;
        }


        if (id) { this.updateTask(parseInt(id, 10), taskData); } 
        else { this.addTask(taskData); }
        this.closeEditModal();
    }
    
    // Helper to create a div
    createDiv(className, innerText = '') {
        const div = document.createElement('div');
        div.className = className;
        if(innerText) div.innerText = innerText;
        return div;
    }

    // All other methods (processTasks, renderTimeline, renderBars, etc.) are included below for completeness.
    processTasks(tasks) {
        const taskMap = new Map(tasks.map(t => [t.id, { ...t, children: [] }]));
        const rootTasks = [];
        tasks.forEach(task => {
            if (task.parent && taskMap.has(task.parent)) {
                taskMap.get(task.parent).children.push(taskMap.get(task.id));
            } else { rootTasks.push(taskMap.get(task.id)); }
        });
        const flatTasks = [];
        const flatten = (task, level) => {
            flatTasks.push({ ...task, level, start: new Date(task.start), end: new Date(task.end) });
            task.children.sort((a, b) => new Date(a.start) - new Date(b.start)).forEach(child => flatten(child, level + 1));
        };
        rootTasks.sort((a, b) => new Date(a.start) - new Date(b.start)).forEach(task => flatten(task, 0));
        return flatTasks;
    }

    renderTimeline() {
        this.timelineDatesContainer.innerHTML = ''; 
        if (this.viewMode === 'day') this.renderDayTimeline();
        else if (this.viewMode === 'week') this.renderWeekTimeline();
        else if (this.viewMode === 'month') this.renderMonthTimeline();
    }
    
    renderDayTimeline() {
        let currentDate = new Date(this.projectStartDate);
        let months = {};
        while (currentDate <= this.projectEndDate) {
            const dayElement = this.createDiv('gantt-timeline-cell');
            dayElement.style.width = `${this.dayWidth}px`;
            dayElement.textContent = currentDate.getDate();
            const monthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
            if (currentDate.getDate() === 1 || this.timelineDatesContainer.children.length === 0) { // Fix: Check timelineDatesContainer for children
                 if (!months[monthYear]) {
                    months[monthYear] = { element: this.createDiv('month-marker', monthYear), count: 0 };
                    dayElement.appendChild(months[monthYear].element);
                }
            }
             if (months[monthYear]) {
                months[monthYear].count++;
            }
            this.timelineDatesContainer.appendChild(dayElement); 
            currentDate.setDate(currentDate.getDate() + 1);
        }
        for (const key in months) {
            months[key].element.style.width = `${months[key].count * this.dayWidth}px`;
        }
    }

    renderWeekTimeline() {
        let currentDate = new Date(this.projectStartDate);
        while (currentDate <= this.projectEndDate) {
            const weekElement = this.createDiv('gantt-timeline-cell');
            const weekNumber = this.getWeekNumber(currentDate);
            weekElement.style.width = `${this.dayWidth * 7}px`;
            weekElement.textContent = `Week ${weekNumber}`;
            this.timelineDatesContainer.appendChild(weekElement); 
            currentDate.setDate(currentDate.getDate() + 7);
        }
    }

    renderMonthTimeline() {
        let currentDate = new Date(this.projectStartDate);
        while (currentDate <= this.projectEndDate) {
            const monthElement = this.createDiv('gantt-timeline-cell');
            const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
            monthElement.style.width = `${this.dayWidth * daysInMonth}px`;
            monthElement.textContent = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
            this.timelineDatesContainer.appendChild(monthElement); 
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
    }
    
    renderBars() {
        this.barsContainer.querySelectorAll('.gantt-bar, .gantt-dependency-svg').forEach(el => el.remove());
        const barsFrag = document.createDocumentFragment();
        this.tasks.forEach((task, index) => {
            const bar = this.createDiv('gantt-bar');
            bar.dataset.taskId = task.id;
            bar.style.top = `${index * this.rowHeight + (this.rowHeight * 0.1)}px`;
            bar.style.height = `${this.rowHeight * 0.8}px`;
            const offsetPixels = this.dateToPixel(task.start);
            const durationDays = (task.end.getTime() - task.start.getTime()) / 86400000;
            const widthPixels = (durationDays + 1) * this.dayWidth;
            bar.style.left = `${offsetPixels}px`;
            bar.style.width = `${widthPixels}px`;
            bar.innerHTML = `
                <div class="gantt-bar-progress" style="width: ${task.progress || 0}%"></div>
                <div class="gantt-bar-label">${task.name}</div>
                <div class="gantt-resize-handle"></div>`;
            barsFrag.appendChild(bar);
        });
        this.barsContainer.appendChild(barsFrag);
    }

    renderDependencies() {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add('gantt-dependency-svg');
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        defs.innerHTML = `<marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#ff9800"></path></marker>`;
        svg.appendChild(defs);
        this.tasks.forEach(task => {
            if (task.dependencies) {
                task.dependencies.forEach(depId => {
                    const fromTask = this.tasks.find(t => t.id == depId);
                    if (!fromTask) return;
                    const fromIndex = this.tasks.indexOf(fromTask);
                    const toIndex = this.tasks.indexOf(task);
                    const fromBarEnd = this.dateToPixel(fromTask.end) + this.dayWidth;
                    const toBarStart = this.dateToPixel(task.start);
                    const fromY = fromIndex * this.rowHeight + this.rowHeight / 2;
                    const toY = toIndex * this.rowHeight + this.rowHeight / 2;
                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    const d = `M ${fromBarEnd} ${fromY} H ${toBarStart - 15} Q ${toBarStart - 5} ${fromY} ${toBarStart - 5} ${fromY + 10 * Math.sign(toY - fromY)} L ${toBarStart - 5} ${toY - 10 * Math.sign(toY - fromY)} Q ${toBarStart - 5} ${toY} ${toBarStart} ${toY}`;
                    path.setAttribute("d", d);
                    path.classList.add('gantt-dependency-line');
                    svg.appendChild(path);
                });
            }
        });
        this.barsContainer.appendChild(svg);
    }
    
    zoomIn() { this.dayWidth += 10; this.render(); }
    zoomOut() { this.dayWidth = Math.max(10, this.dayWidth - 10); this.render(); }
    zoomToFit() {
        const chartWidth = this.chartContainer.clientWidth;
        const duration = (this.projectEndDate - this.projectStartDate) / 86400000;
        if (duration > 0) this.dayWidth = chartWidth / duration;
        this.render();
    }
    changeView(mode) {
        this.viewMode = mode;
        if (mode === 'week') this.dayWidth = 15;
        else if (mode === 'month') this.dayWidth = 5;
        else this.dayWidth = 50;
        this.render();
    }

    openNewTaskModal() {
        this.editModal.querySelector('#modal-title').textContent = 'Add New Task';
        const form = this.editModal.querySelector('form');
        form.reset();
        form.querySelector('#modal-task-id').value = '';

        // Dynamically populate fields based on columnData
        this.columnData.forEach(col => {
            const inputElement = form.querySelector(`#modal-task-${col.id}`);
            if (inputElement) {
                if (col.id === 'start') {
                    inputElement.value = new Date().toISOString().split('T')[0];
                } else if (col.id === 'end') {
                    const nextDay = new Date();
                    nextDay.setDate(nextDay.getDate() + 1);
                    inputElement.value = nextDay.toISOString().split('T')[0];
                } else if (col.id === 'progress') {
                    inputElement.value = 0;
                } else if (col.id === 'name') {
                    inputElement.value = 'New Task';
                } else if (inputElement.tagName === 'SELECT') {
                    // Reset dropdowns/multiselects
                    if (inputElement.multiple) {
                        [...inputElement.options].forEach(opt => opt.selected = false);
                    } else {
                        inputElement.value = '';
                    }
                } else {
                    inputElement.value = ''; // Default for other text/number fields
                }
            }
        });

        this.populateDropdowns(null); // Pass null for a new task
        
        const deleteBtn = this.editModal.querySelector('#modal-delete-btn');
        if (deleteBtn) deleteBtn.style.display = 'none';
        
        this.editModal.classList.add('visible');
    }

    openEditModal(taskId) {
        const task = this.rawTasks.find(t => t.id == taskId);
        if (!task) return;
        this.editModal.querySelector('#modal-title').textContent = 'Edit Task';
        const form = this.editModal.querySelector('form');
        form.reset();
        form.querySelector('#modal-task-id').value = task.id;

        // Dynamically populate fields based on columnData
        this.columnData.forEach(col => {
            const inputElement = form.querySelector(`#modal-task-${col.id}`);
            if (inputElement) {
                if (col.id === 'start' || col.id === 'end') {
                    inputElement.value = task[col.id]; // Date strings are fine
                } else if (col.id === 'progress') {
                    inputElement.value = task[col.id] || 0;
                } else if (inputElement.tagName === 'SELECT' && inputElement.multiple) {
                    // This is handled by populateDropdown
                } else {
                    inputElement.value = task[col.id] !== undefined && task[col.id] !== null ? task[col.id] : '';
                }
            }
        });

        this.populateDropdowns(task); // Pass the task for existing values
        
        const deleteBtn = this.editModal.querySelector('#modal-delete-btn');
        if (deleteBtn) deleteBtn.style.display = 'block';
        
        this.editModal.classList.add('visible');
    }

    populateDropdowns(task) {
        const currentId = task ? task.id : null;
        const otherTasks = this.rawTasks.filter(t => t.id != currentId);

        // Populate Parent Task dropdown
        this.populateDropdown(
            'modal-task-parent', 
            otherTasks.map(t => ({value: t.id, text: t.name})), 
            task ? task.parent : null, 
            false, // Not multiple
            'None'
        );

        // Populate Assigned Resources dropdown
        this.populateDropdown(
            'modal-task-assignedUser', 
            this.options.resources || [], 
            task ? task.assignedUser : null, 
            true // Is multiple
        );

        // Populate Dependencies dropdown
        this.populateDropdown(
            'modal-task-dependencies', 
            otherTasks.map(t => ({value: t.id, text: t.name})), 
            task ? task.dependencies : [], 
            true // Is multiple
        );
    }

    closeEditModal() { this.editModal.classList.remove('visible'); }
    
    addTask(taskData) {
        // Ensure new ID is unique and highest
        const newId = this.rawTasks.length > 0 ? Math.max(...this.rawTasks.map(t => t.id)) + 1 : 1;
        const newTask = { id: newId, ...taskData };
        
        this.rawTasks.push(newTask);
        this.tasks = this.processTasks(this.rawTasks); // Re-process to get levels and dates
        this.render();

        if (this.options.onTaskAdd) {
            this.options.onTaskAdd(newTask);
        }
    }

    updateTask(taskId, updates) {
        let updatedTask = null;
        this.rawTasks = this.rawTasks.map(task => {
            if (task.id == taskId) {
                updatedTask = { ...task, ...updates, id: task.id };
                return updatedTask;
            }
            return task;
        });

        this.tasks = this.processTasks(this.rawTasks); // Re-process to get levels and dates
        this.render();

        if (this.options.onTaskUpdate && updatedTask) {
            this.options.onTaskUpdate(updatedTask);
        }
    }

    deleteTask(taskId) {
        const taskToDelete = this.rawTasks.find(t => t.id == taskId);
        
        this.rawTasks = this.rawTasks.filter(task => task.id != taskId);
        this.rawTasks.forEach(task => {
            if (task.dependencies) task.dependencies = task.dependencies.filter(dep => dep != taskId);
            if (task.parent == taskId) task.parent = null;
        });

        this.tasks = this.processTasks(this.rawTasks); // Re-process to get levels and dates
        this.render();

        if (this.options.onTaskDelete && taskToDelete) {
            this.options.onTaskDelete(taskToDelete.id);
        }
    }
    
    /**
     * Populates a select dropdown element.
     * @param {string} elementId The ID of the select element.
     * @param {Array<Object|string>} items An array of objects ({value, text}) or strings for options.
     * @param {string|number|Array<string|number>} selectedValue The value(s) to be selected.
     * @param {boolean} isMultiple Whether the select element is multiple.
     * @param {string} [defaultOptionText] Optional text for a default empty option.
     */
    populateDropdown(elementId, items, selectedValue, isMultiple = false, defaultOptionText = null) {
        const select = this.editModal.querySelector(`#${elementId}`);
        if (!select) return; // Exit if element not found (e.g., custom modal doesn't have it)

        select.innerHTML = '';
        select.multiple = isMultiple; // Set multiple property

        if (defaultOptionText && !isMultiple) { // Default option makes sense only for single select
            select.add(new Option(defaultOptionText, ''));
        }
        
        items.forEach(item => {
            let text, value;
            if (typeof item === 'object' && item !== null) {
                // Prioritize 'text'/'value' for consistency, fallback to 'name'/'id'
                text = item.text !== undefined ? item.text : item.name; 
                value = item.value !== undefined ? item.value : item.id;
            } else {
                text = item;
                value = item;
            }
            const option = new Option(text, value);
            select.add(option);
        });

        // Set selected values
        if (isMultiple && Array.isArray(selectedValue)) {
            [...select.options].forEach(opt => {
                // Ensure comparison is type-safe
                opt.selected = selectedValue.some(sv => String(sv) === String(opt.value));
            });
        } else if (!isMultiple) { 
            select.value = selectedValue !== undefined && selectedValue !== null ? String(selectedValue) : ''; 
        }
    }
    
    calculateDateRange() {
        if(this.tasks.length === 0) {
            this.projectStartDate = new Date();
            this.projectEndDate = new Date();
            this.projectEndDate.setDate(this.projectEndDate.getDate() + 30);
            return;
        }
        const startDates = this.tasks.map(t => t.start);
        const endDates = this.tasks.map(t => t.end);
        this.projectStartDate = new Date(Math.min(...startDates));
        this.projectEndDate = new Date(Math.max(...endDates));
        this.projectStartDate.setDate(this.projectStartDate.getDate() - 7);
        this.projectEndDate.setDate(this.projectEndDate.getDate() + 7);
    }
    
    dateToPixel(date) {
        const timeDiff = date.getTime() - this.projectStartDate.getTime();
        return (timeDiff / 86400000) * this.dayWidth;
    }
    
    updateGridLines() {
        const gridLines = this.barsContainer.querySelector('.gantt-grid-lines');
        const chartHeader = this.chartContainer.querySelector('.gantt-header');

        if (!gridLines || !this.timelineDatesContainer || !this.timelineHeader || !chartHeader) return;

        // 1. Calculate the total width of the timeline based on the date cells
        const totalWidth = this.timelineDatesContainer.scrollWidth;

        // 2. Apply this width to all horizontal layers in the chart
        chartHeader.style.width = `${totalWidth}px`;
        this.timelineHeader.style.width = `${totalWidth}px`;
        gridLines.style.width = `${totalWidth}px`;

        // 3. Update the grid lines height and pattern size
        const totalHeight = this.tasks.length * this.rowHeight;
        gridLines.style.height = `${totalHeight}px`;
        gridLines.style.backgroundSize = `${this.dayWidth}px ${this.rowHeight}px`;
    }
    
    getWeekNumber(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        return Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    }

    handleBarMouseDown(e) {
        const bar = e.target.closest('.gantt-bar');
        if (!bar) return;
        this.draggedTask = this.tasks.find(t => t.id == bar.dataset.taskId);
        this.dragStartX = e.clientX;
        this.initialTaskStart = new Date(this.draggedTask.start);
        this.initialTaskEnd = new Date(this.draggedTask.end);
        this.isResizing = e.target.classList.contains('gantt-resize-handle');
        this.isDragging = !this.isResizing;
    }

    handleColumnResizeMouseDown(e) {
        if (!e.target.classList.contains('gantt-header-resizer')) return;
        this.isResizingColumn = true;
        const columnIndex = parseInt(e.target.dataset.columnIndex, 10);
        const headerCell = this.container.querySelectorAll('.gantt-grid-header .gantt-grid-cell')[columnIndex];
        this.resizingColumn = {
            index: columnIndex,
            element: headerCell,
            startX: e.clientX,
            startWidth: headerCell.offsetWidth
        };
    }


    /**
     * Sets up event listeners to synchronize the vertical scrolling of the grid and the chart.
     */
    setupScrollSync() {
        const gridBody = this.gridBody;
        // The chart container is now the scrollable element for the right side
        const chartScroller = this.chartContainer;

        let isSyncing = false;

        gridBody.addEventListener('scroll', () => {
            if (isSyncing) return;
            isSyncing = true;
            chartScroller.scrollTop = gridBody.scrollTop;
            // Use requestAnimationFrame to reset the flag on the next frame, preventing infinite loops
            requestAnimationFrame(() => { isSyncing = false; });
        });

        chartScroller.addEventListener('scroll', () => {
            if (isSyncing) return;
            isSyncing = true;
            gridBody.scrollTop = chartScroller.scrollTop;
            requestAnimationFrame(() => { isSyncing = false; });
        });
    }

    /**
     * Applies a theme to the Gantt chart.
     * @param {string} themeName - The name of the theme ('light', 'dark', 'narrow').
     */
    setTheme(themeName) {
        // Remove any existing theme classes
        this.container.classList.remove('gantt-dark-theme', 'gantt-narrow-theme');

        // The 'narrow' theme affects row height, which requires a full re-render
        if (themeName === 'narrow') {
            this.container.classList.add('gantt-narrow-theme');
            this.rowHeight = 32; // Use a smaller row height
            this.render(); // Re-render to apply new height calculations
        } else {
            // Other themes are CSS-only, no re-render needed
            if (themeName === 'dark') {
                this.container.classList.add('gantt-dark-theme');
            }
            // Reset row height if switching away from narrow
            if (this.rowHeight !== 40) {
                this.rowHeight = 40;
                this.render();
            }
        }
    }
    
}