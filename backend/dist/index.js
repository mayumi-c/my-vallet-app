"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const port = 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve static files from the React app
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
let tasks = [];
let nextId = 1;
// Get all tasks
app.get('/api/tasks', (req, res) => {
    res.json(tasks);
});
// Add a new task
app.post('/api/tasks', (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ message: 'Task text is required' });
    }
    const newTask = {
        id: nextId++,
        text,
        status: 'pending',
    };
    tasks.push(newTask);
    res.status(201).json(newTask);
});
// Update a task
app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { status, rescheduledTo } = req.body;
    const taskIndex = tasks.findIndex((t) => t.id === parseInt(id, 10));
    if (taskIndex === -1) {
        return res.status(404).json({ message: 'Task not found' });
    }
    const updatedTask = Object.assign({}, tasks[taskIndex]);
    if (status) {
        updatedTask.status = status;
    }
    if (rescheduledTo) {
        updatedTask.rescheduledTo = rescheduledTo;
    }
    // If a task is marked as something other than rescheduled, remove the rescheduledTo date
    if (status && status !== 'rescheduled') {
        delete updatedTask.rescheduledTo;
    }
    tasks[taskIndex] = updatedTask;
    res.json(updatedTask);
});
// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/^(?!\/api)/, (req, res) => {
    console.log(`[Fallback] Serving index.html for path: ${req.path}`);
    res.sendFile(path_1.default.join(__dirname, '..', 'public', 'index.html'));
});
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
