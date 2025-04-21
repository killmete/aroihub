# AroiHub - Restaurant Review Application

<div align="center">
  <img src="./frontend/src/assets/logo.svg" alt="AroiHub Logo" width="200" />
  <p><i>Your gateway to authentic culinary experiences</i></p>
</div>

## Overview

AroiHub is a modern restaurant review platform designed to help users discover, rate, and review restaurants in Thailand. The name "Aroi" (อร่อย) means "delicious" in Thai, highlighting our focus on connecting food lovers with delicious dining experiences.

## Features

### For Users
- **Restaurant Discovery**: Browse, search, and filter restaurants by cuisine type, ratings, and more
- **Detailed Restaurant Profiles**: View comprehensive information including images, menus, opening hours, and location
- **Rating System**: Rate restaurants on a 5-star scale
- **Review Management**: Write, edit, and delete your own reviews
- **Review Images**: Upload multiple photos with your reviews to showcase your dining experience
- **Social Interaction**: Like and interact with other users' reviews
- **User Profiles**: Customize your profile and view your review history
- **Responsive Design**: Fully optimized for both desktop and mobile devices

### For Restaurant Owners and Admins
- **Restaurant Management**: Add, edit, and manage restaurant listings
- **Admin Dashboard**: Monitor platform activity and user engagement
- **Banner Management**: Customize promotional banners for the platform
- **Image Management**: Upload and organize restaurant images

## Tech Stack

### Frontend
- **Framework**: React with TypeScript
- **State Management**: React Context API
- **Routing**: React Router
- **UI Components**: Custom components with Tailwind CSS and shadcn/ui
- **Form Handling**: React Hook Form
- **Image Upload & Manipulation**: Drag-and-drop with cropping capabilities
- **HTTP Client**: Fetch API

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js with TypeScript
- **Authentication**: JWT (JSON Web Tokens)
- **Databases**: 
  - PostgreSQL (user accounts, restaurant data)
  - MongoDB (reviews and user-generated content)
- **File Storage**: Cloudinary (images)
- **Validation**: Express Validator
- **Logging**: Custom logger implementation

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- PostgreSQL
- MongoDB

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/aroihub.git
cd aroihub
```

2. Install dependencies for all parts of the application:
```bash
npm run install-all
```

3. Set up environment variables:
   
   Create a `.env` file in the `backend` directory with the following variables:
```
# Server
PORT=5000
NODE_ENV=development

# PostgreSQL Database
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=yourpassword
PG_DATABASE=aroihub

# MongoDB
MONGODB_URI=mongodb://localhost:27017/aroihub

# JWT Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=24h

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

4. Initialize the databases:
   - Set up your PostgreSQL database
   - Ensure MongoDB is running

5. Start the development servers:
```bash
npm run dev
```

This will start both the frontend and backend servers concurrently.
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## Development

### Scripts
- `npm run dev` - Start both frontend and backend in development mode
- `npm run server` - Start only the backend server
- `npm run client` - Start only the frontend client
- `npm run build` - Build both frontend and backend for production
- `npm run install-all` - Install dependencies for root, frontend, and backend

## Project Structure

```
aroihub/
├── frontend/                # React frontend application
│   ├── src/
│   │   ├── assets/          # Static assets
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React context providers
│   │   ├── layouts/         # Layout components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service modules
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   └── ...
│
├── backend/                  # Express backend application
│   ├── src/
│   │   ├── controllers/     # Request controllers
│   │   ├── db/              # Database connections
│   │   ├── middleware/      # Express middleware
│   │   ├── models/          # Data models
│   │   ├── routes/          # API routes
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   └── ...
│
└── package.json             # Root package.json for scripts
```

## License

[MIT](LICENSE)

## Acknowledgements
- All images and restaurant data included in this project are for demonstration purposes only
- Icons provided by Lucide Icons
- UI components adapted from shadcn/ui

---

<div align="center">
  <p>Made with ❤️ by AroiHub Team</p>
</div>
