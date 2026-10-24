const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'social.db');
const db = new sqlite3.Database(dbPath);

// Helper to run queries as Promises
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initDB() {
  db.serialize();

  // Create tables
  await run(`PRAGMA foreign_keys = ON;`);

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      bio TEXT,
      location TEXT,
      avatar TEXT,
      cover_photo TEXT,
      badge TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      tags TEXT,
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS likes (
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS followers (
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (follower_id, following_id),
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Check if seed data exists
  const userCount = await get(`SELECT COUNT(*) as count FROM users`);
  if (userCount.count === 0) {
    console.log('🌱 Seeding database with rich Indian profiles and posts...');
    await seedDatabase();
    console.log('✅ Seeding completed successfully!');
  }
}

async function seedDatabase() {
  const users = [
    {
      username: 'aarav_sharma',
      name: 'Aarav Sharma',
      bio: 'AI & Web3 engineer building for Bharat 🇮🇳 | Chai lover | Weekend road trips 🏍️',
      location: 'Bengaluru, Karnataka',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      cover_photo: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80',
      badge: 'Tech Innovator 🚀'
    },
    {
      username: 'priya_patel',
      name: 'Priya Patel',
      bio: 'UI/UX Designer & Folk Art Curator 🎨 | Capturing colors of Gujarat & Rajasthan | Coffee & Kathak',
      location: 'Ahmedabad, Gujarat',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      cover_photo: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      badge: 'Design Lead ✨'
    },
    {
      username: 'rohan_verma',
      name: 'Rohan Verma',
      bio: 'Street Food Explorer & Food Stylist 🥘 | Exploring hidden culinary gems from Chandni Chowk to Madurai 🌶️',
      location: 'Old Delhi, Delhi',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      cover_photo: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1200&q=80',
      badge: 'Foodie Icon 🍛'
    },
    {
      username: 'ananya_iyer',
      name: 'Ananya Iyer',
      bio: 'Heritage Architect & Travel Photographer 📸 | Preserving temple architecture & UNESCO sites across South India',
      location: 'Chennai, Tamil Nadu',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      cover_photo: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80',
      badge: 'Heritage Preserver 🏛️'
    },
    {
      username: 'vikram_singh',
      name: 'Vikramjit Singh',
      bio: 'Organic Farming advocate & AgriTech builder 🌾 | Transforming rural supply chains | Proud Punjab da munda',
      location: 'Amritsar, Punjab',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      cover_photo: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
      badge: 'AgriTech Champion 🌱'
    }
  ];

  for (const u of users) {
    await run(
      `INSERT INTO users (username, name, bio, location, avatar, cover_photo, badge) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [u.username, u.name, u.bio, u.location, u.avatar, u.cover_photo, u.badge]
    );
  }

  // Follow relationships
  // 1 follows 2, 3, 4
  // 2 follows 1, 3
  // 3 follows 1, 4, 5
  // 4 follows 1, 2
  // 5 follows 1, 3
  const followPairs = [
    [1, 2], [1, 3], [1, 4],
    [2, 1], [2, 3],
    [3, 1], [3, 4], [3, 5],
    [4, 1], [4, 2],
    [5, 1], [5, 3]
  ];

  for (const [follower, following] of followPairs) {
    await run(`INSERT OR IGNORE INTO followers (follower_id, following_id) VALUES (?, ?)`, [follower, following]);
  }

  // Posts
  const posts = [
    {
      user_id: 1,
      content: 'Early morning coffee & coding sprint at Koramangala! ☕💻 We just launched the beta version of our open-source Indian vernacular voice model. The developer community in Bengaluru is truly unmatched! What are you building this weekend? #TechIndia #NammaBengaluru #BuildInPublic',
      image_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=80',
      tags: '#TechIndia,#NammaBengaluru,#BuildInPublic',
      location: 'Koramangala, Bengaluru'
    },
    {
      user_id: 2,
      content: 'Just finished documenting the majestic Stepwells (Adalaj Ni Vav). The geometric symmetry and intricate sandstone carvings carved in 1498 leave me breathless every single visit. Indian design heritage is pure mathematics and poetry blended together. 🕌✨ #IncredibleIndia #IndianArchitecture #Adalaj #DesignInspiration',
      image_url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1000&q=80',
      tags: '#IncredibleIndia,#IndianArchitecture,#DesignInspiration',
      location: 'Adalaj, Gujarat'
    },
    {
      user_id: 3,
      content: 'The ultimate culinary debate: Lucknowi Dum Biryani vs Hyderabadi Kacchi Biryani! 🍲 Today I spent the afternoon at Old Delhi exploring 70-year-old spice blends with Chacha ji. Nothing beats the fragrant aroma of saffron, kewra water, and slow-cooked mutton. Comment below your favorite biryani style! 👇 #FoodOfIndia #BiryaniLovers #PuraniDilli #DesiFlavors',
      image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1000&q=80',
      tags: '#FoodOfIndia,#BiryaniLovers,#PuraniDilli',
      location: 'Chandni Chowk, Old Delhi'
    },
    {
      user_id: 4,
      content: 'Evening Aarti at the Ghats of Varanasi. The resonance of temple bells, chanting of Vedic mantras, and hundreds of diyas floating down the holy Ganges. A spiritual stillness you will never find anywhere else on Earth. 🙏🕉️ #VaranasiGhats #SpiritualIndia #Kashi #Peace',
      image_url: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1000&q=80',
      tags: '#VaranasiGhats,#SpiritualIndia,#Kashi',
      location: 'Dashashwamedh Ghat, Varanasi'
    },
    {
      user_id: 5,
      content: 'Golden hour at our wheat fields in Punjab. Using solar-powered IoT drip irrigation has increased our water efficiency by 40% this rabi season! High tech meets fertile soil. Indian farmers are ready for the green tech revolution. 🌾🚜☀️ #AgriTech #PunjabDiMitti #SmartFarming',
      image_url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80',
      tags: '#AgriTech,#PunjabDiMitti,#SmartFarming',
      location: 'Amritsar Outskirts, Punjab'
    }
  ];

  for (const p of posts) {
    const res = await run(
      `INSERT INTO posts (user_id, content, image_url, tags, location) VALUES (?, ?, ?, ?, ?)`,
      [p.user_id, p.content, p.image_url, p.tags, p.location]
    );

    // Add likes
    if (res.id === 1) {
      await run(`INSERT INTO likes (post_id, user_id) VALUES (1, 2), (1, 3), (1, 4)`);
    } else if (res.id === 2) {
      await run(`INSERT INTO likes (post_id, user_id) VALUES (2, 1), (2, 3), (2, 4), (2, 5)`);
    } else if (res.id === 3) {
      await run(`INSERT INTO likes (post_id, user_id) VALUES (3, 1), (3, 2)`);
    } else if (res.id === 4) {
      await run(`INSERT INTO likes (post_id, user_id) VALUES (4, 1), (4, 2), (4, 3), (4, 5)`);
    } else if (res.id === 5) {
      await run(`INSERT INTO likes (post_id, user_id) VALUES (5, 1), (5, 3)`);
    }

    // Add comments
    if (res.id === 1) {
      await run(`INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`, [
        1, 2, 'Kudos Aarav! Would love to design the UI components for the vernacular prompts. Let’s connect!'
      ]);
      await run(`INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`, [
        1, 3, 'Make sure to grab cutting chai and bun maska from the corner stall near Sony World signal!'
      ]);
    } else if (res.id === 2) {
      await run(`INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`, [
        2, 4, 'Breathtaking capture Priya! The play of light in stepwells always provides acoustic and thermal brilliance.'
      ]);
    } else if (res.id === 3) {
      await run(`INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`, [
        3, 1, 'Hands down Kolkata Biryani with the aloo and egg! Fight me in the comments 😂🍛'
      ]);
      await run(`INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`, [
        3, 5, 'Hyderabadi mirchi ka salan is undisputed king!'
      ]);
    }
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  initDB
};
