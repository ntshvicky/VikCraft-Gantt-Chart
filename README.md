# 📊 VikCraft Gantt Chart Documentation

VikCraft Gantt is a vanilla JavaScript library for creating interactive and highly configurable Gantt charts. It allows you to visualize project tasks, their durations, dependencies, and assigned resources in a clear, intuitive timeline.

[VikCraftGantt]: https://vikcraftgantt.nitishsrivastava.com/
For a demonstration, visit the [VikCraft Gantt Chart demo][VikCraftGantt].
You can also find the full documentation on their [website][VikCraftGantt].

---

## ✨ Features

- **Task Management**: Add, edit, update, and delete tasks directly from the chart.
- **Hierarchical Tasks**: Support for parent-child task relationships with indentation.
- **Dependencies**: Visualize task dependencies with connecting lines.
- **Drag & Resize**: Interactively adjust task dates and durations.
- **Configurable Columns**: Choose which fields to display and edit.
- **Customizable Modals**: Full control over add/edit modals with your own HTML.
- **Zoom & View Modes**: Switch between Day, Week, Month views.
- **Column Resizing**: Resize grid columns dynamically.
- **Theming**: Built-in `light`, `dark`, and `narrow` themes.
- **Event Callbacks**: Hooks for `onTaskAdd`, `onTaskUpdate`, `onTaskDelete`.

---

## 🚀 Getting Started

### 1. Basic Setup

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My VikCraft Gantt Chart</title>
  <link rel="stylesheet" href="vikcraft-gantt-styles.css">
</head>
<body>

  <h1>Project Timeline</h1>

  <div class="controls">
    <button id="theme-light">Light</button>
    <button id="theme-dark">Dark</button>
    <button id="theme-narrow">Narrow</button>
  </div>

  <div id="my-gantt-chart"></div>

  <script src="vikcraft-gantt-script.js"></script>
  <script>
    // Chart initialization goes here
  </script>
</body>
</html>
```

---

### 1. Initialize the Chart
```javascript
document.addEventListener('DOMContentLoaded', () => {
  const myTasks = [
    { id: 1, name: 'Kick-off', start: '2025-07-05', end: '2025-07-06', progress: 100, assignedUser: ['alice'], status: 'Completed' },
    { id: 2, name: 'Research', start: '2025-07-07', end: '2025-07-19', progress: 75, parent: null, assignedUser: ['bob'], status: 'In Progress' },
    { id: 3, name: 'User Interviews', start: '2025-07-08', end: '2025-07-12', progress: 90, parent: 2, dependencies: [1], assignedUser: ['bob'], status: 'In Progress' }
  ];

  const projectResources = [
    { id: 'alice', name: 'Alice Smith' },
    { id: 'bob', name: 'Bob Johnson' }
  ];

  const ganttOptions = {
    theme: 'light',
    resources: projectResources,
    columns: [
      { id: 'sl_no', text: '#', flex: '0 0 40px' },
      { id: 'name', text: 'Task Name', flex: '1 1 220px', type: 'text' },
      { id: 'start', text: 'Start Date', flex: '0 0 90px', type: 'date' },
      { id: 'end', text: 'End Date', flex: '0 0 90px', type: 'date' },
      { id: 'progress', text: 'Progress', flex: '0 0 90px', type: 'number' },
      { id: 'assignedUser', text: 'Assignees', flex: '1 1 150px', type: 'multiselect', optionsSource: 'resources' },
      { id: 'status', text: 'Status', flex: '0 0 100px', type: 'select', options: ['Not Started', 'In Progress', 'Completed'] },
      { id: 'notes', text: 'Notes', flex: '0 0 150px', type: 'text' }
    ],
    features: {
      zoom: true,
      viewModes: true,
      columnResize: true
    },
    onTaskAdd: (task) => console.log('Task Added:', task),
    onTaskUpdate: (task) => console.log('Task Updated:', task),
    onTaskDelete: (id) => console.log('Task Deleted:', id)
  };

  const ganttInstance = new VikCraftGantt('my-gantt-chart', myTasks, ganttOptions);

  document.addEventListener('click', (e) => {
    if (!ganttInstance) return;
    if (e.target.id === 'theme-light') ganttInstance.setTheme('light');
    if (e.target.id === 'theme-dark') ganttInstance.setTheme('dark');
    if (e.target.id === 'theme-narrow') ganttInstance.setTheme('narrow');
  });
});
```
---

## ⚙️ Configuration Options

| Option           | Type       | Description                                                                                         | Default       |
|------------------|------------|-----------------------------------------------------------------------------------------------------|----------------|
| `theme`          | `string`   | Visual theme: `'light'`, `'dark'`, `'narrow'`                                                      | `'light'`      |
| `resources`      | `array`    | Users list: `[{ id, name }]`                                                                       | `[]`           |
| `columns`        | `array`    | Column definitions for grid. See details below.                                                     | `[name, start, end, ...]` |
| `features`       | `object`   | UI toggles: `{ zoom, viewModes, columnResize }`                                                     | `Enabled`      |
| `onTaskAdd`      | `function` | Triggered after a task is added                                                                     | `undefined`    |
| `onTaskUpdate`   | `function` | Triggered after task is updated                                                                     | `undefined`    |
| `onTaskDelete`   | `function` | Triggered after task is deleted                                                                     | `undefined`    |
| `modalTemplate`  | `string`   | Custom modal HTML (optional). IDs must follow `modal-task-YOUR_COLUMN_ID` format                   | `undefined`    |

---

## 📝 Task Data Structure

| Field           | Type              | Description                            |
|------------------|-------------------|----------------------------------------|
| `id`            | `number`          | Unique ID for each task                |
| `name`          | `string`          | Task name                              |
| `start`         | `string (YYYY-MM-DD)` | Start date                         |
| `end`           | `string (YYYY-MM-DD)` | End date                           |
| `progress`      | `number (0-100)`  | Completion %                          |
| `parent`        | `number \\| null` | ID of parent task, or null             |
| `assignedUser`  | `Array<string>`   | Array of user ids                      |
| `dependencies`  | `Array<number>`   | Task ID dependencies                   |
| `customField`   | `any`             | Any extra custom field like `notes`, `status`, etc. |

---

## 🎨 Theming

VikCraft Gantt provides three built-in themes:

- **Light (Default)**: `gantt.setTheme('light');`
- **Dark**: `gantt.setTheme('dark');`
- **Narrow**: `gantt.setTheme('narrow');`  
  _(This theme also reduces row height for a more compact view and triggers a re-render.)_

You can set the initial theme via `ganttOptions.theme` or change it dynamically using:

```javascript
ganttInstance.setTheme('themeName');
```

---

## 🛠️ Custom Modals
The library offers a default modal for adding and editing tasks. This modal dynamically generates input fields based on the columns you define in your ganttOptions.

However, for ultimate flexibility, you can provide your own custom modal HTML using the modalTemplate option.

Using the Default Modal (Recommended for most cases)
If you don't provide a modalTemplate, the library will automatically generate a modal for you. To ensure it correctly captures and displays data for your custom columns, define them clearly in your ganttOptions.columns array, including the type property where applicable:

```javascript
const ganttOptions = {
    // ... other options
    columns: [
        // ... standard columns
        { id: 'status', text: 'Status', flex: '0 0 100px', type: 'select', options: ['Not Started', 'In Progress', 'Completed'] },
        { id: 'budget', text: 'Budget', flex: '0 0 80px', type: 'number' },
        { id: 'description', text: 'Description', flex: '1 1 200px', type: 'text' }
    ],
    // ... no modalTemplate defined
};
```
The library will then attempt to create an input field for status (as a select dropdown), budget (as a number input), and description (as a text input) in the default modal.

## Providing a Custom Modal (`modalTemplate`)

If you need a more complex layout, specific input types, or custom validation not covered by the default dynamic generation, you can supply your own HTML via the `modalTemplate` option.

---

#### 🔑 Key Requirements for Custom Modals

- The entire modal structure (including the overlay and action buttons) should be wrapped in a **single HTML string**.
- The main container for your modal's content should have the class **`gantt-modal`**.
- The title element should have `id="modal-title"`.
- The hidden input for the task ID should have `id="modal-task-id"`.
- All form input/select elements that correspond to your task data fields (including `name`, `start`, `end`, `progress`, `parent`, `assignedUser`, `dependencies`, and any custom columns) **must have an ID** in the format: `modal-task-YOUR_COLUMN_ID`

- For example, if you have a custom column `status`, its select input should have:
  ```html
  <select id="modal-task-status"></select>
  ```

- Fields like `assignedUser` and `dependencies` typically require the `multiple` attribute:
  ```html
  <select id="modal-task-assignedUser" multiple></select>
  ```

- The **Save**, **Cancel**, and **Delete** buttons **must** have the following IDs:
- `modal-save-btn`
- `modal-cancel-btn`
- `modal-delete-btn` (delete is optional if you don't want task deletion from the modal).

```javascript
const ganttOptions = {
    // ... other options
    modalTemplate: `
        <div class="gantt-modal">
            <h2 id="modal-title">Task Details</h2>
            <div class="gantt-modal-content">
                <form onsubmit="return false;">
                    <input type="hidden" id="modal-task-id">
                    
                    <div class="form-group">
                        <label for="modal-task-name">Task Name</label>
                        <input type="text" id="modal-task-name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="modal-task-start">Start Date</label>
                        <input type="date" id="modal-task-start" required>
                    </div>

                    <div class="form-group">
                        <label for="modal-task-end">End Date</label>
                        <input type="date" id="modal-task-end" required>
                    </div>

                    <div class="form-group">
                        <label for="modal-task-progress">Progress (%)</label>
                        <input type="number" id="modal-task-progress" min="0" max="100">
                    </div>

                    <div class="form-group">
                        <label for="modal-task-assignedUser">Team Members</label>
                        <select id="modal-task-assignedUser" multiple></select>
                    </div>

                    <div class="form-group">
                        <label for="modal-task-status">Project Status</label>
                        <select id="modal-task-status"></select>
                    </div>
                    
                    <div class="form-group">
                        <label for="modal-task-notes">Project Notes</label>
                        <textarea id="modal-task-notes"></textarea> </div>

                    <div class="form-group">
                        <label for="modal-task-parent">Parent Task</label>
                        <select id="modal-task-parent"></select>
                    </div>
                    
                    <div class="form-group">
                        <label for="modal-task-dependencies">Task Dependencies</label>
                        <select id="modal-task-dependencies" multiple></select>
                    </div>
                    
                </form>
            </div>
            <div class="gantt-modal-actions">
                <button class="btn-delete" id="modal-delete-btn">Delete</button>
                <button class="btn-cancel" id="modal-cancel-btn">Cancel</button>
                <button class="btn-save" id="modal-save-btn">Save</button>
            </div>
        </div>
    `
};
```

When a custom `modalTemplate` is provided, the `populateDropdowns` and `saveTaskFromModal` methods in the library will still attempt to find and populate elements with the expected `modal-task-COLUMN_ID` structure, making it easy to wire up your custom UI with the library's data handling. If an element isn't found (e.g., you remove `modal-task-notes` from your custom modal), it will simply be skipped without error.


---

## 📜 License

This project is developed by **Nitish Srivastava** and open-source.

