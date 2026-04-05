# Avatar Lab 🎥✨

Avatar Lab is a comprehensive full-stack application designed to generate AI-driven talking avatar videos from text and images. It provides multiple ways to create avatars, including completely localized generation using open-source models (SadTalker and StyleTTS2) as well as integration with the commercial HeyGen API for high-fidelity avatars.

---

## 🌟 Features

- **Custom Avatar Generation**: Upload an image and add text, and let the AI generate a realistic talking head video.
- **Local AI Models Pipeline**:
  - Uses **StyleTTS2** for highly realistic synthesized text-to-speech (TTS).
  - Uses **SadTalker** for animating the static face image to match the spoken words.
  - Generates completely on your local machine without external API limits.
- **HeyGen Integration**: Seamless integration with the HeyGen API for commercial-grade avatar video generation.
- **Rich User Interface**: A modern, highly interactive frontend built with React, Tailwind CSS, Framer Motion, and 3D Spline elements.
- **Project History**: Save, track, and re-watch your previously generated avatar videos, powered by a MongoDB database.
- **Secure Authentication**: Register and log in securely via JWT authentication.

---

## 🏗️ Architecture & Tech Stack

This project follows a microservices-style architecture, decoupled into three distinct components:

### 1. Frontend Client (`/client`)
Provides a highly interactive, animated user interface.
- **Core Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, Radix UI
- **Animations**: Framer Motion, GSAP, `@splinetool/react-spline`
- **Routing**: React Router DOM

### 2. Backend Server (`/server`)
Acts as the central coordinator, database manager, and proxy.
- **Core Framework**: Node.js, Express.js, TypeScript
- **Database**: MongoDB & Mongoose
- **Authentication**: JWT & bcryptjs
- **File Handling**: Multer for handling video/audio uploads and static file serving.

### 3. AI Model Server (`/model-server`)
Handles computationally expensive AI tasks (TTS and Image Animation).
- **Core Framework**: Python, FastAPI, Uvicorn
- **AI Models**: StyleTTS2 (Speech Synthesis), SadTalker (Facial Animation), GFPGAN (Face Restoration)

---

## 📂 Project Structure

```
Avatar_Lab/
├── client/              # Frontend React application
├── server/              # Node.js backend (API, Auth, Database)
├── model-server/        # Python FastAPI model inference server
│   ├── SadTalker/       # Submodule for facial animation
│   └── StyleTTS2/       # Submodule for text-to-speech synthesis
├── project_overview.txt # Detailed project architecture documentation
└── README.md            # You are here
```

---

## 🚀 Getting Started

To get the entire stack running, you need to spin up all three components. Ensure you have **Node.js**, **Python 3.10+**, **MongoDB**, and **ffmpeg** installed on your system.

### 1. Setup the Backend Server
```bash
cd server
npm install
# Set up your .env file with your MONGO_URI, JWT_SECRET, and HEYGEN_API_KEY
npm run dev
```

### 2. Setup the Frontend Client
```bash
cd client
npm install
npm run dev
```

### 3. Setup the AI Model Server
*Note: Due to the AI dependencies, setting up a virtual environment (like Anaconda or venv) is highly recommended. You will need a capable NVIDIA GPU for efficient generation.*
```bash
cd model-server
python -m venv venv
source venv/Scripts/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
# Follow additional setup for SadTalker and StyleTTS2 model weights inside their respective directories
uvicorn main:app --reload --port 8000
```

---

## ⚙️ How it Works (Data Flow)

1. **User Input:** A user uploads a static face image and enters a script on the frontend interface (`/create`).
2. **Text-To-Speech:** The frontend requests voice synthesis. The `Node.js server` proxies this to the `model-server`, where **StyleTTS2** synthesizes human-like speech from the text.
3. **Video Animation:** The frontend triggers the final video generation. The `model-server` takes the uploaded image and the generated audio, feeding them into **SadTalker** to generate a visually synchronized talking head video.
4. **Storage & Delivery:** The completed `mp4` url is saved to the MongoDB database along with user metadata. The final video is then served statically back to the frontend for viewing and downloaded.

---

## 📝 License
This project is proprietary.
