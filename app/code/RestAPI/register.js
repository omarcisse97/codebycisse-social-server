import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const Registration = () => {
    return {
        _namespace: 'RestAPI',
        _modules: {
            ApiKeyManagement: {
                _moduleName: 'Api Key Management',
                _modulePath: path.join(__dirname, 'ApiKeyManagement'),
                _controller: path.join(__dirname, 'ApiKeyManagement', 'Controller', 'controller.js'),
                _publicRoute: 'api/keys',
                _displayInModules: "true"
            },
            KeyUpdates: {
                _moduleName: 'KeyUpdates',
                _publicRoute: '',
                _modulePath: path.join(__dirname, 'KeyUpdates'),
                _controller: path.join(__dirname, 'KeyUpdates', 'Controller', 'controller.js'),
                _postRoute: 'api/keys/update/:type/:handle',
                _displayInModules: "false"
            },
            Users: {
                _moduleName: 'Users',
                _modulePath: path.join(__dirname, 'Users'),
                _controller: path.join(__dirname, 'Users', 'Controller', 'controller.js'),
                _publicRoute: 'api/users/:handle',  // GET /api/users/all or /api/users/{user_id}
                _postRoute: 'api/users',           // POST /api/users (create user)
                _putRoute: 'api/users/:handle',    // PUT /api/users/{user_id} (update user)
                _deleteRoute: 'api/users/:handle', // DELETE /api/users/{user_id}
                _displayInModules: "false"
            },

            // Avatars API
            Avatars: {
                _moduleName: 'Avatars',
                _modulePath: path.join(__dirname, 'Avatars'),
                _controller: path.join(__dirname, 'Avatars', 'Controller', 'controller.js'),
                _publicRoute: 'api/avatars/:handle',  // GET /api/avatars/{user_id}
                _postRoute: 'api/avatars',           // POST /api/avatars (create avatar)
                _putRoute: 'api/avatars/:handle',    // PUT /api/avatars/{user_id} (update avatar)
                _deleteRoute: 'api/avatars/:handle', // DELETE /api/avatars/{user_id}
                _displayInModules: "false"
            },

            // Posts API
            Posts: {
                _moduleName: 'Posts',
                _modulePath: path.join(__dirname, 'Posts'),
                _controller: path.join(__dirname, 'Posts', 'Controller', 'controller.js'),
                _publicRoute: 'api/posts/:handle',   // GET /api/posts/all or /api/posts/{post_id}
                _postRoute: 'api/posts',            // POST /api/posts (create post)
                _putRoute: 'api/posts/:handle',     // PUT /api/posts/{post_id} (update post)
                _deleteRoute: 'api/posts/:handle',  // DELETE /api/posts/{post_id}
                _displayInModules: "false"
            },

            // User Posts (specialized endpoint)
            UserPosts: {
                _moduleName: 'UserPosts',
                _modulePath: path.join(__dirname, 'UserPosts'),
                _controller: path.join(__dirname, 'UserPosts', 'Controller', 'controller.js'),
                _publicRoute: 'api/users/:handle/posts', // GET /api/users/{user_id}/posts
                _displayInModules: "false"
            },

            // Comments API
            Comments: {
                _moduleName: 'Comments',
                _modulePath: path.join(__dirname, 'Comments'),
                _controller: path.join(__dirname, 'Comments', 'Controller', 'controller.js'),
                _publicRoute: 'api/comments/:handle',  // GET /api/comments/{post_id} (get all comments for post)
                _postRoute: 'api/comments',           // POST /api/comments (create comment)
                _putRoute: 'api/comments/:handle',    // PUT /api/comments/{comment_id} (update comment)
                _deleteRoute: 'api/comments/:handle', // DELETE /api/comments/{comment_id}
                _displayInModules: "false"
            },

            // Likes API
            Likes: {
                _moduleName: 'Likes',
                _modulePath: path.join(__dirname, 'Likes'),
                _controller: path.join(__dirname, 'Likes', 'Controller', 'controller.js'),
                _postRoute: 'api/likes',            // POST /api/likes (like/unlike post or comment)
                _deleteRoute: 'api/likes/:handle',   // DELETE /api/likes/{like_id}
                _publicRoute: 'api/likes/:handle',   // GET /api/likes/{post_id or comment_id}
                _displayInModules: "false"
            },

            // Follows API
            Follows: {
                _moduleName: 'Follows',
                _modulePath: path.join(__dirname, 'Follows'),
                _controller: path.join(__dirname, 'Follows', 'Controller', 'controller.js'),
                _publicRoute: 'api/follows/:handle',  // GET /api/follows/{user_id} (get followers/following)
                _postRoute: 'api/follows',           // POST /api/follows (follow user)
                _putRoute: 'api/follows/:handle',    // PUT /api/follows/{follow_id} (accept/reject follow request)
                _deleteRoute: 'api/follows/:handle', // DELETE /api/follows/{follow_id} (unfollow)
                _displayInModules: "false"
            },

            // Messages API
            Messages: {
                _moduleName: 'Messages',
                _modulePath: path.join(__dirname, 'Messages'),
                _controller: path.join(__dirname, 'Messages', 'Controller', 'controller.js'),
                _publicRoute: 'api/messages/:handle',  // GET /api/messages/{conversation_id}
                _postRoute: 'api/messages',           // POST /api/messages (send message)
                _putRoute: 'api/messages/:handle',    // PUT /api/messages/{message_id} (edit message)
                _deleteRoute: 'api/messages/:handle', // DELETE /api/messages/{message_id}
                _displayInModules: "false"
            },

            // Conversations API
            Conversations: {
                _moduleName: 'Conversations',
                _modulePath: path.join(__dirname, 'Conversations'),
                _controller: path.join(__dirname, 'Conversations', 'Controller', 'controller.js'),
                _publicRoute: 'api/conversations/:handle', // GET /api/conversations/{user_id} (get user's conversations)
                _postRoute: 'api/conversations',          // POST /api/conversations (create conversation)
                _putRoute: 'api/conversations/:handle',   // PUT /api/conversations/{conversation_id} (update conversation)
                _deleteRoute: 'api/conversations/:handle', // DELETE /api/conversations/{conversation_id}
                _displayInModules: "false"
            },

            // Conversation Participants API
            ConversationParticipants: {
                _moduleName: 'ConversationParticipants',
                _modulePath: path.join(__dirname, 'ConversationParticipants'),
                _controller: path.join(__dirname, 'ConversationParticipants', 'Controller', 'controller.js'),
                _publicRoute: 'api/conversations/:handle/participants', // GET /api/conversations/{conversation_id}/participants
                _postRoute: 'api/conversations/participants',          // POST /api/conversations/participants (add participant)
                _putRoute: 'api/conversations/participants/:handle',   // PUT /api/conversations/participants/{participant_id} (update admin status)
                _deleteRoute: 'api/conversations/participants/:handle', // DELETE /api/conversations/participants/{participant_id} (remove participant)
                _displayInModules: "false"
            },

            // Message Reads API
            MessageReads: {
                _moduleName: 'MessageReads',
                _modulePath: path.join(__dirname, 'MessageReads'),
                _controller: path.join(__dirname, 'MessageReads', 'Controller', 'controller.js'),
                _publicRoute: 'api/messages/:handle/reads', // GET /api/messages/{message_id}/reads
                _postRoute: 'api/messages/reads',          // POST /api/messages/reads (mark message as read)
                _deleteRoute: 'api/messages/reads/:handle', // DELETE /api/messages/reads/{read_id}
                _displayInModules: "false"
            },

            // Notifications API
            Notifications: {
                _moduleName: 'Notifications',
                _modulePath: path.join(__dirname, 'Notifications'),
                _controller: path.join(__dirname, 'Notifications', 'Controller', 'controller.js'),
                _publicRoute: 'api/notifications/:handle', // GET /api/notifications/{user_id}
                _postRoute: 'api/notifications',          // POST /api/notifications (create notification)
                _putRoute: 'api/notifications/:handle',   // PUT /api/notifications/{notification_id} (mark as read)
                _deleteRoute: 'api/notifications/:handle', // DELETE /api/notifications/{notification_id}
                _displayInModules: "false"
            },

            // User Settings API
            UserSettings: {
                _moduleName: 'UserSettings',
                _modulePath: path.join(__dirname, 'UserSettings'),
                _controller: path.join(__dirname, 'UserSettings', 'Controller', 'controller.js'),
                _publicRoute: 'api/settings/:handle',  // GET /api/settings/{user_id}
                _postRoute: 'api/settings',           // POST /api/settings (create user settings)
                _putRoute: 'api/settings/:handle',     // PUT /api/settings/{user_id}
                _deleteRoute: 'api/settings/:handle',  // DELETE /api/settings/{user_id}
                _displayInModules: "false"
            },

            // Hashtags API
            Hashtags: {
                _moduleName: 'Hashtags',
                _modulePath: path.join(__dirname, 'Hashtags'),
                _controller: path.join(__dirname, 'Hashtags', 'Controller', 'controller.js'),
                _publicRoute: 'api/hashtags/:handle',  // GET /api/hashtags/trending or /api/hashtags/{hashtag_name}
                _postRoute: 'api/hashtags',           // POST /api/hashtags (create hashtag)
                _putRoute: 'api/hashtags/:handle',    // PUT /api/hashtags/{hashtag_id} (update usage count)
                _deleteRoute: 'api/hashtags/:handle', // DELETE /api/hashtags/{hashtag_id}
                _displayInModules: "false"
            },

            // Post Hashtags API (Junction table)
            PostHashtags: {
                _moduleName: 'PostHashtags',
                _modulePath: path.join(__dirname, 'PostHashtags'),
                _controller: path.join(__dirname, 'PostHashtags', 'Controller', 'controller.js'),
                _publicRoute: 'api/posts/:handle/hashtags', // GET /api/posts/{post_id}/hashtags
                _postRoute: 'api/posts/hashtags',          // POST /api/posts/hashtags (add hashtag to post)
                _deleteRoute: 'api/posts/hashtags/:handle', // DELETE /api/posts/hashtags/{post_hashtag_id}
                _displayInModules: "false"
            },

            // Reports API (Content Moderation)
            Reports: {
                _moduleName: 'Reports',
                _modulePath: path.join(__dirname, 'Reports'),
                _controller: path.join(__dirname, 'Reports', 'Controller', 'controller.js'),
                _publicRoute: 'api/reports/:handle',  // GET /api/reports/all (admin only)
                _postRoute: 'api/reports',           // POST /api/reports (create report)
                _putRoute: 'api/reports/:handle',    // PUT /api/reports/{report_id} (review report)
                _deleteRoute: 'api/reports/:handle', // DELETE /api/reports/{report_id}
                _displayInModules: "false"
            }
        }
    }

}
export default Registration;