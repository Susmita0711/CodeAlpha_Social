# Charcha (चर्चा) • The Indian Social Network 🇮🇳

[![Node.js](https://img.shields.io/badge/Node.js-v24.x-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-5.x-blue.svg)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite3-orange.svg)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-ISC-purple.svg)](LICENSE)

A modern, full-stack Indian social media platform celebrating Bharat's diverse culture, tech innovations, art, and stories. Built with Vanilla HTML5, CSS3, JavaScript, Express.js, and SQLite.

---

## 🌟 Key Features

### 1. 👤 User Profiles & Multi-Persona Switcher
* **Full Profile Views:** View user's cover banner, avatar, bio, location, custom badge, joined date, and stats (Posts, Followers, Following).
* **Profile Tabs:** Switch between **Posts**, **Followers**, and **Following** lists.
* **Edit Profile:** Update full name, bio, location, professional badge, avatar URL, and cover banner.
* **Instant Account Switcher:** Seamlessly switch between active Indian creator personas (Aarav, Priya, Rohan, Ananya, Vikram) or create a new persona directly from the header dropdown without login friction.

### 2. ✍️ Posts & Comments
* **Rich Composer:** Create posts with text, hashtags, location tags, file upload, or preset Indian photos (Cutting Chai, Adalaj Stepwell, Bengaluru Tech, Kashi Ghats, Old Delhi Biryani, Punjab Fields).
* **Interactive Comments:** Expand inline comments, post in real-time, and delete your comments.
* **Feed Filters:** Switch between **"For You"**, **"Following Feed"**, and **"Trending in India"**, or click any hashtag (e.g. `#TechIndia`, `#IncredibleIndia`).
* **Search:** Live filter across posts, creators, hashtags, and locations.

### 3. ❤️ Like & Follow System
* **Like System:** Like/unlike posts with an animated heart burst and live counter updates.
* **Follow System:** Follow and unfollow creators from post headers, suggested creators list, or profile modals.
* **Stories Reel:** Interactive Indian cultural and tech stories with auto-advancing progress timers.

---

## 🛠️ Tech Stack

* **Frontend:** Semantic HTML5, Vanilla CSS3 (Custom Design System with Day/Night Mode, Glassmorphism, Responsive CSS Grid), Vanilla JavaScript (ES6+).
* **Backend:** Express.js 5, Node.js, Multer (file uploads), Morgan (HTTP logger), CORS.
* **Database:** SQLite3 with relational foreign keys (`users`, `posts`, `comments`, `likes`, `followers`).

---

## 🚀 Getting Started Locally

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* [npm](https://www.npmjs.com/)

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Susmita0711/CodeAlpha_Social.git
   cd CodeAlpha_Social
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local server:**
   ```bash
   npm start
   ```

4. **Open in your browser:**
   ```
   http://localhost:3000
   ```

The database (`social.db`) will be automatically created and seeded with initial Indian creator profiles and posts on the first run.

---

## 📁 Project Structure

```
CodeAlpha_Social/
├── public/
│   ├── css/
│   │   └── style.css          # Design system & responsive styles
│   ├── js/
│   │   └── app.js             # Client-side application state & logic
│   └── index.html             # Application markup & modals
├── uploads/                   # User-uploaded images (.gitkeep)
├── db.js                      # SQLite schema, queries & seed data
├── server.js                  # Express.js REST API endpoints
├── package.json
└── README.md
```

---

## 📄 License
This project is licensed under the ISC License.
