import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { clear } from 'console';
import ModuleManager from './app/ModuleManager.js';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import { appConfig } from './app/util/config.js';
import { config } from 'dotenv';


const app = express();
const PORT = 8080;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create HTTP server to share between Express and Socket.IO
const server = createServer(app);
const moduleManager = new ModuleManager();
await moduleManager.initModules();
const PostgreSQLStore = pgSession(session);

// Get shared database connection BEFORE setting up sessions
console.log('🔗 Establishing shared database connection...');
const DefaultDBModule = await moduleManager.getModuleFromNamespace(appConfig().DATABASES.DEFAULT, 'DatabaseConnection');

const { default: DatabaseConnection } = await import(`file://${(path.resolve(__dirname, DefaultDBModule.moduleData._controller)).replace(/\\/g, '/')}`);
const DBConn = DatabaseConnection('pool');
await DBConn.connect();


if (DBConn?.getErrors().length > 0 || DBConn?.status !== true) {
  console.error('Database Connection Error:', DBConn.getErrors());
  process.exit(1);
}

console.log('✅ Database connection established successfully');

// Clean the CLIENT_URL to remove any potential quotes or whitespace
let clientUrl = process.env.CLIENT_URL;
if (clientUrl) {
  clientUrl = clientUrl.replace(/^["']|["']$/g, '').trim();
}

const finalClientUrl = clientUrl || "https://codebycisse-social-production.up.railway.app";

// Define allowed origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://codebycisse-social-production.up.railway.app',
  'https://codebycisse-social-server-production.up.railway.app',
  appConfig().SERVER // Backend UI
];

if (finalClientUrl && !allowedOrigins.includes(finalClientUrl)) {
  allowedOrigins.push(finalClientUrl);
}

// Initialize Socket.IO with connection limits
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  // Add Socket.IO connection limits
  maxHttpBufferSize: 1e6, // 1MB max message size
  pingTimeout: 60000,     // 60 seconds
  pingInterval: 25000     // 25 seconds
});

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'api_key',
    'q',
    'module',           
    'clause',  
    'fields',           
    'update',            
    'push',              
    'limit',             
    'orderBy',
    'searchFor',
    'search',
    'formattedJSON'
  ],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Use shared database connection for sessions (MEMORY LEAK FIX)
app.use(session({
  store: new PostgreSQLStore({
    // Use shared database connection instead of creating new ones
    // pg: DBConn.client.pool || DBConn.client,
    pool: DBConn.client.pool,
    tableName: 'user_sessions',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15 // Clean up expired sessions every 15 minutes
  }),
  secret: appConfig().SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Strip trailing slashes for consistency
app.use((req, res, next) => {
  if (req.path !== '/' && req.path.endsWith('/')) {
    const query = req.url.slice(req.path.length);
    res.redirect(301, req.path.slice(0, -1) + query);
  } else {
    next();
  }
});

// Socket.IO connection management with memory leak prevention
const connectedUsers = new Map(); // userId -> socketId
const userSockets = new Map();    // socketId -> user data

let connectionCount = 0;
const MAX_CONNECTIONS = 500; // Reduced from 1000 to be more conservative

// Socket.IO error handling
io.engine.on('connection_error', (err) => {
  console.error('Socket.IO connection error:', err);
});

// Enhanced Socket.IO event handling with memory leak prevention
io.on('connection', (socket) => {
  connectionCount++;

  if (connectionCount > MAX_CONNECTIONS) {
    console.warn(`Connection limit reached: ${connectionCount}`);
    socket.disconnect(true);
    connectionCount--;
    return;
  }

  console.log(`New client connected: ${socket.id} (Total: ${connectionCount})`);

  // Set authentication timeout to prevent zombie connections
  const authTimeout = setTimeout(() => {
    if (!userSockets.has(socket.id)) {
      console.log(`Disconnecting unauthenticated socket: ${socket.id}`);
      socket.disconnect(true);
    }
  }, 30000); // 30 seconds to authenticate

  // Handle user authentication with duplicate connection cleanup
  socket.on('authenticate', (userData) => {
    clearTimeout(authTimeout);

    try {
      const { userId, username, avatar } = userData;

      // Clean up any existing connection for this user (prevent duplicates)
      if (connectedUsers.has(userId)) {
        const oldSocketId = connectedUsers.get(userId);
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket && oldSocket.id !== socket.id) {
          console.log(`Disconnecting duplicate connection for user ${userId}`);
          oldSocket.disconnect(true);
        }
        userSockets.delete(oldSocketId);
      }

      // Store user connection
      connectedUsers.set(userId, socket.id);
      userSockets.set(socket.id, { userId, username, avatar });

      // Join user to their personal room
      socket.join(`user_${userId}`);

      // Notify other users that this user is online
      socket.broadcast.emit('user_online', userId);

      // Send current online users to the newly connected user
      const onlineUsers = Array.from(connectedUsers.keys());
      socket.emit('users_online', onlineUsers);

      console.log(`User ${username} (${userId}) authenticated`);
      socket.emit('auth_success', { userId, username });

    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('auth_error', 'Authentication failed');
      socket.disconnect(true);
    }
  });

  // Handle test messages
  socket.on('test_message', (data) => {
    console.log('Test message received:', data);
    socket.emit('test_response', { message: 'Message received successfully', data });
  });

  // Enhanced disconnection handling
  socket.on('disconnect', (reason) => {
    clearTimeout(authTimeout);
    connectionCount--;

    const userData = userSockets.get(socket.id);
    if (userData) {
      connectedUsers.delete(userData.userId);
      userSockets.delete(socket.id);
      socket.broadcast.emit('user_offline', userData.userId);
      console.log(`User ${userData.username} (${userData.userId}) disconnected: ${reason} (Total: ${connectionCount})`);
    } else {
      console.log(`Socket ${socket.id} disconnected: ${reason} (Total: ${connectionCount})`);
    }
  });

  // Handle socket errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    clearTimeout(authTimeout);
  });
});

// Make Socket.IO available to controllers
app.use((req, res, next) => {
  req.io = io;
  req.connectedUsers = connectedUsers;
  req.userSockets = userSockets;
  next();
});

// Socket helper functions for controllers
const socketHelpers = {
  emitToUser: (userId, event, data) => {
    io.to(`user_${userId}`).emit(event, data);
  },
  emitToRoom: (roomId, event, data) => {
    io.to(roomId).emit(event, data);
  },
  emitToAll: (event, data) => {
    io.emit(event, data);
  },
  getOnlineUsers: () => Array.from(connectedUsers.keys()),
  isUserOnline: (userId) => connectedUsers.has(userId),
  getIO: () => io
};

global.socketHelpers = socketHelpers;



app.use(express.static(path.join(__dirname, 'app', 'public')));

// Enhanced memory monitoring with Socket.IO cleanup
setInterval(() => {
  const memUsage = process.memoryUsage();
  const connections = {
    socket: connectionCount,
    userSockets: userSockets.size,
    connectedUsers: connectedUsers.size
  };

  console.log(`📊 Memory - RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB, Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  console.log(`🔌 Connections - Socket: ${connections.socket}, Users: ${connections.connectedUsers}, Maps: ${connections.userSockets}`);

  // Force garbage collection if available and memory is high
  if (memUsage.heapUsed > 300 * 1024 * 1024 && global.gc) {
    console.log('🧹 Running garbage collection...');
    global.gc();
  }

  if (memUsage.heapUsed > 400 * 1024 * 1024) {
    console.warn('⚠️  High memory usage detected!');
  }
}, 60000);

// Periodic cleanup of stale connections (MEMORY LEAK PREVENTION)
setInterval(() => {
  const socketsToClean = [];

  userSockets.forEach((userData, socketId) => {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket || !socket.connected) {
      socketsToClean.push(socketId);
    }
  });

  socketsToClean.forEach(socketId => {
    const userData = userSockets.get(socketId);
    if (userData) {
      connectedUsers.delete(userData.userId);
      userSockets.delete(socketId);
    }
  });

  if (socketsToClean.length > 0) {
    console.log(`🧹 Cleaned up ${socketsToClean.length} stale socket connections`);
  }
}, 5 * 60 * 1000); // Every 5 minutes

// Module management with better error handling


for (let pk in await moduleManager.getModules()) {
  try {
    const namespace = await moduleManager.getNamespace(pk);
    if (namespace.error !== '') {
      console.error(`Error found in namespace: ${namespace.error}. Skipping modules in that namespace`);
      continue;
    }
    const modules = namespace.namespaceData._modules;

    for (let module in modules) {
      try {
        // GET routes
        if (modules[module]._publicRoute !== '') {
          
          app.get(`/${modules[module]._publicRoute}`, async (req, res) => {
            const controllerPath = `file://${modules[module]._controller.replace(/\\/g, '/')}`;
            try {
              const { default: Controller } = await import(controllerPath);
              const result = await Controller(req, res, DBConn, global);

              if (!res.headersSent) {
                if (result?.type === 'redirect') {
                  return res.redirect(302, result.url);
                } else if (result?.type === 'html') {
                  return res.send(result.content);
                } else if (result?.type === 'json') {
                  return res.json(result.data);
                } else {
                  return res.json({
                    module: module,
                    module_info: modules[module],
                    error: result?.error || 'Controller completed without sending response'
                  });
                }
              }
            } catch (error) {
              console.error('Route handler error:', error);
              if (!res.headersSent) {
                res.status(500).json({
                  module: module,
                  module_info: modules[module],
                  error: 'Internal server error. Check logs.'
                });
              }
            }
          });
        }

        // POST routes
        if (modules[module]?._postRoute !== undefined && modules[module]?._postRoute !== null && modules[module]?._postRoute !== '') {
          
          app.post(`/${modules[module]?._postRoute}`, async (req, res) => {
            try {
              const controllerPath = `file://${modules[module]._controller.replace(/\\/g, '/')}`;
              const { default: Controller } = await import(controllerPath);
              const result = await Controller(req, res, DBConn, global);

              if (!res.headersSent) {
                if (result?.type === 'redirect') {
                  return res.redirect(302, result.url);
                } else if (result?.type === 'html') {
                  return res.send(result.content);
                } else if (result?.type === 'json') {
                  return res.json(result.data);
                } else {
                  return res.json({
                    module: module,
                    module_info: modules[module],
                    error: result?.error || 'Controller completed without sending response'
                  });
                }
              }
            } catch (error) {
              console.error('POST Route handler error:', error);
              if (!res.headersSent) {
                res.status(500).json({
                  module: module,
                  module_info: modules[module],
                  error: 'Internal server error. Check logs.'
                });
              }
            }
          });
        }

        // PUT routes
        if (modules[module]?._putRoute !== undefined && modules[module]?._putRoute !== null && modules[module]?._putRoute !== '') {
          
          app.put(`/${modules[module]?._putRoute}`, async (req, res) => {
            try {
              const controllerPath = `file://${modules[module]._controller.replace(/\\/g, '/')}`;
              const { default: Controller } = await import(controllerPath);
              const result = await Controller(req, res, DBConn, global);

              if (!res.headersSent) {
                if (result?.type === 'redirect') {
                  return res.redirect(302, result.url);
                } else if (result?.type === 'html') {
                  return res.send(result.content);
                } else if (result?.type === 'json') {
                  return res.json(result.data);
                } else {
                  return res.json({
                    module: module,
                    module_info: modules[module],
                    error: result?.error || 'Controller completed without sending response'
                  });
                }
              }
            } catch (error) {
              console.error('PUT Route handler error:', error);
              if (!res.headersSent) {
                res.status(500).json({
                  module: module,
                  module_info: modules[module],
                  error: 'Internal server error. Check logs.'
                });
              }
            }
          });
        }

        // DELETE routes
        if (modules[module]?._deleteRoute !== undefined && modules[module]?._deleteRoute !== null && modules[module]?._deleteRoute !== '') {
          
          app.delete(`/${modules[module]?._deleteRoute}`, async (req, res) => {
            try {
              const controllerPath = `file://${modules[module]._controller.replace(/\\/g, '/')}`;
              const { default: Controller } = await import(controllerPath);
              const result = await Controller(req, res, DBConn, global);

              if (!res.headersSent) {
                if (result?.type === 'redirect') {
                  return res.redirect(302, result.url);
                } else if (result?.type === 'html') {
                  return res.send(result.content);
                } else if (result?.type === 'json') {
                  return res.json(result.data);
                } else {
                  return res.json({
                    module: module,
                    module_info: modules[module],
                    error: result?.error || 'Controller completed without sending response'
                  });
                }
              }
            } catch (error) {
              console.error('DELETE Route handler error:', error);
              if (!res.headersSent) {
                res.status(500).json({
                  module: module,
                  module_info: modules[module],
                  error: 'Internal server error. Check logs.'
                });
              }
            }
          });
        }
      } catch (moduleError) {
        console.error(`Error setting up module ${module}:`, moduleError);
        continue;
      }
    }
  } catch (error) {
    console.error(`Error processing namespace ${pk}:`, error);
    continue;
  }
}

app.get("/", async (req, res) => {
  res.redirect(302, '/modules');
});

// Enhanced error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Graceful cleanup before exit
  if (DBConn?.client.pool) {
    DBConn.client.pool.end();
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully`);

  // Close new connections
  server.close(() => {
    console.log('HTTP server closed');

    // Close database connections
    if (DBConn.client?.pool) {
      DBConn.client.pool.end(() => {
        console.log('Database connections closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server is running on ${appConfig().SERVER}. PORT: => ${PORT}`);
  console.log(`🔌 Socket.IO server is ready for connections`);
  console.log(`💾 Using shared PostgreSQL connection - memory leaks fixed!`);
  console.log(`📊 Max connections: ${MAX_CONNECTIONS}`);
});