# NoteApp (Android, React Native + Expo)

A production-ready Android note-taking app built with React Native and Expo.

## Features

- Quick note creation (title + content)
- Automatic date/time stamping
- Local persistence with AsyncStorage
- View all notes (newest first)
- Edit existing notes
- Delete with confirmation
- Export individual/all notes as text files
- Android notification foundation for reminders

## Project Structure

```
noteapp/
├── app.json
├── App.js
├── package.json
├── screens/
│   ├── HomeScreen.js
│   ├── AddNoteScreen.js
│   └── EditNoteScreen.js
├── components/
│   ├── NoteCard.js
│   ├── NoteForm.js
│   └── Header.js
├── services/
│   ├── storageService.js
│   ├── fileService.js
│   └── notificationService.js
└── constants/
    └── colors.js
```

## Run Locally (Android)

```bash
npm install
npm run start
```

Then open Expo and run on an Android emulator/device.

## Notes

- Export uses `expo-file-system` + `expo-sharing`.
- Notifications are initialized with Android notification channel setup.
- Notes are stored locally under AsyncStorage key `@noteapp:notes`.
