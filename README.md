## 🤖 TaskCordAI

TaskCordAI is a full-stack productivity system built around Discord that helps manage academic tasks, deadlines, and reminders in one centralized workflow.

It combines a Discord bot, backend API, database, and AI-powered features to automate task organization and reduce manual tracking.

---

## 🧠 Overview

TaskCordAI was designed to solve common productivity problems such as:
- Missing deadlines  
- Forgetting tasks  
- Scattered school information  
- Manual tracking of updates  

By using Discord as the main interface, users can manage tasks directly where they already communicate.

---

## 🚀 Features

### 📥 Task Management
- Add tasks via Discord commands or messages  
- View all tasks in a dedicated channel  
- Update and manage task status  

### ⏰ Reminders & Notifications
- Automatic reminders for upcoming deadlines  
- Alerts for overdue tasks  
- Daily task summaries  

### 🧠 AI-Powered Processing
- Convert natural language into structured tasks  
- Automatically assign priority levels  
- Summarize long messages or inputs  

---

## 🧱 System Architecture

### 1. Discord Bot
- Built using `discord.js`  
- Handles user interaction  
- Sends and receives messages  
- Acts as the UI layer  

### 2. Backend API
- Node.js + Express  
- Handles business logic and API requests  
- Processes task creation, updates, and deletion  
- Integrates AI and scheduling logic  

### 3. Database
- MongoDB  
- Stores tasks and user data  
- Acts as the single source of truth  

### 4. Scheduler System
- Cron jobs / background workers  
- Monitors deadlines and triggers reminders  

### 5. AI Layer
- Processes natural language inputs  
- Enhances task creation and prioritization  

---

## 🔁 Data Flow

1. User sends a message or command in Discord  
2. Discord bot forwards data to backend  
3. Backend processes and stores it in MongoDB  
4. Scheduler checks deadlines periodically  
5. Bot sends reminders and updates to Discord  

---

## 📢 Discord Channel Structure

- **#commands** → Input commands(!task, !showalltask, !edit, !done)
- **#notifications** → Receive reminders and alerts  

---

## 📄 Example Task Schema

```json
{
  "userId": "discordUserId",
  "title": "Math quiz",
  "description": "",
  "dueDate": "2026-04-18",
  "priority": "high",
  "status": "pending",
  "createdAt": "timestamp"
}
