# AroiHub - Restaurant Review Application

<div align="center">
  <img src="./frontend/src/assets/logo.svg" alt="AroiHub Logo" width="200" />
  <p><i>Your gateway to authentic culinary experiences</i></p>
</div>

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Installation and Setup](#installation-and-setup)
6. [Project Structure](#project-structure)
7. [API Documentation](#api-documentation)
8. [Frontend Components](#frontend-components)
9. [Database Models](#database-models)
10. [Authentication Flow](#authentication-flow)
11. [Development Workflow](#development-workflow)
12. [Deployment](#deployment)
13. [Security Considerations](#security-considerations)
14. [Testing](#testing)
15. [License](#license)
16. [Acknowledgements](#acknowledgements)

## Overview

AroiHub is a modern restaurant review platform designed to help users discover, rate, and review restaurants in Thailand. The name "Aroi" (อร่อย) means "delicious" in Thai, highlighting our focus on connecting food lovers with authentic culinary experiences.

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

## Architecture

AroiHub follows a modern web application architecture:

1. **Frontend**: React SPA (Single Page Application) with TypeScript
2. **Backend**: Express.js REST API server
3. **Databases**: 
   - PostgreSQL for structured data (users, restaurants)
   - MongoDB for unstructured data (reviews, banners)
4. **External Services**: Cloudinary for image storage
5. **Authentication**: JWT-based authentication flow

### Data Flow
1. User interacts with React components
2. React components use services to communicate with API
3. Express API processes requests through controllers
4. Controllers interact with database models
5. Responses are returned to the frontend
6. Frontend updates the UI accordingly

## Installation and Setup

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

## Project Structure

```
aroihub/
├── frontend/                # React frontend application
│   ├── src/
│   │   ├── assets/          # Static assets (images, SVGs)
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React context providers
│   │   ├── layouts/         # Layout components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service modules
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions (including logger)
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
│   │   └── utils/           # Utility functions (including logger)
│   └── ...
│
└── package.json             # Root package.json for scripts
```

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| POST | /api/auth/register | Register new user | No |
| POST | /api/auth/login | Log in | No |
| GET | /api/auth/me | Get current user | Yes |
| POST | /api/auth/logout | Logout user | Yes |

### User Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| GET | /api/users/:id | Get user by ID | Yes |
| PUT | /api/users/:id | Update user | Yes |
| DELETE | /api/users/:id | Delete user | Yes (admin) |
| GET | /api/users | Get all users | Yes (admin) |

### Restaurant Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| GET | /api/restaurants | Get all restaurants | No |
| GET | /api/restaurants/:id | Get restaurant by ID | No |
| POST | /api/restaurants | Create restaurant | Yes (admin) |
| PUT | /api/restaurants/:id | Update restaurant | Yes (admin) |
| DELETE | /api/restaurants/:id | Delete restaurant | Yes (admin) |
| GET | /api/restaurants/top-rated | Get top rated restaurants | No |
| GET | /api/restaurants/newest | Get newest restaurants | No |

### Review Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| GET | /api/restaurants/:restaurantId/reviews | Get restaurant reviews | No |
| GET | /api/users/:userId/reviews | Get user reviews | No |
| GET | /api/reviews/:id | Get review by ID | No |
| POST | /api/reviews | Create review | Yes |
| PUT | /api/reviews/:id | Update review | Yes |
| DELETE | /api/reviews/:id | Delete review | Yes |
| POST | /api/reviews/:id/like | Toggle like on review | Yes |

### Banner Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| GET | /api/banners/active | Get active banners | No |
| GET | /api/admin/banners | Get all banners | Yes (admin) |
| POST | /api/admin/banners | Create banner | Yes (admin) |
| PUT | /api/admin/banners/:id | Update banner | Yes (admin) |
| DELETE | /api/admin/banners/:id | Delete banner | Yes (admin) |
| PUT | /api/admin/banners/:id/toggle | Toggle banner status | Yes (admin) |
| POST | /api/admin/banners/upload | Upload banner image | Yes (admin) |

## Frontend Components

### Core Components
- **Navbar**: Main navigation component
- **Footer**: Site footer with links and information
- **LoadingBar**: Progress indicator for API operations
- **AdminRoute**: Protected route component for admin pages
- **ProtectedRoute**: Protected route component for authenticated users
- **ScrollToTop**: Utility component for scrolling to top on route change
- **DraggableImageGallery**: Component for arranging images
- **ImageCropper**: Component for cropping uploaded images

### Page Components
- **Home**: Landing page with featured restaurants and banners
- **LoginPage/RegisterPage**: Authentication pages
- **RestaurantDetails**: Restaurant information page
- **AddReview**: Review submission form
- **ProfilePage**: User profile management
- **Admin pages**: Various administrative interfaces

## Database Models

### PostgreSQL Models

#### User Model
```
- id (PK)
- username
- email
- password_hash
- first_name
- last_name
- avatar_url
- role
- created_at
- updated_at
```

#### Restaurant Model
```
- id (PK)
- name
- description
- address
- cuisine_type
- price_range
- operating_hours
- cover_image
- images
- average_rating
- review_count
- created_at
- updated_at
```

### MongoDB Models

#### Review Model
```
- _id (PK)
- user (FK)
- restaurant (FK)
- rating
- comment
- images
- likes
- likedBy
- helpful_count
- isDeleted
- timestamps
```

#### Banner Model
```
- _id (PK)
- image_url
- is_active
- display_order
- created_at
- updated_at
```

## Authentication Flow

1. **Registration**:
   - User submits registration form
   - Server validates data
   - Password is hashed
   - User record created in PostgreSQL
   - JWT token generated and returned

2. **Login**:
   - User submits credentials
   - Server validates credentials
   - JWT token generated and returned
   - Token stored in localStorage

3. **Authentication**:
   - JWT token included in Authorization header
   - Server validates token on protected routes
   - Access granted or denied based on token validity

4. **Authorization**:
   - User roles (user, admin) determine access levels
   - Admin middleware restricts admin routes

## Development Workflow

### Scripts
- `npm run dev` - Start both frontend and backend in development mode
- `npm run server` - Start only the backend server
- `npm run client` - Start only the frontend client
- `npm run build` - Build both frontend and backend for production
- `npm run install-all` - Install dependencies for root, frontend, and backend

### Development Process
1. Create feature branch from main/master
2. Implement and test feature
3. Submit pull request for review
4. Merge to main/master after approval

## Deployment

### Frontend Deployment 
1. Build the frontend: `npm run build`
2. Deploy the build folder to your hosting provider
3. Configure environment variables

### Backend Deployment
1. Build TypeScript code: `npm run build`
2. Deploy compiled code to your hosting provider
3. Configure environment variables
4. Set up database connections
5. Start server: `npm start`

## Security Considerations

- **JWT Secret**: Stored securely in environment variables
- **Password Hashing**: Using bcrypt for secure password storage
- **Rate Limiting**: Implemented on critical endpoints
- **Input Validation**: Express Validator used for request validation
- **CORS**: Configured to allow only specified origins
- **Helmet**: Used to set security HTTP headers

## Testing

Currently, testing infrastructure is planned but not fully implemented. Future implementation will include:

- **Unit Tests**: For individual functions and components
- **Integration Tests**: For API endpoints and data flow
- **E2E Tests**: For complete user flows

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
