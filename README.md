# 🧠 OpsMind AI – Context-Aware Knowledge Assistant

![RAG](https://img.shields.io/badge/AI-RAG-blue)
![MERN](https://img.shields.io/badge/Stack-MERN-green)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-brightgreen)
![Gemini](https://img.shields.io/badge/LLM-Gemini-orange)
![License](https://img.shields.io/badge/License-Educational-lightgrey)

OpsMind AI is a **production-style Retrieval Augmented Generation (RAG) system** built using the **MERN stack**.  
It allows users to upload PDF documents, index them into a vector database, and ask questions that are answered using the content of those documents.

The system ensures **accurate AI responses grounded in source material**, reducing the time spent searching through large document repositories.

---

# 🌐 Live Demo

🔗 https://opsmindrag.netlify.app/

---

# 📌 Project Overview

Organizations store critical knowledge across multiple documents such as:

- Standard Operating Procedures (SOPs)
- Research Papers
- Technical Documentation
- Policies & Manuals

Searching through these manually can be slow and inefficient.

**OpsMind AI solves this problem by implementing a Retrieval Augmented Generation pipeline** that enables users to ask natural language questions and receive **AI-powered answers backed by document context**.

---

# 🚀 Key Features

## 📄 Document Ingestion

- Upload PDF documents
- Automatic PDF parsing
- Smart text chunking with overlap
- Embedding generation using **Gemini Embedding Model**

---

## 🔎 Intelligent Retrieval

- MongoDB Atlas **Vector Search**
- Semantic similarity search
- Context retrieval from indexed documents
- Multi-document knowledge base support

---

## 💬 AI Chat Interface

- Conversational chat interface
- Streaming responses using **Server Sent Events (SSE)**
- Context-aware follow-up questions
- Hallucination guard to avoid unsupported answers

---

## 📑 Citation Engine

Every AI response includes:

- **Source document filename**
- **Page number**
- **Similarity score**

This ensures answers are **transparent, verifiable, and traceable to the original document**.

---

## 📊 Admin Analytics Dashboard

The system includes an **admin dashboard** that provides insights into system usage.

Analytics include:

- Total conversations
- Total indexed documents
- Average confidence score
- Most queried documents
- Confidence trend over time
- User activity insights

---

# 🛠 Technology Stack

## Frontend
- React
- Tailwind CSS
- React Router
- Streaming UI updates

## Backend
- Node.js
- Express.js
- JWT Authentication
- Multer (PDF upload handling)

## AI & Vector Search
- Google Gemini API
- Gemini Embedding Model
- MongoDB Atlas Vector Search

## Database
- MongoDB Atlas

## Infrastructure
- Docker
- Netlify (Frontend hosting)
- Render (Backend hosting)

---

# 🏗 System Architecture

User Query
↓
React Chat Interface
↓
Node.js API (Express)
↓
PDF Parsing & Chunking
↓
Embedding Generation
↓
MongoDB Atlas Vector Storage
↓
Vector Similarity Search
↓
Context Retrieval
↓
Gemini LLM Response
↓
Streaming Answer + Citations
---

# ⚙️ RAG Pipeline

1️⃣ User uploads a PDF document  
2️⃣ Backend parses the document  
3️⃣ Text is split into overlapping chunks  
4️⃣ Each chunk is converted into vector embeddings  
5️⃣ Embeddings are stored in MongoDB Atlas  
6️⃣ User asks a question  
7️⃣ Query embedding is generated  
8️⃣ Vector search retrieves relevant chunks  
9️⃣ Retrieved context is sent to the LLM  
🔟 AI generates a grounded answer  

---

# 💡 Example Queries

- *What does Experiment 3 explain?*  
- *Explain normalization in DBMS.*  
- *Summarize the uploaded document.*  
- *What is the aim of this experiment?*

---

# 👨‍💻 Author

**Tanmay Paliwal**

B.Tech Computer Science  
NMIMS Indore

### Skills Demonstrated

- MERN Stack Development
- Retrieval Augmented Generation (RAG)
- Vector Databases
- AI-powered Applications
- Full-stack System Design

---

# 📄 License

This project is created for **educational and demonstration purposes**.
