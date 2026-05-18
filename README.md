# TaskCordAI

TaskCordAI is a full-stack productivity system that integrates with Discord to help track and manage academic tasks, deadlines, and reminders. 

By leveraging a Discord bot as the primary interface, the system connects a Node.js backend, MongoDB database, and LLM processing to automate task tracking directly inside the workspace students already use daily.

---

## The Problem It Solves

Manually tracking academic workloads across different platforms often leads to missed deadlines, forgotten assignments, and scattered information. TaskCordAI centralizes this workflow into Discord, removing the friction of context-switching between chat apps and traditional planners.

---

## Core Features

### Task Management
* **Flexible Input:** Create tasks via standard Discord commands or unstructured chat messages.
* **Centralized Tracking:** View, update, and close out tasks directly from a dedicated channel.

### Automated Reminders
* **Deadline Alerts:** Automatically pings users for upcoming or overdue deadlines.
* **Daily Digests:** Sends a structured daily summary of pending items.

### AI-Assisted Processing
* **Natural Language Parsing:** Converts messy chat inputs into clean, structured database entries.
* **Smart Triaging:** Automatically assigns priority levels and extracts relevant context from long descriptions.

---

## System Architecture

* **Discord Bot (`discord.js`):** Serves as the application's user interface, handling all user interactions, commands, and message rendering.
* **Backend API (Node.js & Express):** Manages the core business logic, handles CRUD operations, and coordinates API requests between Discord and the AI layer.
* **Database (MongoDB):** Acts as the persistent data store for user profiles, task states, and history logs.
* **Scheduler System (Cron Jobs):** Runs background workers to periodically monitor upcoming deadlines and trigger time-sensitive alerts.

---

## System Workflow

1. **Input:** A user types a command or standard message in a Discord channel.
2. **Ingestion:** The Discord bot captures the event and routes the payload to the Express backend.
3. **Processing:** The backend sanitizes the data (passing it through the AI layer if it's natural language) and commits the structured record to MongoDB.
4. **Automation:** The cron scheduler continuously scans the database for approaching `dueDate` timestamps.
5. **Output:** When a threshold is met, the backend signals the bot to dispatch an alert back to the appropriate Discord channel.

---

## Discord Setup

The bot expects the following channel layout to separate inputs from automated outputs:
* `#commands` – Where users interact with the bot (`!task`, `!showalltask`, `!edit`, `!done`).
* `#notifications` – Where the bot posts automated reminders, summaries, and deadline alerts.

---
