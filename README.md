# Dash : Real-Time Chat Application

<div align="center">
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/SpacetimeDB-2.0-purple?style=for-the-badge" alt="SpacetimeDB" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-teal?style=for-the-badge&logo=tailwindcss" alt="Tailwind CSS" />
</div>

<br />

**Dash** is a production-ready, real-time chat application built with React 19, TypeScript, Tailwind CSS, and SpacetimeDB. It features a beautiful "Vapor Clinic" aesthetic with smooth animations and a modern user experience.

## Features

### Core Messaging
- 💬 **Real-time messaging** - Messages sync instantly across all clients
- 👥 **One-on-one & group chats** - Have private conversations or create groups
- ↩️ **Reply & thread support** - Reply to specific messages for context
- ✏️ **Edit & delete** - Edit or delete your messages anytime
- 📌 **Pinned messages** - Pin important messages for easy access

### Reactions & Engagement
- 😊 **Message reactions** - React with emojis to any message
- ✅ **Read receipts** - Know when your messages have been read
- ⌨️ **Typing indicators** - See when someone is typing

### User Experience
- 🟢 **Online/offline status** - See who's currently online
- 🔔 **Mute & archive** - Organize your conversations
- 🔍 **Search** - Search through your messages
- 🌙 **Dark/Light theme** - Choose your preferred theme
- 📱 **Responsive design** - Works on desktop and mobile

### Group Management
- 👑 **Admin roles** - Owners and admins can manage groups
- ➕ **Add/remove members** - Easily manage group membership
- ⚙️ **Group settings** - Customize group name, avatar, and description

## Tech Stack

### Frontend
- **React 19** - Latest React with concurrent features
- **TypeScript 5.7** - Full type safety
- **Vite 6** - Lightning-fast build tool
- **Tailwind CSS 3.4** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Zustand 5** - Lightweight state management
- **Radix UI** - Accessible UI primitives
- **Lucide React** - Beautiful icons
- **emoji-mart** - Emoji picker

### Backend
- **SpacetimeDB 2.0** - Real-time database with built-in server
- **Rust** - SpacetimeDB module written in Rust
- **WebSocket** - Real-time communication

## Project Structure

```
dash/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── auth/          # Authentication components
│   │   │   ├── chat/          # Chat-related components
│   │   │   ├── layout/        # Layout components
│   │   │   ├── modals/        # Modal dialogs
│   │   │   └── ui/            # Reusable UI components
│   │   ├── lib/               # Utilities & SpacetimeDB client
│   │   ├── stores/            # Zustand state stores
│   │   ├── types/             # TypeScript type definitions
│   │   ├── utils/             # Helper functions
│   │   ├── App.tsx            # Root component
│   │   ├── main.tsx           # Entry point
│   │   └── index.css          # Global styles
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── server/                    # SpacetimeDB Rust module
│   ├── src/
│   │   └── lib.rs             # Database schema & reducers
│   └── Cargo.toml
│
└── README.md
```

## Getting Started

### Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **Rust** - [Install](https://rustup.rs/)
- **SpacetimeDB CLI** - Install with:
  ```bash
  curl -sSf https://install.spacetimedb.com | bash
  ```

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dash
   ```

2. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   ```

3. **Build the SpacetimeDB module**
   ```bash
   cd ../server
   spacetime build
   ```

### Running Locally

1. **Start SpacetimeDB local server** (in one terminal)
   ```bash
   spacetime start
   ```

2. **Publish the module** (first time only)
   ```bash
   cd server
   spacetime publish dash-chat
   ```

3. **Start the React development server** (in another terminal)
   ```bash
   cd client
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

### Environment Variables

Create a `.env` file in the `client/` directory:

```env
VITE_SPACETIMEDB_MODULE=dash-chat
VITE_SPACETIMEDB_HOST=ws://127.0.0.1:3000
```

## SpacetimeDB Module

The backend is a SpacetimeDB module written in Rust. It handles:

### Tables
- `User` - User profiles and identity
- `UserSession` - Active sessions
- `UserPresence` - Online/offline status
- `Conversation` - Chat conversations (DMs and groups)
- `ConversationParticipant` - Conversation membership
- `Message` - Chat messages
- `MessageReaction` - Emoji reactions
- `ReadReceipt` - Message read status
- `TypingIndicator` - Who's currently typing
- `FileAttachment` - File attachments (future)
- `Notification` - In-app notifications

### Reducers (API Functions)
- `register_user` - Create user profile
- `update_profile` - Update display name, bio, avatar
- `create_direct_conversation` - Start DM
- `create_group_conversation` - Create group chat
- `send_message` - Send a message
- `edit_message` / `delete_message` - Modify messages
- `add_reaction` / `remove_reaction` - React to messages
- `start_typing` / `stop_typing` - Typing indicators
- And more...

## Design System

Dash uses the "Vapor Clinic" aesthetic from the GEMINI design system:

### Colors
- **Deep Void** `#0A0A14` - Primary background
- **Plasma** `#7B61FF` - Accent color
- **Ghost** `#F0EFF4` - Text color
- **Graphite** `#18181B` - Secondary background

### Typography
- **Sora** - Headings (400-700)
- **Instrument Serif** - Dramatic text (400-500)
- **Fira Code** - Monospace

### Design Features
- Soft rounded corners (2rem-3rem)
- Noise overlay texture
- Glow effects on interactive elements
- Smooth spring animations

## Scripts

### Client
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Server
```bash
spacetime build     # Build the module
spacetime publish   # Publish to SpacetimeDB
spacetime logs      # View server logs
```

## Production Deployment

### SpacetimeDB Cloud
1. Create an account at [SpacetimeDB](https://spacetimedb.com)
2. Publish your module:
   ```bash
   spacetime publish dash-chat --host <your-host>
   ```

### Frontend
1. Update `.env` with production SpacetimeDB host
2. Build the frontend:
   ```bash
   npm run build
   ```
3. Deploy the `dist/` folder to your hosting provider

## Contributing

Contributions are welcome! Please read our contributing guidelines and code of conduct before submitting PRs.

## License

MIT License - see LICENSE file for details.

---

<div align="center">
  Built with ❤️ using SpacetimeDB
</div>
