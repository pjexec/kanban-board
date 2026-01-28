const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kanban'
});

// Initialize database
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        assignee VARCHAR(50),
        priority VARCHAR(20) DEFAULT 'medium',
        labels TEXT[],
        column_name VARCHAR(50) DEFAULT 'backlog',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('DB init error:', err.message);
  }
}

// API Routes

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    const tasks = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      assignee: row.assignee,
      priority: row.priority,
      labels: row.labels || [],
      column: row.column_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    res.json(tasks);
  } catch (err) {
    console.error('Get tasks error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Create task
app.post('/api/tasks', async (req, res) => {
  const { id, title, description, assignee, priority, labels, column } = req.body;
  try {
    await pool.query(
      `INSERT INTO tasks (id, title, description, assignee, priority, labels, column_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         assignee = EXCLUDED.assignee,
         priority = EXCLUDED.priority,
         labels = EXCLUDED.labels,
         column_name = EXCLUDED.column_name,
         updated_at = NOW()`,
      [id, title, description, assignee, priority, labels || [], column || 'backlog']
    );
    res.json({ success: true, id });
  } catch (err) {
    console.error('Create task error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update task
app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, assignee, priority, labels, column } = req.body;
  try {
    await pool.query(
      `UPDATE tasks SET title=$1, description=$2, assignee=$3, priority=$4, labels=$5, column_name=$6, updated_at=NOW()
       WHERE id=$7`,
      [title, description, assignee, priority, labels || [], column, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update task error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM tasks WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete task error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Seed initial tasks
app.post('/api/tasks/seed', async (req, res) => {
  const initialTasks = [
    {
      id: "task-gh-connect",
      title: "Connect GitHub (33 repos)",
      description: "Connected GitHub with full access to public and private repos",
      assignee: "hanna",
      priority: "high",
      labels: ["setup", "github"],
      column: "done"
    },
    {
      id: "task-ai-toolkit-feature",
      title: "Add Recently Added feature to ai-toolkit-directory",
      description: "Created feature branch with recently added section, quick filters, and usage tracking",
      assignee: "hanna",
      priority: "high",
      labels: ["feature", "ai-toolkit"],
      column: "done"
    },
    {
      id: "task-repo-audit",
      title: "Full repo audit (33 repos)",
      description: "Audited all repos, identified active vs orphaned, made recommendations",
      assignee: "hanna",
      priority: "high",
      labels: ["audit", "github"],
      column: "done"
    },
    {
      id: "task-kanban-board",
      title: "Create Kanban board",
      description: "Built and deployed Kanban board for task management",
      assignee: "hanna",
      priority: "high",
      labels: ["feature", "tools"],
      column: "done"
    },
    {
      id: "task-ai-toolkit-pr",
      title: "Review ai-toolkit-directory PR",
      description: "Feature branch feat/clawd-recently-added needs review and merge",
      assignee: "chuck",
      priority: "high",
      labels: ["pr", "review"],
      column: "review"
    },
    {
      id: "task-stitchmaster",
      title: "Improve stitchmaster app",
      description: "Add preset templates, prompt history, and export options",
      assignee: "hanna",
      priority: "medium",
      labels: ["feature", "stitchmaster"],
      column: "inprogress"
    },
    {
      id: "task-reengagepro",
      title: "Explore ReEngage Pro code",
      description: "Review reengagepro2 repository for improvement opportunities",
      assignee: "hanna",
      priority: "high",
      labels: ["review", "reengagepro"],
      column: "backlog"
    },
    {
      id: "task-daily-checkin",
      title: "Set up daily GitHub check-in",
      description: "Configure cron job or manual daily review of repos",
      assignee: "hanna",
      priority: "medium",
      labels: ["automation", "github"],
      column: "backlog"
    }
  ];

  try {
    for (const task of initialTasks) {
      await pool.query(
        `INSERT INTO tasks (id, title, description, assignee, priority, labels, column_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [task.id, task.title, task.description, task.assignee, task.priority, task.labels, task.column]
      );
    }
    res.json({ success: true, count: initialTasks.length });
  } catch (err) {
    console.error('Seed error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Start server
initDB().then(() => {
  app.listen(port, () => {
    console.log(`Kanban server running on port ${port}`);
  });
});
