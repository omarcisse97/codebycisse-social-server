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
import { appConfig } from './app/util/config.js';

const app = express();
const PORT = 8080;

// Create HTTP server to share between Express and Socket.IO
const server = createServer(app);

// DEBUG: Log environment variables
console.log('=== CORS DEBUG INFO ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('CLIENT_URL raw:', JSON.stringify(process.env.CLIENT_URL));
console.log('CLIENT_URL type:', typeof process.env.CLIENT_URL);
console.log('CLIENT_URL length:', process.env.CLIENT_URL?.length);

// Clean the CLIENT_URL to remove any potential quotes or whitespace
let clientUrl = process.env.CLIENT_URL;
if (clientUrl) {
  // Remove quotes if they exist
  clientUrl = clientUrl.replace(/^["']|["']$/g, '');
  // Trim whitespace
  clientUrl = clientUrl.trim();
}

const finalClientUrl = clientUrl || "https://codebycisse-social-production.up.railway.app";
console.log('Final CLIENT_URL:', JSON.stringify(finalClientUrl));
console.log('======================');

// Define allowed origins more explicitly
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://codebycisse-social-production.up.railway.app'
];

// Add the cleaned CLIENT_URL if it's different
if (finalClientUrl && !allowedOrigins.includes(finalClientUrl)) {
  allowedOrigins.push(finalClientUrl);
}

console.log('Allowed origins:', allowedOrigins);

// Initialize Socket.IO with better CORS handling
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      console.log('Socket.IO CORS check for origin:', origin);
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.log('Socket.IO CORS rejected origin:', origin);
        return callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Enhanced CORS configuration with debugging
app.use(cors({
  origin: function (origin, callback) {
    console.log('Express CORS check for origin:', origin);
    console.log('Request from origin:', origin, 'allowed origins:', allowedOrigins);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('No origin - allowing request');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log('Origin allowed:', origin);
      return callback(null, true);
    } else {
      console.log('Origin rejected:', origin);
      return callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: appConfig().SECRET, // use env var in production!
  resave: false,
  saveUninitialized: false,
}));

// 🔧 Strip trailing slashes for consistency (e.g., /admin/logout/ -> /admin/logout)
app.use((req, res, next) => {
  if (req.path !== '/' && req.path.endsWith('/')) {
    const query = req.url.slice(req.path.length);
    res.redirect(301, req.path.slice(0, -1) + query);
  } else {
    next();
  }
});

// Socket.IO connection management
const connectedUsers = new Map(); // userId -> socketId
const userSockets = new Map();    // socketId -> user data

// Socket.IO event handling
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Handle user authentication
  socket.on('authenticate', (userData) => {
    try {
      const { userId, username, avatar } = userData;
      
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
      
      // Send confirmation to client
      socket.emit('auth_success', { userId, username });
      
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('auth_error', 'Authentication failed');
    }
  });

  // Handle basic message (for testing)
  socket.on('test_message', (data) => {
    console.log('Test message received:', data);
    socket.emit('test_response', { message: 'Message received successfully', data });
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    const userData = userSockets.get(socket.id);
    
    if (userData) {
      // Remove user from connected users
      connectedUsers.delete(userData.userId);
      userSockets.delete(socket.id);
      
      // Notify other users that this user is offline
      socket.broadcast.emit('user_offline', userData.userId);
      
      console.log(`User ${userData.username} (${userData.userId}) disconnected: ${reason}`);
    } else {
      console.log(`Socket ${socket.id} disconnected: ${reason}`);
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
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
  // Send message to specific user
  emitToUser: (userId, event, data) => {
    io.to(`user_${userId}`).emit(event, data);
  },
  
  // Send message to all users in a room
  emitToRoom: (roomId, event, data) => {
    io.to(roomId).emit(event, data);
  },
  
  // Send message to all connected users
  emitToAll: (event, data) => {
    io.emit(event, data);
  },
  
  // Get online users
  getOnlineUsers: () => Array.from(connectedUsers.keys()),
  
  // Check if user is online
  isUserOnline: (userId) => connectedUsers.has(userId),
  
  // Get Socket.IO instance
  getIO: () => io
};

// Make socket helpers available globally for controllers
global.socketHelpers = socketHelpers;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__dirname);

app.use(express.static(path.join(__dirname, 'app', 'public')));

const moduleManager = new ModuleManager();
await moduleManager.initModules();

for (let pk in await moduleManager.getModules()) {
  const namespace = await moduleManager.getNamespace(pk);
  if (namespace.error !== '') {
    console.error(`Error found in namespace: ${namespace.error}. Skipping modules in that namespace`);
    continue;
  }
  const modules = namespace.namespaceData._modules;
  for (let module in modules) {
    
    if (modules[module]._publicRoute !== '') {
      app.get(`/${modules[module]._publicRoute}`, async (req, res) => {
        const controllerPath = `file://${modules[module]._controller.replace(/\\/g, '/')}`;

        console.log('GET Request: ', modules[module]._publicRoute)
        if (req?.params) {
          console.log('- Params: ', req?.params);
        }
        if (req?.body) {
          console.log('- Request Body: ', req?.body);
        }

        try {
          const { default: Controller } = await import(controllerPath);
          const result = await Controller(req, res);

          // Only send JSON response if headers haven't been sent yet
          // (meaning the controller didn't handle the response)
          if (!res.headersSent) {
            // Handle structured response objects (for newer controllers)
            if (result?.type === 'redirect') {
              return res.redirect(302, result.url);
            } else if (result?.type === 'html') {
              return res.send(result.content);
            } else if (result?.type === 'json') {
              return res.json(result.data);
            } else {
              // Fallback - send error info
              return res.json({
                module: module,
                module_info: modules[module],
                error: result?.error || 'Controller completed without sending response'
              });
            }
          }
          // If headers were sent, the controller handled the response directly

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
    if (modules[module]?._postRoute !== undefined && modules[module]?._postRoute !== null && modules[module]?._postRoute !== '') {

      app.post(`/${modules[module]?._postRoute}`, async (req, res) => {
        console.log('POST Request: ', modules[module]._postRoute);
        if (req?.params) {
          console.log('- Params: ', req?.params);
        }
        if (req?.body) {
          console.log('- Request Body: ', req?.body);
        }

        try {
          const controllerPath = `file://${modules[module]._controller.replace(/\\/g, '/')}`;
          const { default: Controller } = await import(controllerPath);
          const result = await Controller(req, res);

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
    if (modules[module]?._putRoute !== undefined && modules[module]?._putRoute !== null && modules[module]?._putRoute !== '') {
      app.put(`/${modules[module]?._putRoute}`, async (req, res) => {
        console.log('PUT Request: ', modules[module]._putRoute);
        if (req?.params) {
          console.log('- Params: ', req?.params);
        }
        if (req?.body) {
          console.log('- Request Body: ', req?.body);
        }

        try {
          const controllerPath = `file://${modules[module]._controller.replace(/\\/g, '/')}`;
          const { default: Controller } = await import(controllerPath);
          const result = await Controller(req, res);

          if (!res.headersSent) {
            // Handle structured response objects (for newer controllers)
            if (result?.type === 'redirect') {
              return res.redirect(302, result.url);
            } else if (result?.type === 'html') {
              return res.send(result.content);
            } else if (result?.type === 'json') {
              return res.json(result.data);
            } else {
              // Fallback - send error info
              return res.json({
                module: module,
                module_info: modules[module],
                error: result?.error || 'Controller completed without sending response'
              });
            }
          }
          // If headers were sent, the controller handled the response directly

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

    if (modules[module]?._deleteRoute !== undefined && modules[module]?._deleteRoute !== null && modules[module]?._deleteRoute !== '') {
      app.delete(`/${modules[module]?._deleteRoute}`, async (req, res) => {
        console.log('DELETE Request: ', modules[module]._deleteRoute);
        if (req?.params) {
          console.log('- Params: ', req?.params);
        }
        if (req?.body) {
          console.log('- Request Body: ', req?.body);
        }

        try {
          const controllerPath = `file://${modules[module]._controller.replace(/\\/g, '/')}`;
          const { default: Controller } = await import(controllerPath);
          const result = await Controller(req, res);

          if (!res.headersSent) {
            // Handle structured response objects (for newer controllers)
            if (result?.type === 'redirect') {
              return res.redirect(302, result.url);
            } else if (result?.type === 'html') {
              return res.send(result.content);
            } else if (result?.type === 'json') {
              return res.json(result.data);
            } else {
              // Fallback - send error info
              return res.json({
                module: module,
                module_info: modules[module],
                error: result?.error || 'Controller completed without sending response'
              });
            }
          }
          // If headers were sent, the controller handled the response directly

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
  }

}
app.get("/", async (req, res) => {
  console.log('Accessing root. Need to redirect');
  res.redirect(302, '/modules');
});

// Use server.listen instead of app.listen to support Socket.IO
server.listen(PORT, () => {
  console.log(`Server is running on ${appConfig().SERVER}. PORT: => ${PORT}`);
  console.log(`Socket.IO server is ready for connections on ws://localhost:${PORT}`);
});