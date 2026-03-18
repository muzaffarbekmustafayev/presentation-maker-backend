# Presentation Maker — Backend

Node.js + Express REST API for the Presentation Maker app.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express 5
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT + bcryptjs
- **AI:** Google Gemini (`@google/genai`), OpenAI
- **File handling:** Multer, PDFKit, PptxGenJS

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/presentation-maker
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
```

### 3. Run the server

```bash
npm start
```

Server runs on `http://localhost:5000` by default.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/presentations` | Get all presentations |
| POST | `/api/presentations` | Create presentation |
| PUT | `/api/presentations/:id` | Update presentation |
| DELETE | `/api/presentations/:id` | Delete presentation |

## Project Structure

```
backend/
├── index.js          # Entry point
├── routes/
│   ├── auth.js
│   └── presentation.js
├── models/
│   ├── User.js
│   └── Presentation.js
├── middleware/
│   └── auth.js
└── uploads/          # Uploaded files
```
