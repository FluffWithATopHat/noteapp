# NoteApp - Task & Reminder Note Taking App

A simple, effective note-taking application designed for managing daily tasks and reminders with automatic date stamping, persistent storage, and the ability to view, edit, and download notes.

## Features

- ✅ **Quick Note Creation** - Capture tasks and reminders instantly
- 📅 **Automatic Date Stamping** - Notes are automatically timestamped
- 💾 **Persistent Storage** - All notes are saved and retrievable
- 🔍 **View & Edit** - Browse, modify, and manage existing notes
- 📥 **Download Notes** - Export notes for backup or sharing
- 📱 **Mobile-Ready** - Built with responsive design for future mobile app conversion
- 🔔 **Reminder Support** - Foundation for push notifications (mobile version)

## Project Structure

```
noteapp/
├── backend/                 # Node.js/Express API
│   ├── server.js           # Main server file
│   ├── routes/             # API endpoints
│   ├── controllers/        # Business logic
│   ├── data/               # JSON storage
│   └── package.json
├── frontend/               # React web application
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page views
│   │   ├── services/       # API calls
│   │   └── App.jsx
│   └── package.json
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager

### Backend Setup

```bash
cd backend
npm install
npm start
# Server runs on http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
# App runs on http://localhost:3000
```

## API Endpoints

- `GET /api/notes` - Get all notes
- `POST /api/notes` - Create a new note
- `GET /api/notes/:id` - Get a specific note
- `PUT /api/notes/:id` - Update a note
- `DELETE /api/notes/:id` - Delete a note
- `GET /api/notes/:id/download` - Download note as file

## Data Structure

Each note contains:
```json
{
  "id": "unique-id",
  "title": "Task name",
  "content": "Note details",
  "createdAt": "2026-08-16T10:30:00Z",
  "updatedAt": "2026-08-16T10:30:00Z",
  "dueDate": "2026-08-17",
  "completed": false,
  "tags": ["work", "urgent"]
}
```

## Mobile App Roadmap

- React Native version for iOS/Android
- Local push notifications for reminders
- Offline-first sync
- Cloud backup integration

## License

MIT
