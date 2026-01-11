import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '..', 'public')));

interface Task {
  id: number;
  text: string;
  status: 'pending' | 'completed' | 'rescheduled';
  rescheduledTo?: string;
}

let tasks: Task[] = [];
let nextId: number = 1;

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
  const newTask: Task = {
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

  const updatedTask = { ...tasks[taskIndex] };

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
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});


app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
