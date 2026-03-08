# RACATOM Loan Management Information System (RACATOM-LMIS)

A full-stack web application for managing loans, collections, disbursements, and client records for RACATOM (RCT) lending operations.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 7, Ant Design 5 |
| **Backend** | Node.js, Express 5 |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **Authentication** | JWT (access + refresh), bcrypt, HttpOnly cookies |
| **Storage** | CryptoJS-encrypted localStorage/sessionStorage |
| **File Storage** | Google Drive API |
| **PDF Generation** | jsPDF + jspdf-autotable |
| **Excel Export** | ExcelJS |
| **Email** | Nodemailer (Gmail SMTP) |
| **Date Handling** | Day.js |

## Quick Start

### Prerequisites

- Node.js >= 18
- npm >= 9
- MongoDB Atlas cluster (or local MongoDB)
- Gmail account with App Password (for email features)
- Google Drive API credentials (for document storage)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd racatom-lmis

# Install server dependencies
cd server
npm install

# Install front-end dependencies
cd ../front-end
npm install
```

### Environment Variables

Create `server/.env`:

```env
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<db>?retryWrites=true&w=majority
JWT_SECRET=<your-secure-jwt-secret>
REFRESH_SECRET=<your-separate-refresh-secret>
NODE_ENV=development
PORT=5000
EMAIL_USER=<your-gmail>@gmail.com
EMAIL_PASS=<gmail-app-password>
APP_NAME=RCT Loan Management System
FRONTEND_URL=http://localhost:5173
```

Create `front-end/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_ENCRYPT_SECRET=<your-encryption-key>
```

### Running Development

```bash
# Terminal 1: Start the server
cd server
npm run dev

# Terminal 2: Start the front-end
cd front-end
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

### Building for Production

```bash
cd front-end
npm run build
```

## Project Structure

```
racatom-lmis/
├── front-end/           # React SPA
│   ├── src/
│   │   ├── components/  # Shared components (ProtectedRoute)
│   │   ├── context/     # React contexts (DevSettings, Theme)
│   │   ├── pages/       # Page components organized by feature
│   │   │   ├── Collections/
│   │   │   ├── Dashboard/
│   │   │   ├── Home/        # Main layout shell
│   │   │   ├── Loans/
│   │   │   ├── Login/       # Login, ForgotPassword, ResetPassword, VerifyEmail
│   │   │   ├── Reports/     # SOA, Collections, Vouchers, Demand Letters
│   │   │   └── Settings/    # Employees, Collectors, Database, Developer
│   │   └── utils/       # Axios, storage, exports, caching
│   └── public/
├── server/              # Express API
│   ├── controllers/     # Business logic
│   ├── middleware/       # Auth, permissions, validation
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express route definitions
│   ├── scripts/         # Migration & seed scripts
│   ├── secrets/         # Google Drive credentials (gitignored)
│   └── utils/           # Email, Google Drive, runtime flags
└── docs/                # Documentation
```

## Documentation

- [Developer Guide](docs/DEVELOPER.md) — Architecture, API reference, security model
- [User Guide](docs/USER_GUIDE.md) — End-user documentation for all features

## License

Proprietary — RACATOM Internal Use Only
