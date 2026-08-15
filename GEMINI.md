# GEMINI.md — Financial Assistance Management System
> This file provides full project context. Read this before generating any code.

---

## Project identity

**Full title:** Financial Assistance Management System: A Mobile-First Portal for Centralized Discovery, Digital Application, and Real-Time Aid Tracking

**Short name:** FAMS

**Type:** BSIT Capstone Project — Surigao del Norte State University

**Target users:**
- Students applying for scholarships
- Barangay residents applying for community financial aid
- Admins (barangay officials / school administrators)

---

## Tech stack — never deviate from this

| Layer | Technology |
|---|---|
| Frontend | React.js (Vite), mobile-first, Single Page Application |
| Backend | Node.js + Express.js (REST API) |
| Database | MongoDB + Mongoose |
| File storage | Cloudinary via Multer middleware |
| Authentication | JWT stored in httpOnly cookies |
| Authorization | Role-Based Access Control (RBAC) — roles: student, resident, admin |
| Notifications | Firebase Cloud Messaging (FCM) |
| Styling | Tailwind CSS, mobile-first breakpoints |
| Package manager | npm |

---

## Project folder structure

Always follow this structure when generating files:

```
fams/
├── client/                  # React frontend
│   ├── public/
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/           # Full page components
│       │   ├── auth/        # Login, Register
│       │   ├── dashboard/   # Student/Resident dashboard
│       │   ├── programs/    # Aid program listing and details
│       │   ├── apply/       # Multi-step application form
│       │   ├── applications/# My applications + status tracker
│       │   └── admin/       # Admin dashboard, manage programs, reports
│       ├── context/         # AuthContext, NotificationContext
│       ├── hooks/           # Custom React hooks
│       ├── services/        # Axios API calls
│       └── utils/           # Helpers, constants
│
├── server/                  # Node/Express backend
│   ├── config/              # DB connection, Cloudinary config, FCM config
│   ├── controllers/         # Route logic
│   ├── middleware/          # Auth middleware, RBAC middleware, error handler
│   ├── models/              # Mongoose schemas
│   ├── routes/              # Express route definitions
│   └── utils/               # Token helpers, notification helpers
│
├── .env                     # Environment variables (never commit this)
├── .gitignore
└── package.json             # Root package (if using monorepo)
```

---

## MongoDB schemas — always use these exact field names

### User
```js
{
  name: String,
  email: { type: String, unique: true },
  password: String,           // bcrypt hashed
  role: { type: String, enum: ['student', 'resident', 'admin'] },
  // student-specific
  studentID: String,
  course: String,
  yearLevel: Number,
  // resident-specific
  barangay: String,
  contactNo: String,
  aidCategory: String,
  // admin-specific
  office: String,
  adminLevel: String,
  createdAt: Date
}
```

### AidProgram
```js
{
  title: String,
  description: String,
  eligibility: String,
  slots: Number,
  deadline: Date,
  category: { type: String, enum: ['scholarship', 'barangay', 'emergency'] },
  status: { type: String, enum: ['active', 'closed'] },
  createdBy: { type: ObjectId, ref: 'User' },
  createdAt: Date
}
```

### Application
```js
{
  applicant: { type: ObjectId, ref: 'User' },
  program: { type: ObjectId, ref: 'AidProgram' },
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'approved', 'denied', 'cash_released'],
    default: 'submitted'
  },
  personalInfo: {
    fullName: String,
    address: String,
    contactNo: String,
    birthdate: Date
  },
  documents: [{ type: ObjectId, ref: 'Document' }],
  remarks: String,
  submittedAt: { type: Date, default: Date.now },
  updatedAt: Date
}
```

### Document
```js
{
  application: { type: ObjectId, ref: 'Application' },
  uploader: { type: ObjectId, ref: 'User' },
  docType: { type: String, enum: ['valid_id', 'certificate_of_indigency', 'grades', 'other'] },
  fileURL: String,           // Cloudinary secure URL
  publicID: String,          // Cloudinary public ID for deletion
  uploadedAt: { type: Date, default: Date.now }
}
```

### Notification
```js
{
  recipient: { type: ObjectId, ref: 'User' },
  message: String,
  type: { type: String, enum: ['status_update', 'new_program', 'action_required', 'general'] },
  isRead: { type: Boolean, default: false },
  relatedApplication: { type: ObjectId, ref: 'Application' },
  sentAt: { type: Date, default: Date.now }
}
```

---

## API routes — always follow this structure

### Auth routes — /api/auth
```
POST   /api/auth/register        Register new user (student or resident)
POST   /api/auth/login           Login, returns JWT in httpOnly cookie
POST   /api/auth/logout          Clear cookie
GET    /api/auth/me              Get current logged-in user
```

### Aid program routes — /api/programs
```
GET    /api/programs             Get all active programs (public)
GET    /api/programs/:id         Get single program details
POST   /api/programs             Admin only — create program
PUT    /api/programs/:id         Admin only — update program
DELETE /api/programs/:id         Admin only — delete program
```

### Application routes — /api/applications
```
GET    /api/applications         Get current user's applications
GET    /api/applications/:id     Get single application details
POST   /api/applications         Submit new application
PUT    /api/applications/:id/status   Admin only — update status + remarks
DELETE /api/applications/:id     Cancel application (user only, if status = submitted)
```

### Document routes — /api/documents
```
POST   /api/documents/upload     Upload document to Cloudinary (Multer)
DELETE /api/documents/:id        Delete document from Cloudinary
```

### Notification routes — /api/notifications
```
GET    /api/notifications        Get current user's notifications
PUT    /api/notifications/:id/read   Mark single notification as read
PUT    /api/notifications/read-all   Mark all as read
```

### Admin routes — /api/admin
```
GET    /api/admin/users          Get all users
GET    /api/admin/applications   Get all applications (with filters)
GET    /api/admin/reports        Get summary stats (users, programs, applications)
```

---

## Authentication and RBAC rules

- All routes except `/api/auth/register`, `/api/auth/login`, and `GET /api/programs` require a valid JWT
- JWT is stored in an **httpOnly cookie** named `fams_token`
- Token payload: `{ id, role, name }`
- RBAC middleware checks `req.user.role` before allowing access
- Role hierarchy:
  - `student` — can browse programs, submit applications, track own status, receive notifications
  - `resident` — same as student
  - `admin` — can do everything above PLUS manage programs, review all applications, generate reports

---

## UI screens to build (in order of priority)

### Priority 1 — must have for partial system demo
1. **Login screen** — email/studentID + password, JWT login, redirect based on role
2. **Register screen** — choose role (student or resident), fill profile fields based on role
3. **Dashboard** — welcome message, calendar with deadlines, search bar, Discovery Feed with matched programs
4. **Aid program listing** — cards showing title, deadline, slots left, Apply Now button

### Priority 2 — core functionality
5. **Application form** — 3-step wizard: Personal Info → Upload Documents → Review & Submit
6. **My Applications** — list of submitted applications with 4-stage status progress bar
7. **Application detail** — full details, documents uploaded, admin remarks

### Priority 3 — admin side
8. **Admin dashboard** — total users, drivers, bookings, today's summary
9. **Manage programs** — create, edit, delete aid programs
10. **Review applications** — list all applications, filter by status, update status + add remarks
11. **Reports** — summary stats, export

---

## UI design rules — always follow these

- **Mobile-first** — design for 375px width first, then scale up
- **Color scheme** — high contrast black and white, minimal color accents
- **Font** — clean sans-serif (Inter or system font)
- **Bottom navigation bar** — Dashboard, Applications, Status (for student/resident)
- **All forms** — clear labels, inline validation, loading states on submit buttons
- **Status colors:**
  - Submitted — gray
  - Under Review — blue
  - Approved — green
  - Denied — red
  - Cash Released — dark green
- **Document upload slots** — clearly labeled by document type, show upload progress
- **File constraints** — PDF or JPEG only, max 5MB per file

---

## Environment variables needed (.env)

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/fams

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d
COOKIE_EXPIRE=7

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY=your_private_key
```

---

## Coding rules — always follow these

1. Use **async/await** with try/catch — never .then().catch()
2. All API responses follow this format:
```js
// Success
res.status(200).json({ success: true, data: result })

// Error
res.status(400).json({ success: false, message: 'Error message here' })
```
3. Always validate request body before processing
4. Never store plain text passwords — always bcrypt hash
5. Never expose JWT secret or Cloudinary credentials in frontend code
6. Use Mongoose `.populate()` for relational data
7. Always add loading and error states in React components
8. Use React Context for auth state — never store JWT in localStorage
9. All Axios calls go in `/client/src/services/` — never directly in components
10. Use `.env` for all secrets — never hardcode

---

## Build order for this week (partial system demo)

Follow this exact sprint to have something working by next week:

**Day 1 — Setup**
- Initialize project structure (client + server folders)
- Setup MongoDB connection
- Setup Express server with CORS, cookie-parser, dotenv
- Create User model and auth routes (register, login, logout, /me)
- Test with Postman

**Day 2 — Core backend**
- Create AidProgram model and routes
- Create Application model and routes
- Create Document model + Cloudinary upload route
- Add JWT middleware and RBAC middleware

**Day 3 — Frontend auth**
- Initialize React with Vite
- Setup Tailwind CSS
- Build Login screen
- Build Register screen with role selection
- Connect to auth API, store JWT via cookie

**Day 4 — Dashboard + Programs**
- Build Dashboard screen with discovery feed
- Build AidProgram listing with cards
- Connect to /api/programs

**Day 5 — Application flow**
- Build 3-step application form
- Build document upload with Cloudinary
- Build My Applications screen with status tracker

**Day 6 — Admin side**
- Build Admin dashboard
- Build application review screen
- Add status update functionality

**Day 7 — Polish + demo prep**
- Add loading states, error handling
- Seed database with sample programs and users
- Test full flow end to end
- Prepare demo walkthrough

---

## Sample seed data — use this for demo

### Sample aid programs
```js
[
  {
    title: "SNSU Academic Excellence Scholarship",
    description: "Full scholarship for students with GWA of 1.5 or higher.",
    eligibility: "SNSU student, GWA 1.5+, no failing grades",
    slots: 20,
    deadline: new Date("2024-12-15"),
    category: "scholarship",
    status: "active"
  },
  {
    title: "Barangay Livelihood Assistance Fund",
    description: "Financial aid for barangay residents seeking livelihood support.",
    eligibility: "Registered barangay resident, low-income household",
    slots: 50,
    deadline: new Date("2024-12-30"),
    category: "barangay",
    status: "active"
  },
  {
    title: "Emergency Medical Assistance",
    description: "Immediate financial aid for residents with medical emergencies.",
    eligibility: "Barangay resident with medical certificate",
    slots: 15,
    deadline: new Date("2024-12-31"),
    category: "emergency",
    status: "active"
  }
]
```

### Sample admin account
```js
{
  name: "Admin User",
  email: "admin@fams.com",
  password: "admin123",   // bcrypt this before seeding
  role: "admin",
  office: "Barangay Hall",
  adminLevel: "super"
}
```

---

## What NOT to do

- Do NOT use localStorage for JWT — use httpOnly cookies only
- Do NOT use class components in React — use functional components with hooks only
- Do NOT use inline styles — use Tailwind CSS classes
- Do NOT create separate CSS files unless absolutely necessary
- Do NOT use Redux — use React Context instead
- Do NOT skip error handling in any route
- Do NOT use `var` — use `const` and `let` only
- Do NOT generate placeholder lorem ipsum content — use realistic Filipino/local names and barangay names

---

## How to start the project

```bash
# Clone or create project folder
mkdir fams && cd fams

# Setup server
mkdir server && cd server
npm init -y
npm install express mongoose dotenv bcryptjs jsonwebtoken cookie-parser cors multer cloudinary firebase-admin

# Setup client
cd ..
npm create vite@latest client -- --template react
cd client
npm install
npm install axios react-router-dom tailwindcss @tailwindcss/vite

# Start both (from root)
# Terminal 1 — server
cd server && node index.js

# Terminal 2 — client
cd client && npm run dev
```
