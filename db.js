const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'social.db');
const db = new sqlite3.Database(dbPath);

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

async function initDB(forceReseed = false) {
  db.serialize();

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

  const userCount = await get(`SELECT COUNT(*) as count FROM users`);
  // If forceReseed or user count is 0 or avatars still contain old foreign links
  const sampleUser = await get(`SELECT avatar FROM users LIMIT 1`);
  const needsReseed = forceReseed || userCount.count === 0 || (sampleUser && sampleUser.avatar && sampleUser.avatar.includes('unsplash.com/photo-1534528741775'));

  if (needsReseed) {
    console.log('🇮🇳 Seeding 100% authentic Indian creators and cultural posts...');
    await resetAndSeedDatabase();
    console.log('✅ Authentic Indian database ready!');
  }
}

async function resetAndSeedDatabase() {
  await run(`DELETE FROM likes;`);
  await run(`DELETE FROM comments;`);
  await run(`DELETE FROM posts;`);
  await run(`DELETE FROM followers;`);
  await run(`DELETE FROM users;`);
  try {
    await run(`DELETE FROM sqlite_sequence WHERE name IN ('users', 'posts', 'comments');`);
  } catch (e) {
    // ignore if table doesn't exist
  }

  // 100% Authentic Indian Personas with local generated Indian portraits
  const users = [
    {
      username: 'aarav_sharma',
      name: 'Aarav Sharma (आरव)',
      bio: 'AI & Web3 engineer building for Bharat 🇮🇳 | Chai lover ☕ | Weekend road trips across Western Ghats 🏍️',
      location: 'Bengaluru, Karnataka',
      avatar: '/assets/avatars/aarav.jpg',
      cover_photo: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80',
      badge: 'टेक फाउंडर 🚀'
    },
    {
      username: 'priya_patel',
      name: 'Priya Patel (प्रिया)',
      bio: 'UI/UX Designer & Folk Art Curator 🎨 | Celebrating Kutch Bandhani, Kalamkari & Rajputana aesthetics ✨',
      location: 'Ahmedabad, Gujarat',
      avatar: '/assets/avatars/priya.jpg',
      cover_photo: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80',
      badge: 'कलाकार & डिज़ाइनर 🎨'
    },
    {
      username: 'rohan_verma',
      name: 'Rohan Verma (रोहन)',
      bio: 'Purani Dilli Food Explorer 🥘 | Discovering authentic recipes from Chandni Chowk to Lucknow & Kolkata 🌶️',
      location: 'Old Delhi, Delhi',
      avatar: '/assets/avatars/rohan.jpg',
      cover_photo: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1200&q=80',
      badge: 'देसी फूडी 🍛'
    },
    {
      username: 'ananya_iyer',
      name: 'Ananya Iyer (अनन्या)',
      bio: 'Heritage Architect & Temple Documenter 📸 | Preserving Dravidian stone architecture & UNESCO heritage sites 🛕',
      location: 'Chennai, Tamil Nadu',
      avatar: '/assets/avatars/ananya.jpg',
      cover_photo: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80',
      badge: 'धरोहर संरक्षक 🏛️'
    },
    {
      username: 'vikram_singh',
      name: 'Vikramjit Singh (विक्रम)',
      bio: 'AgriTech builder & Smart Farming advocate 🌾 | Proud Punjabi farmer bridging drone tech with fertile soil 🚜',
      location: 'Amritsar, Punjab',
      avatar: '/assets/avatars/vikram.jpg',
      cover_photo: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
      badge: 'कृषि टेक चैंपियन 🌱'
    }
  ];

  const userMap = {};
  for (const u of users) {
    const res = await run(
      `INSERT INTO users (username, name, bio, location, avatar, cover_photo, badge) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [u.username, u.name, u.bio, u.location, u.avatar, u.cover_photo, u.badge]
    );
    userMap[u.username] = res.id;
  }

  // Follow connections
  const followPairs = [
    [userMap['aarav_sharma'], userMap['priya_patel']],
    [userMap['aarav_sharma'], userMap['rohan_verma']],
    [userMap['aarav_sharma'], userMap['ananya_iyer']],
    [userMap['aarav_sharma'], userMap['vikram_singh']],
    [userMap['priya_patel'], userMap['aarav_sharma']],
    [userMap['priya_patel'], userMap['rohan_verma']],
    [userMap['priya_patel'], userMap['ananya_iyer']],
    [userMap['rohan_verma'], userMap['aarav_sharma']],
    [userMap['rohan_verma'], userMap['priya_patel']],
    [userMap['rohan_verma'], userMap['vikram_singh']],
    [userMap['ananya_iyer'], userMap['aarav_sharma']],
    [userMap['ananya_iyer'], userMap['priya_patel']],
    [userMap['vikram_singh'], userMap['aarav_sharma']],
    [userMap['vikram_singh'], userMap['rohan_verma']]
  ];

  for (const [follower, following] of followPairs) {
    await run(`INSERT OR IGNORE INTO followers (follower_id, following_id) VALUES (?, ?)`, [follower, following]);
  }

  // Authentic Indian Posts
  const posts = [
    {
      user_key: 'aarav_sharma',
      content: 'Early morning filter coffee at Brahmin’s Coffee Bar, Shankarapura! ☕💻 We just launched the open-source Indic Language AI model supporting Hindi, Tamil, Telugu, Bengali & Marathi. The developer energy in Bengaluru is truly unmatched. \n\nBharat is no longer just consuming tech — we are building the future! 🇮🇳🚀 #TechIndia #NammaBengaluru #BuildInBharat #ChaiPeCharcha',
      image_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=80',
      tags: '#TechIndia,#NammaBengaluru,#BuildInBharat,#ChaiPeCharcha',
      location: 'Koramangala, Bengaluru'
    },
    {
      user_key: 'priya_patel',
      content: 'अद्भुत शिल्पकारी! Just finished field documentation at Adalaj Stepwell (अडालज की बावड़ी). Built in 1498, these five-storey sandstone pavilions combine Solanki and Indo-Islamic architecture with exquisite floral carvings. \n\nEvery corner reminds us how rich Indian design roots are. What is your favorite historic monument in India? 🕌✨ #IncredibleIndia #IndianArt #AdalajVav #DesiDesign',
      image_url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1000&q=80',
      tags: '#IncredibleIndia,#IndianArt,#AdalajVav,#DesiDesign',
      location: 'Adalaj, Gujarat'
    },
    {
      user_key: 'rohan_verma',
      content: 'The holy debate of Indian food: Lucknowi Awadhi Dum Biryani vs Hyderabadi Dum vs Kolkata Biryani with aloo! 🍲 \n\nToday I spent 4 hours in the spice lanes of Khari Baoli, Old Delhi, with Ustad ji uncovering 80-year-old potli masala secrets. Pure saffron, shahi jeera, and kewra aroma in the air. \n\nTell me in the comments: Which city in India has your heart for food? 👇 #FoodOfIndia #PuraniDilli #BiryaniLovers #SwadBharat',
      image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1000&q=80',
      tags: '#FoodOfIndia,#PuraniDilli,#BiryaniLovers,#SwadBharat',
      location: 'Chandni Chowk, Old Delhi'
    },
    {
      user_key: 'ananya_iyer',
      content: 'काशी की शाम! Ganga Maha Aarti at Dashashwamedh Ghat, Varanasi. The reverberation of conch shells (शंख), chanting of Vedic shlokas, and hundreds of brass lamps lighting up the holy river. \n\nThere is a divine spiritual stillness here that reconnects you to the very soul of India. Har Har Mahadev! 🙏🕉️ #VaranasiGhats #SpiritualIndia #KashiAarti #BharatDarshan',
      image_url: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1000&q=80',
      tags: '#VaranasiGhats,#SpiritualIndia,#KashiAarti,#BharatDarshan',
      location: 'Dashashwamedh Ghat, Varanasi'
    },
    {
      user_key: 'vikram_singh',
      content: 'ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ! Golden sunset at our wheat fields in Amritsar outskirts. We installed solar-assisted precision drip irrigation across 18 acres, saving 40% water this season! \n\nDesi farmers are leading the green tech transition with pride. Jai Jawan, Jai Kisan! 🌾🚜☀️ #AgriTech #PunjabDiMitti #JaiKisan #SmartFarming',
      image_url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80',
      tags: '#AgriTech,#PunjabDiMitti,#JaiKisan,#SmartFarming',
      location: 'Amritsar Outskirts, Punjab'
    }
  ];

  const postIds = [];
  for (const p of posts) {
    const userId = userMap[p.user_key];
    const res = await run(
      `INSERT INTO posts (user_id, content, image_url, tags, location) VALUES (?, ?, ?, ?, ?)`,
      [userId, p.content, p.image_url, p.tags, p.location]
    );
    postIds.push(res.id);
  }

  // Likes
  await run(`INSERT INTO likes (post_id, user_id) VALUES (?, ?), (?, ?), (?, ?), (?, ?)`, [
    postIds[0], userMap['priya_patel'],
    postIds[0], userMap['rohan_verma'],
    postIds[0], userMap['ananya_iyer'],
    postIds[0], userMap['vikram_singh']
  ]);
  await run(`INSERT INTO likes (post_id, user_id) VALUES (?, ?), (?, ?), (?, ?)`, [
    postIds[1], userMap['aarav_sharma'],
    postIds[1], userMap['rohan_verma'],
    postIds[1], userMap['ananya_iyer']
  ]);
  await run(`INSERT INTO likes (post_id, user_id) VALUES (?, ?), (?, ?), (?, ?)`, [
    postIds[2], userMap['aarav_sharma'],
    postIds[2], userMap['priya_patel'],
    postIds[2], userMap['vikram_singh']
  ]);
  await run(`INSERT INTO likes (post_id, user_id) VALUES (?, ?), (?, ?), (?, ?)`, [
    postIds[3], userMap['aarav_sharma'],
    postIds[3], userMap['priya_patel'],
    postIds[3], userMap['ananya_iyer']
  ]);
  await run(`INSERT INTO likes (post_id, user_id) VALUES (?, ?), (?, ?)`, [
    postIds[4], userMap['aarav_sharma'],
    postIds[4], userMap['rohan_verma']
  ]);

  // Comments
  await run(`INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`, [
    postIds[0], userMap['priya_patel'], 'शाबाश आरव भाई! Would love to contribute to the vernacular UI font styling for Hindi and Gujarati scripts!'
  ]);
  await run(`INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`, [
    postIds[0], userMap['rohan_verma'], 'Bengaluru filter coffee + cutting chai fuels the whole Indian IT ecosystem! ☕🔥'
  ]);
  await run(`INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`, [
    postIds[1], userMap['ananya_iyer'], 'Breathtaking capture Priya! Indian stepwells are masterclasses in sustainable subterranean cooling and acoustic geometry.'
  ]);
  await run(`INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`, [
    postIds[2], userMap['aarav_sharma'], 'Kolkata biryani with the soft potato and egg has no competition! Fight me in the replies 😂🍛'
  ]);
  await run(`INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`, [
    postIds[2], userMap['vikram_singh'], 'Bhai, try Amritsari kulcha with chhole next time you are in Punjab! You will forget everything else.'
  ]);
  await run(`INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`, [
    postIds[3], userMap['aarav_sharma'], 'Har Har Mahadev! Watching the aarti by the holy Ganga is an unforgettable experience. 🙏'
  ]);
}

module.exports = {
  db,
  run,
  get,
  all,
  initDB,
  resetAndSeedDatabase
};
