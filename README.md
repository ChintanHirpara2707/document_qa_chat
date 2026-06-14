# 📄 PDF Chat — AI-Powered Document Assistant

> Upload any PDF and have an intelligent conversation with its contents — powered by Google Gemini 2.5 Flash.

---

## 🚀 Live Demo

> _Deploy your own instance using the steps below._

---

## ✨ Features

- **Drag & Drop Upload** — Instantly upload any text-based PDF via drag-and-drop or file picker
- **Full-Document AI Context** — The entire PDF text is injected into the AI's context (no chunking, no RAG, no embeddings)
- **Conversational Chat** — Multi-turn conversation with memory of previous messages
- **Smart Starter Chips** — Pre-built question prompts like "Summarize this document" to get started instantly
- **Rich Markdown Rendering** — AI responses render bold text, code blocks, ordered & unordered lists inline
- **Document Stats Sidebar** — View file size, page count, and character count at a glance
- **Extracted Text Preview** — See exactly what text was parsed from your PDF before chatting
- **Typing Indicator** — Animated bouncing dots while the AI is generating a response
- **Responsive UI** — Clean two-panel layout with custom thin scrollbars and smooth fade-in animations

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14+](https://nextjs.org/) (App Router) |
| UI | [React](https://react.dev/) + [Tailwind CSS](https://tailwindcss.com/) |
| AI Model | [Google Gemini 2.5 Flash](https://ai.google.dev/) |
| PDF Parsing | [`pdf-parse`](https://www.npmjs.com/package/pdf-parse) + PDF.js |
| Language | TypeScript |

---

## 📁 Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── parse-pdf/
│   │   │   │   └── route.ts        # PDF text extraction endpoint
│   │   │   └── chat/
│   │   │       └── route.ts        # Gemini AI chat endpoint
│   │   ├── globals.css             # Custom scrollbars, animations, CSS variables
│   │   ├── layout.tsx              # Root layout with metadata
│   │   └── page.tsx                # Main application UI
│   └── types/
│       └── pdf-parse.d.ts          # Type declarations for pdf-parse
├── .env.local                      # Environment variables (not committed)
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

- **Node.js** v18 or higher
- A **Google Gemini API Key** — get one free at [Google AI Studio](https://aistudio.google.com/app/apikey)

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Then open `.env.local` and add your API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

> 🔑 Get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 4. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 How to Use

1. **Upload a PDF** — Drag and drop a `.pdf` file onto the upload area, or click to browse.
2. **Review Parsing Stats** — The sidebar shows page count, file size, and character count.
3. **Start Chatting** — Click a starter chip or type your own question about the document.
4. **Iterate** — Ask follow-up questions; the AI maintains the full conversation history.

> ✅ Works best with text-based PDFs (e.g. resumes, research papers, documentation, articles). Scanned image-only PDFs are not supported.

---

## 🔌 API Reference

### `POST /api/parse-pdf`

Accepts a `multipart/form-data` request with a PDF file and returns extracted text.

**Request:**
```
Content-Type: multipart/form-data
Body: { file: <PDF file> }
```

**Response:**
```json
{
  "text": "Extracted plain text content...",
  "pages": 12
}
```

---

### `POST /api/chat`

Accepts the full PDF text and conversation history, returns an AI response from Gemini.

**Request:**
```json
{
  "pdfText": "Full extracted PDF content...",
  "messages": [
    { "role": "user", "content": "Summarize this document" }
  ]
}
```

**Response:**
```json
{
  "reply": "This document discusses..."
}
```

---

## 🔧 Known Issues & Fixes Applied

| Issue | Root Cause | Fix Applied |
|---|---|---|
| `Setting up fake worker failed` | Next.js/Turbopack relocates modules, breaking PDF.js worker auto-detection | Explicitly set worker path via `PDFParse.setWorker(...)` using an absolute file URL |
| `First content should be with role 'user'` | Gemini API rejects chat history starting with an `assistant` message | Slice history from the first `user` message before sending to Gemini |
| React hydration mismatch | Browser extensions inject attributes into `<body>` before React hydrates | Added `suppressHydrationWarning` to the root `<html>` element |
| Gemini model 404 error | API key lacks access to legacy `gemini-1.5-flash` | Updated model to `gemini-2.5-flash` |
---

## 🙌 Acknowledgements

- [Google Gemini](https://ai.google.dev/) for the AI backbone
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) for PDF text extraction
- [Next.js](https://nextjs.org/) for the full-stack framework
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
