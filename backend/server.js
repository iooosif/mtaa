const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const url = require('url');
const cors = require('cors');

// Initialize Express app
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Create a database connection
const pool = new Pool({
  host: 'localhost',
  port: '5434',
  user: 'postgres',
  password: 'postgres',
  database: 'mtaa',
});

// Configure multer to save files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Folder for saving files
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Unique file name
  },
});

// Filter to check file types (images and videos only)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'video/mpeg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('Only images (jpeg, png) and videos (mp4, mpeg) are allowed'),
      false,
    );
  }
};

// Create multer upload middleware
const upload = multer({ storage, fileFilter });

// Create HTTP server by wrapping the Express app
const server = http.createServer(app);

// ===========================================
// CHAT DATABASE SETUP
// ===========================================

// Create tables needed for chat functionality
async function createChatTables() {
  try {
    // Create conversations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create conversation participants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (conversation_id, user_id)
      );
    `);

    // Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Chat tables created successfully');
  } catch (error) {
    console.error('Error creating chat tables:', error);
  }
}

// Initialize chat tables after a short delay to ensure the users table exists
setTimeout(() => {
  createChatTables();
}, 3000);

// ===========================================
// WEBSOCKET SERVER SETUP
// ===========================================

// Create WebSocket server instance
const wss = new WebSocket.Server({ noServer: true });

// Store active connections
const clients = new Map();

// Handle WebSocket connection
wss.on('connection', async (ws, request, userId) => {
  // Store the connection with the user ID
  clients.set(userId, ws);

  console.log(`Client connected: User ${userId}`);

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: 'connection',
      message: 'Connected to WebSocket server',
      timestamp: Date.now(),
    }),
  );

  // Handle incoming messages
  ws.on('message', async (message) => {
    try {
      const parsedMessage = JSON.parse(message);

      // Validate message structure
      if (!parsedMessage.type || !parsedMessage.text || !parsedMessage.sender) {
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
            timestamp: Date.now(),
          }),
        );
        return;
      }

      if (parsedMessage.type === 'message') {
        // Extract message data
        const { text, sender, conversationId } = parsedMessage;
        const timestamp = parsedMessage.timestamp || Date.now();

        // Ensure we have a valid conversation
        let actualConversationId = conversationId;

        if (!actualConversationId) {
          // Create a new conversation if one wasn't provided
          const newConversation = await pool.query(
            'INSERT INTO conversations DEFAULT VALUES RETURNING id',
          );
          actualConversationId = newConversation.rows[0].id;

          // Add participants to the conversation (sender and recipient)
          if (parsedMessage.recipient) {
            await pool.query(
              'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
              [actualConversationId, sender, parsedMessage.recipient],
            );
          }
        }

        // Store message in database
        const result = await pool.query(
          'INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3) RETURNING id, created_at',
          [actualConversationId, sender, text],
        );

        const messageId = result.rows[0].id;
        const createdAt = result.rows[0].created_at;

        // Prepare message to broadcast
        const outgoingMessage = {
          type: 'message',
          id: messageId.toString(),
          text,
          sender,
          timestamp: createdAt.getTime(),
          conversationId: actualConversationId,
        };

        // Find recipients for this conversation
        const participantsResult = await pool.query(
          'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
          [actualConversationId],
        );

        // Broadcast message to all participants
        participantsResult.rows.forEach((participant) => {
          const recipientId = participant.user_id.toString();
          const recipientWs = clients.get(recipientId);

          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            // Add isMine flag for each recipient
            const isFromCurrentUser = recipientId === sender;
            recipientWs.send(
              JSON.stringify({
                ...outgoingMessage,
                isMine: isFromCurrentUser,
              }),
            );
          }
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Error processing message',
          timestamp: Date.now(),
        }),
      );
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    clients.delete(userId);
    console.log(`Client disconnected: User ${userId}`);
  });
});

// Handle HTTP server upgrade (required for WebSocket)
server.on('upgrade', (request, socket, head) => {
  const { pathname, query } = url.parse(request.url, true);

  // Only handle WebSocket connections to /chat endpoint
  if (pathname === '/chat') {
    // Extract userId from query parameters
    const userId = query.userId;

    if (!userId) {
      socket.destroy();
      return;
    }

    // Handle the WebSocket connection
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, userId);
    });
  } else {
    socket.destroy();
  }
});

// ===========================================
// CHAT API HELPER FUNCTIONS
// ===========================================

// Get conversation list for a user
async function getConversationsForUser(userId) {
  try {
    const result = await pool.query(
      `
      SELECT c.id, c.created_at,
        ARRAY_AGG(u.username) AS participants,
        (
          SELECT content FROM messages
          WHERE conversation_id = c.id
          ORDER BY created_at DESC
          LIMIT 1
        ) AS last_message,
        (
          SELECT created_at FROM messages
          WHERE conversation_id = c.id
          ORDER BY created_at DESC
          LIMIT 1
        ) AS last_message_time
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      JOIN users u ON cp.user_id = u.id
      WHERE c.id IN (
        SELECT conversation_id FROM conversation_participants WHERE user_id = $1
      )
      GROUP BY c.id
      ORDER BY last_message_time DESC NULLS LAST
    `,
      [userId],
    );

    return result.rows;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
}

// Get messages for a conversation
async function getMessagesForConversation(conversationId, userId) {
  try {
    const result = await pool.query(
      `
      SELECT
        m.id,
        m.content AS text,
        m.sender_id AS sender,
        m.created_at AS timestamp,
        CASE WHEN m.sender_id = $2 THEN true ELSE false END AS is_mine
      FROM messages m
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
    `,
      [conversationId, userId],
    );

    return result.rows.map((row) => ({
      id: row.id.toString(),
      text: row.text,
      sender: row.sender.toString(),
      timestamp: new Date(row.timestamp).getTime(),
      isMine: row.is_mine,
    }));
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

// ===========================================
// CHAT API ENDPOINTS
// ===========================================

/**
 * @description Check if a conversation exists between two users
 * @returns Conversation data if it exists
 */
app.get('/conversations/check', async (req, res) => {
  const { user1, user2 } = req.query;

  if (!user1 || !user2) {
    return res.status(400).json({ error: 'Both user IDs are required' });
  }

  try {
    // Get all conversations for user1
    const user1Conversations = await pool.query(
      `SELECT c.id FROM conversations c
       JOIN conversation_participants cp ON c.id = cp.conversation_id
       WHERE cp.user_id = $1`,
      [user1],
    );

    if (user1Conversations.rows.length === 0) {
      return res.status(200).json({ exists: false });
    }

    // Check if any of these conversations also include user2
    const conversationIds = user1Conversations.rows.map((row) => row.id);

    const sharedConversation = await pool.query(
      `SELECT c.id FROM conversations c
       JOIN conversation_participants cp ON c.id = cp.conversation_id
       WHERE cp.user_id = $1 AND cp.conversation_id = ANY($2)`,
      [user2, conversationIds],
    );

    if (sharedConversation.rows.length > 0) {
      // Get the conversation details
      const conversationId = sharedConversation.rows[0].id;

      const conversationDetails = await pool.query(
        `SELECT c.id, c.created_at,
          (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
          (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_time,
          array_agg(u.username) as participants
         FROM conversations c
         JOIN conversation_participants cp ON c.id = cp.conversation_id
         JOIN users u ON cp.user_id = u.id
         WHERE c.id = $1
         GROUP BY c.id, c.created_at`,
        [conversationId],
      );

      return res.status(200).json({
        exists: true,
        data: conversationDetails.rows[0],
      });
    }

    return res.status(200).json({ exists: false });
  } catch (error) {
    console.error('Error checking for conversation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @description Get conversation list for a user
 * @returns List of conversations with latest message
 */
app.get('/conversations/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const conversations = await getConversationsForUser(userId);
    if (conversations.length === 0) {
      return res.status(200).json({
        message: 'No conversations found',
        data: [],
      });
    } else {
      return res.status(200).json({
        message: 'Conversations retrieved successfully',
        data: conversations,
      });
    }
  } catch (error) {
    console.error('Error retrieving conversations:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @description Get messages for a conversation
 * @returns List of messages
 */
app.get('/conversations/:conversationId/messages/:userId', async (req, res) => {
  const { conversationId, userId } = req.params;

  try {
    const messages = await getMessagesForConversation(conversationId, userId);
    return res.status(200).json({
      message: 'Messages retrieved successfully',
      data: messages,
    });
  } catch (error) {
    console.error('Error retrieving messages:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @description Create a new conversation between users
 */
app.post('/conversations', express.json(), async (req, res) => {
  const { participants } = req.body;

  if (
    !participants ||
    !Array.isArray(participants) ||
    participants.length < 2
  ) {
    return res
      .status(400)
      .json({ error: 'At least two participants are required' });
  }

  try {
    // Create new conversation
    const newConversation = await pool.query(
      'INSERT INTO conversations DEFAULT VALUES RETURNING id, created_at',
    );
    const conversationId = newConversation.rows[0].id;

    // Add participants
    const participantValues = participants
      .map((userId) => `(${conversationId}, ${userId})`)
      .join(', ');
    await pool.query(`
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES ${participantValues}
    `);

    return res.status(201).json({
      message: 'Conversation created successfully',
      data: {
        id: conversationId,
        created_at: newConversation.rows[0].created_at,
        participants,
      },
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================================
// YOUR EXISTING REST API ENDPOINTS
// ===========================================

function createTables() {
  // table users
  pool
    .query(
      `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR NOT NULL,
      name VARCHAR NOT NULL,
      lastname VARCHAR NOT NULL,
      email VARCHAR NOT NULL,
      password VARCHAR NOT NULL
    );
  `,
    )
    .then(() => {
      // table uploads
      return pool.query(`
        CREATE TABLE IF NOT EXISTS uploads (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          file_path VARCHAR NOT NULL,
          file_type VARCHAR NOT NULL,
          upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    })
    .catch((err) => console.error('Error creating tables:', err))
    .then(() => {
      // table topics
      return pool.query(`
          CREATE TABLE IF NOT EXISTS topics (
          id SERIAL PRIMARY KEY,
          name VARCHAR NOT NULL,
          owner_id INTEGER REFERENCES users(id),
          visibility varchar DEFAULT 'public',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);
    })
    .catch((err) => console.error('Error creating tables:', err))
    .then(() => {
      // table posts
      return pool.query(`
          CREATE TABLE IF NOT EXISTS posts (
          id SERIAL PRIMARY KEY,
          topic_id INTEGER REFERENCES topics(id),
          user_id INTEGER REFERENCES users(id),
          votes INTEGER DEFAULT 0,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);
    })
    .catch((err) => console.error('Error creating tables:', err))
    .then(() => {
      // table comments
      return pool.query(`
          CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          post_id INTEGER REFERENCES posts(id),
          user_id INTEGER REFERENCES users(id),
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);
    })
    .catch((err) => console.error('Error creating tables:', err))
    .then(() => {
      // table replies to comments
      return pool.query(`
          CREATE TABLE IF NOT EXISTS replies (
          id SERIAL PRIMARY KEY,
          comment_id INTEGER REFERENCES comments(id),
          user_id INTEGER REFERENCES users(id),
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);
    })
    .catch((err) => console.error('Error creating tables:', err))
    .then(() => {
      // junction table users/topics
      return pool.query(`
          CREATE TABLE IF NOT EXISTS users_topics (
          user_id INTEGER REFERENCES users(id),
          topic_id INTEGER REFERENCES topics(id)
        );`);
    })
    .catch((err) => console.error('Error creating tables:', err));
}

setTimeout(() => {
  createTables();
}, 3000);

// Add this function to alter the comments table to add the votes column
function alterCommentsTable() {
  pool
    .query(
      `
    ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS votes INTEGER DEFAULT 0
  `,
    )
    .then(() => {
      console.log('Added votes column to comments table');
    })
    .catch((err) => {
      console.error('Error adding votes column to comments table:', err);
    });
  pool
    .query(
      `
    ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS location TEXT
  `,
    )
    .then(() => {
      console.log('Added location column to posts table');
    })
    .catch((err) => {
      console.error('Error adding location column to posts table:', err);
    });
}

// Call this function after your createTables function
setTimeout(() => {
  alterCommentsTable();
}, 4000); // Run this after createTables which runs at 3000ms

// Add after the alterCommentsTable function

function addCascadeDeleteConstraints() {
  pool
    .query(
      `
    -- First, drop the existing constraint
    ALTER TABLE comments
    DROP CONSTRAINT IF EXISTS comments_post_id_fkey;

    -- Then add the new constraint with CASCADE DELETE
    ALTER TABLE comments
    ADD CONSTRAINT comments_post_id_fkey
    FOREIGN KEY (post_id)
    REFERENCES posts(id)
    ON DELETE CASCADE;
  `,
    )
    .then(() => {
      console.log('Added CASCADE DELETE constraint to comments table');
    })
    .catch((err) => {
      console.error('Error modifying comments table constraints:', err);
    });

  // Also add CASCADE DELETE to replies table if needed
  pool
    .query(
      `
    -- First, drop the existing constraint
    ALTER TABLE replies
    DROP CONSTRAINT IF EXISTS replies_comment_id_fkey;

    -- Then add the new constraint with CASCADE DELETE
    ALTER TABLE replies
    ADD CONSTRAINT replies_comment_id_fkey
    FOREIGN KEY (comment_id)
    REFERENCES comments(id)
    ON DELETE CASCADE;
  `,
    )
    .then(() => {
      console.log('Added CASCADE DELETE constraint to replies table');
    })
    .catch((err) => {
      console.error('Error modifying replies table constraints:', err);
    });
}

// Call this function after alterCommentsTable
setTimeout(() => {
  addCascadeDeleteConstraints();
}, 5000); // Run this after other table alterations

//file upload
//Method: POST
// URL: http://localhost:8080/upload
// Body tab → form-data:
// Key: user_id, Type: Text, Value: 1 (or the ID of an existing user).
// Key: file, Type: File, select a file (e.g. image.jpg).
// Click Send.
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: 'No file uploaded or invalid file type' });
    }

    const userId = req.body.user_id; //Assume that the user_id is passed in the body of the request
    const filePath = req.file.path;
    const fileType = req.file.mimetype;

    // Save information about the file in the database
    const result = await pool.query(
      'INSERT INTO uploads (user_id, file_path, file_type) VALUES ($1, $2, $3) RETURNING *',
      [userId, filePath, fileType],
    );

    return res.status(200).json({
      message: 'File uploaded successfully',
      file: result.rows[0],
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
//retrieve all uploads
//Method: GET
// URL: http://localhost:8080/uploads
// Body: Not required.
// Click Send.
app.get('/uploads', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.*, us.username
      FROM uploads u
      LEFT JOIN users us ON u.user_id = us.id
    `);
    return res.status(200).json({
      message: 'Uploads retrieved successfully',
      uploads: result.rows,
    });
  } catch (error) {
    console.error('Error retrieving uploads:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
// Getting information about the file by ID
//Method: GET
// URL: http://localhost:8080/upload/1 (replace 1 with the file ID from the uploads table).
// Body: Not required.
// Click Send.

app.get('/upload/:id', async (req, res) => {
  const fileId = req.params.id;

  try {
    const result = await pool.query('SELECT * FROM uploads WHERE id = $1', [
      fileId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    return res.status(200).json({
      message: 'File info retrieved successfully',
      file: result.rows[0],
    });
  } catch (error) {
    console.error('Error retrieving file info:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/change-password', async (req, res) => {
  const { user_id, current_password, new_password } = req.body;

  try {
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [
      user_id,
    ]);
    if (user.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    if (user.rows[0].password !== current_password) {
      return res
        .status(400)
        .json({ success: false, message: 'Incorrect current password' });
    }

    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [
      new_password,
      user_id,
    ]);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error changing password:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
});

// Download file by ID
//Method: GET
// URL: http://localhost:8080/download/1 (replace 1 with the file ID).
// Body: Not required.
// Click Send.
app.get('/download/:id', async (req, res) => {
  const fileId = req.params.id;

  try {
    const result = await pool.query(
      'SELECT file_path, file_type FROM uploads WHERE id = $1',
      [fileId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = result.rows[0].file_path;
    const fileType = result.rows[0].file_type;

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Set download headers
    res.setHeader('Content-Type', fileType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${path.basename(filePath)}"`,
    );

    // Send file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
app.post('/change-password', async (req, res) => {
  const { user_id, current_password, new_password } = req.body;

  try {
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [
      user_id,
    ]);
    if (user.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    if (user.rows[0].password !== current_password) {
      return res
        .status(400)
        .json({ success: false, message: 'Incorrect current password' });
    }

    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [
      new_password,
      user_id,
    ]);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error changing password:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
});
// Delete file by ID
// Method: DELETE
// URL: http://localhost:8080/upload/1 (replace 1 with the file ID).
// Body: Not required.
// Click Send.
app.delete('/upload/:id', async (req, res) => {
  const fileId = req.params.id;

  try {
    const result = await pool.query(
      'SELECT file_path FROM uploads WHERE id = $1',
      [fileId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = result.rows[0].file_path;

    // Delete the file from the server
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete the record from the database
    await pool.query('DELETE FROM uploads WHERE id = $1', [fileId]);

    return res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
//replacement of a downloaded file
//Method: PUT
// URL: http://localhost:8080/upload/1 (replace 1 with the ID of an existing file from the uploads table).
// Body tab → form-data:
// Key: file, Type: File, select a new file (for example, new_image.png).
// Click Send.
app.put('/upload/:id', upload.single('file'), async (req, res) => {
  const fileId = req.params.id;

  try {
    // Check if the file exists in the database
    const existingFile = await pool.query(
      'SELECT file_path FROM uploads WHERE id = $1',
      [fileId],
    );

    if (existingFile.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if a new file has been loaded
    if (!req.file) {
      return res.status(400).json({ error: 'No new file uploaded' });
    }

    // Delete the old file from the server
    const oldFilePath = existingFile.rows[0].file_path;
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
    }

    const newFilePath = req.file.path;
    const newFileType = req.file.mimetype;

    // Update the record in the database
    const result = await pool.query(
      'UPDATE uploads SET file_path = $1, file_type = $2, upload_date = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [newFilePath, newFileType, fileId],
    );

    return res.status(200).json({
      message: 'File updated successfully',
      file: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating file:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// register post api call, we could enhance it with password hashing with modules like bcrypt, further in the project
/**
 * @return returns status code with json message along with user data
 * @params request body
 * Api call to register user
 * Checking if the user exists
 * Checking if the passwords match
 * On successfull auth sent 200, along with json user data
 */
app.post('/register', async (req, res) => {
  const user = req.body;

  try {
    if (!user.email.toLowerCase().endsWith('@stuba.sk')) {
      return res
        .status(400)
        .json({ error: 'Only @stuba.sk email addresses are allowed' });
    }
    const existing_user = await pool.query(
      'SELECT * FROM users WHERE email = $1 and username = $2',
      [user.email, user.username],
    );
    if (existing_user.rows.length === 0) {
      if (user.password === user.password2) {
        await pool.query(
          'INSERT INTO users (username, name, lastname, email, password) VALUES ($1, $2, $3, $4, $5);',
          [user.username, user.name, user.lastname, user.email, user.password],
        );
        return res.status(200).json({
          message: 'User registered successfully',
          username: user.username,
          password: user.password,
        });
      } else {
        return res.status(400).json({ error: 'Passwords do not match' });
      }
    } else {
      return res
        .status(409)
        .json({ error: 'User with this email or username already exists' });
    }
  } catch (error) {
    console.error('Something went wrong when registering...', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @return returns status code along with json message containing user data
 * @params request body
 */
app.post('/login', async (req, res) => {
  const user = req.body;

  try {
    const existing_user = await pool.query(
      'select * from users where username = $1',
      [user.username],
    );
    if (existing_user.rows.length === 0) {
      return res.status(404).json({ message: 'User does not exist!' });
    } else {
      if (user.password === existing_user.rows[0].password) {
        return res.status(200).json({
          message: 'User logged in successfully!',
          username: user.username,
          password: user.password,
          userId: existing_user.rows[0].id,
        });
      } else {
        return res.status(400).json({ error: 'Incorrect password!' });
      }
    }
  } catch (e) {
    console.error('Something went wrong when logging in...', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/user/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const userData = await pool.query('SELECT * FROM users WHERE id = $1', [
      userId,
    ]);
    if (userData.rows.length === 0) {
      return res.status(404).json({ error: 'User not found!' });
    } else {
      return res.status(200).json({ data: userData.rows[0] });
    }
  } catch (e) {
    console.error('Something went wrong when loading user...', e);
    return res.status(500).json({ error: 'Internal server error!' });
  }
});

app.delete('/user/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const userData = await pool.query('SELECT * FROM users WHERE id = $1', [
      userId,
    ]);
    if (userData.rows.length === 0) {
      return res.status(404).json({ error: 'User not found!' });
    } else {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      return res.status(200).json({ message: 'User deleted successfully!' });
    }
  } catch (e) {
    console.error('Something went wrong when deleting user...', e);
    return res.status(500).json({ error: 'Internal server error!' });
  }
});

/**
 * @description This endpoint returns all users
 * @returns All users
 */
app.get('/users', async (req, res) => {
  try {
    const users = await pool.query('SELECT * FROM users');
    if (users.rows.length === 0) {
      return res.status(404).json({ error: 'No users found!' });
    } else {
      return res.status(200).json({ data: users.rows });
    }
  } catch (e) {
    console.error('Something went wrong when loading users...', e);
    return res.status(500).json({ error: 'Internal server error!' });
  }
});

/**
 * @returns updated user profile
 * Users can update their profile information
 * put/patch/update
 */
app.put('/profile', async (req, res) => {
  const userData = req.body; // name, username, password.... anything can be changed
});

/**
 * @returns created empty topic
 * User creates his own topic and can set it up to be either public/private
 * He can invite people to his topic
 *
 */
app.post('/topic', async (req, res) => {
  const topicData = req.body;

  try {
    const userAlreadyHasTopic = await pool.query(
      'Select * from topics where name = $1 and owner_id = $2',
      [topicData.topicName, topicData.user_id],
    );
    if (userAlreadyHasTopic.rows.length === 0) {
      await pool.query(
        'INSERT INTO topics (name, owner_id, visibility) VALUES ($1, $2, $3)',
        [topicData.topicName, topicData.user_id, topicData.isPrivate],
      );
      return res
        .status(200)
        .json({ message: `Topic ${topicData.topicName} successfully created` });
    } else {
      return res
        .status(409)
        .json({ error: 'User already has topic with the name created!' });
    }
  } catch (e) {
    console.error('Something went wrong when adding topic...', e);
    return res.status(500).json({ error: 'Internal server error!' });
  }
});

/**
 * @returns Topic by id
 *
 */
app.get('/topics/:id', async (req, res) => {
  const topicId = req.params.id;
  try {
    const topicData = await pool.query('SELECT * FROM topics WHERE id = $1', [
      topicId,
    ]);
    if (topicData.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found!' });
    } else {
      return res.status(200).json({ data: topicData.rows[0] });
    }
  } catch (e) {
    console.error('Something went wrong when loading topic...', e);
    return res.status(500).json({ error: 'Internal server error!' });
  }
});

/**
 * @description Get posts for a specific topic
 * @returns All posts for the topic
 */
app.get('/topics/:id/posts', async (req, res) => {
  const topicId = req.params.id;

  try {
    // Get posts with username, comment count, and location
    const result = await pool.query(
      `
      SELECT
        p.id,
        p.content,
        p.votes,
        p.location,
        p.created_at,
        u.username,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count,
        CASE WHEN p.image_data IS NOT NULL THEN true ELSE false END as has_image
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.topic_id = $1
      ORDER BY p.created_at DESC
    `,
      [topicId],
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        message: 'No posts found for this topic',
        data: [],
      });
    } else {
      return res.status(200).json({
        message: 'Posts retrieved successfully',
        data: result.rows,
      });
    }
  } catch (e) {
    console.error('Error loading posts for topic:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @returns All topics
 * User can see all topics
 * He can filter them by name, owner, visibility
 */
app.get('/topics', async (req, res) => {
  try {
    const topics = await pool.query('SELECT * FROM topics');
    if (topics.rows.length === 0) {
      return res.status(404).json({ error: 'No topics found!' });
    } else {
      return res.status(200).json({ data: topics.rows });
    }
  } catch (e) {
    console.error('Something went wrong when loading topics...', e);
    return res.status(500).json({ error: 'Internal server error!' });
  }
});

/**
 * @@description This endpoint enables users to create posts in a specific topic.
 * @returns Status code 200 with a success message if the post is created successfully.
 * @params request body containing topic_id, user_id, and content.
 */

app.post('/post', async (req, res) => {
  const data = req.body;
  try {
    const topic = await pool.query('SELECT * FROM topics WHERE id = $1', [
      data.topic_id,
    ]);
    if (topic.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found!' });
    } else {
      await pool.query(
        'INSERT INTO posts (topic_id, user_id, content) VALUES ($1, $2, $3)',
        [data.topic_id, data.user_id, data.content],
      );
      return res.status(200).json({ message: 'Post created successfully!' });
    }
  } catch (e) {
    console.error('Something went wrong when creating post...', e);
    return res.status(500).json({ error: 'Internal server error!' });
  }
});

/**
 * @description Create a new post with a base64 encoded image
 * @returns The newly created post
 */
app.post('/posts', async (req, res) => {
  const { user_id, topic_id, content, location } = req.body;

  if (!user_id || !topic_id || !content) {
    return res
      .status(400)
      .json({ error: 'User ID, topic ID, and content are required' });
  }

  try {
    // Check if user and topic exist
    const userExists = await pool.query('SELECT id FROM users WHERE id = $1', [
      user_id,
    ]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const topicExists = await pool.query(
      'SELECT id FROM topics WHERE id = $1',
      [topic_id],
    );
    if (topicExists.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    let result;

    // Check if an image was provided
    if (image_data) {
      // Convert base64 to binary buffer
      const imageBuffer = Buffer.from(image_data, 'base64');
      console.log(`Received image of size ${imageBuffer.length} bytes`);

      // Store the image binary data in the database
      result = await pool.query(
        `INSERT INTO posts (user_id, topic_id, content, location, image_data)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, content, created_at`,
        [user_id, topic_id, content, location],
      );
    } else {
      // No image uploaded
      result = await pool.query(
        `INSERT INTO posts (user_id, topic_id, content, location)
         VALUES ($1, $2, $3, $4)
         RETURNING id, content, created_at`,
        [user_id, topic_id, content],
      );
    }

    // Return the new post
    return res.status(201).json({
      message: 'Post created successfully',
      data: result.rows[0],
    });
  } catch (e) {
    console.error('Error creating post:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @returns All posts
 */
app.get('/posts', async (req, res) => {
  try {
    const posts = await pool.query('SELECT * FROM posts');
    if (posts.rows.length === 0) {
      return res.status(404).json({ error: 'No posts found!' });
    } else {
      return res.status(200).json({ data: posts.rows });
    }
  } catch (e) {
    console.error('Something went wrong when loading posts...', e);
    return res.status(500).json({ error: 'Internal server error!' });
  }
});

/**
 * @description Get image data for a post
 * @returns Binary image data
 */
app.get('/posts/:id/image', async (req, res) => {
  const postId = req.params.id;

  try {
    const result = await pool.query(
      'SELECT image_data FROM posts WHERE id = $1 AND image_data IS NOT NULL',
      [postId],
    );

    if (result.rows.length === 0 || !result.rows[0].image_data) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Set appropriate content type and return the binary data
    res.set('Content-Type', 'image/jpeg');
    res.send(result.rows[0].image_data);
  } catch (e) {
    console.error('Error fetching image:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @description This endpoint allows users to delete their posts.
 * @returns Status code 200 with a success message if the post is deleted successfully.
 * @params request body containing post_id.
 */

app.delete('/post/:id', async (req, res) => {
  const postId = req.params.id;

  try {
    const post = await pool.query('SELECT * FROM posts WHERE id = $1', [
      postId,
    ]);
    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found!' });
    } else {
      await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
      return res.status(200).json({ message: 'Post deleted successfully!' });
    }
  } catch (e) {
    console.error('Something went wrong when deleting post...', e);
    return res.status(500).json({ error: 'Internal server error!' });
  }
});

/**
 * @returns created comment
 * User can add a comment to a post
 */
app.post('/comment', async (req, res) => {
  const data = req.body;
  try {
    const post = await pool.query('SELECT * FROM posts WHERE id = $1', [
      data.post_id,
    ]);
    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found!' });
    } else {
      await pool.query(
        'INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3)',
        [data.post_id, data.user_id, data.content],
      );
      return res.status(200).json({ message: 'Comment created successfully!' });
    }
  } catch (e) {
    console.error('Something went wrong when creating comment...', e);
    return res.status(500).json({ error: 'Internal server error!' });
  }
});

/**
 * @returns created reply
 * User can add a reply to a comment
 */
app.post('/reply', async (req, res) => {
  const data = req.body;
  try {
    const comment = await pool.query('SELECT * FROM comments WHERE id = $1', [
      data.comment_id,
    ]);
    if (comment.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found!' });
    } else {
      await pool.query(
        'INSERT INTO replies (comment_id, user_id, content) VALUES ($1, $2, $3)',
        [data.comment_id, data.user_id, data.content],
      );
      return res.status(200).json({ message: 'Reply created successfully!' });
    }
  } catch (e) {
    console.error('Something went wrong when creating reply...', e);
    return res.status(500).json({ error: 'Internal server error!' });
  }
});

/**
 * @description This endpoint allows users to vote on a post.
 * @returns Status code 200 with a success message if the vote is updated successfully.
 * @params request body containing vote value (+1 or -1).
 */
app.put('/post/:id/vote', async (req, res) => {
  const postId = req.params.id;
  const { vote } = req.body; // Expecting a vote value of either +1 or -1

  try {
    const post = await pool.query('SELECT * FROM posts WHERE id = $1', [
      postId,
    ]);
    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found!' });
    } else {
      await pool.query('UPDATE posts SET votes = votes + $1 WHERE id = $2', [
        vote,
        postId,
      ]);
      return res
        .status(200)
        .json({ message: 'Post vote updated successfully!' });
    }
  } catch (e) {
    console.error('Something went wrong when updating post vote...', e);
    return res.status(500).json({ error: 'Internal server error!' });
  }
});

/**
 * @description Get detailed information for a single post
 * @returns Post data including comment count
 */
app.get('/posts/:id', async (req, res) => {
  const postId = req.params.id;

  try {
    const result = await pool.query(
      `
      SELECT
        p.id,
        p.content,
        p.votes,
        p.created_at,
        u.username,
        t.name as topic_name,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN topics t ON p.topic_id = t.id
      WHERE p.id = $1
    `,
      [postId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    } else {
      return res.status(200).json({
        message: 'Post retrieved successfully',
        data: result.rows[0],
      });
    }
  } catch (e) {
    console.error('Error loading post:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @description Get comments for a specific post
 * @returns List of comments with usernames
 */
app.get('/posts/:id/comments', async (req, res) => {
  const postId = req.params.id;

  try {
    const result = await pool.query(
      `
      SELECT
        c.id,
        c.content,
        c.votes,
        c.created_at,
        u.username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at DESC
    `,
      [postId],
    );

    return res.status(200).json({
      message: 'Comments retrieved successfully',
      data: result.rows,
    });
  } catch (e) {
    console.error('Error loading comments:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @description Add a new comment to a post
 * @returns The newly created comment
 */
app.post('/posts/:id/comments', async (req, res) => {
  const postId = req.params.id;
  const { user_id, content } = req.body;

  if (!user_id || !content) {
    return res.status(400).json({ error: 'User ID and content are required' });
  }

  try {
    // Check if post exists
    const postCheck = await pool.query('SELECT id FROM posts WHERE id = $1', [
      postId,
    ]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Create the comment
    const result = await pool.query(
      `INSERT INTO comments (post_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at`,
      [postId, user_id, content],
    );

    // Get username for the response
    const userQuery = await pool.query(
      'SELECT username FROM users WHERE id = $1',
      [user_id],
    );
    const username = userQuery.rows[0].username;

    // Return the new comment with username
    return res.status(201).json({
      message: 'Comment added successfully',
      data: {
        ...result.rows[0],
        username,
        votes: 0,
      },
    });
  } catch (e) {
    console.error('Error adding comment:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @description Vote on a comment
 * @returns Status code 200 with a success message if the vote is updated
 * @params request body containing vote value (+1 or -1)
 */
app.put('/comment/:id/vote', async (req, res) => {
  const commentId = req.params.id;
  const { vote } = req.body; // Expecting a vote value of either +1 or -1

  if (vote !== 1 && vote !== -1) {
    return res.status(400).json({ error: 'Vote must be either 1 or -1' });
  }

  try {
    const comment = await pool.query('SELECT * FROM comments WHERE id = $1', [
      commentId,
    ]);
    if (comment.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found!' });
    } else {
      await pool.query('UPDATE comments SET votes = votes + $1 WHERE id = $2', [
        vote,
        commentId,
      ]);

      return res.status(200).json({ message: 'Vote updated successfully' });
    }
  } catch (e) {
    console.error('Error updating comment vote:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @description Get conversation list for a user
 * @returns List of conversations with latest message
 */
app.get('/conversations/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const conversations = await getConversationsForUser(userId);
    if (conversations.length === 0) {
      return res.status(200).json({
        message: 'No conversations found',
        data: [],
      });
    } else {
      return res.status(200).json({
        message: 'Conversations retrieved successfully',
        data: conversations,
      });
    }
  } catch (error) {
    console.error('Error retrieving conversations:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @description Get messages for a conversation
 * @returns List of messages
 */
app.get('/conversations/:conversationId/messages/:userId', async (req, res) => {
  const { conversationId, userId } = req.params;

  try {
    const messages = await getMessagesForConversation(conversationId, userId);
    return res.status(200).json({
      message: 'Messages retrieved successfully',
      data: messages,
    });
  } catch (error) {
    console.error('Error retrieving messages:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @description Create a new conversation between users
 */
app.post('/conversations', async (req, res) => {
  const { participants } = req.body;

  if (
    !participants ||
    !Array.isArray(participants) ||
    participants.length < 2
  ) {
    return res
      .status(400)
      .json({ error: 'At least two participants are required' });
  }

  try {
    // Create new conversation
    const newConversation = await pool.query(
      'INSERT INTO conversations DEFAULT VALUES RETURNING id, created_at',
    );
    const conversationId = newConversation.rows[0].id;

    // Add participants
    const participantValues = participants
      .map((userId) => `(${conversationId}, ${userId})`)
      .join(', ');
    await pool.query(`
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES ${participantValues}
    `);

    return res.status(201).json({
      message: 'Conversation created successfully',
      data: {
        id: conversationId,
        created_at: newConversation.rows[0].created_at,
        participants,
      },
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================================
// START THE SERVER
// ===========================================

// Start the server on port 8080 (will handle both HTTP and WebSocket)
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`REST API is available at http://localhost:${PORT}`);
  console.log(`WebSocket server is available at ws://localhost:${PORT}/chat`);
});
