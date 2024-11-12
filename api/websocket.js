// api/websocket.js
import { Server } from "ws";
import path from "path";
import fs from "fs";

// Directory to store chat logs
const CHAT_LOGS_DIR = path.join(__dirname, "..", "chat_logs");

// Ensure the chat logs directory exists
if (!fs.existsSync(CHAT_LOGS_DIR)) {
  fs.mkdirSync(CHAT_LOGS_DIR);
}

// Function to save chat messages to a file
function saveChatToFile(chatId, messages) {
  const logFilePath = path.join(CHAT_LOGS_DIR, `${chatId}.txt`);
  const logMessages = messages.join("\n"); // Join all messages as a string
  fs.writeFileSync(logFilePath, logMessages, "utf8");
}

export default function handler(req, res) {
  if (req.method === "GET") {
    // Create a WebSocket server within the Vercel function
    const wss = new Server({ noServer: true });

    let waitingClient = null; // Store a client waiting for a partner

    wss.on("connection", (ws) => {
      let chatMessages = []; // Store messages for a specific chat session
      let userCounter = 1; // Track which user is sending messages (User 1 or User 2)

      if (waitingClient) {
        // Pair the current user with the waiting user
        ws.partner = waitingClient;
        waitingClient.partner = ws;

        ws.send(
          JSON.stringify({ message: "You are now chatting with a stranger!" })
        );
        waitingClient.send(
          JSON.stringify({ message: "You are now chatting with a stranger!" })
        );

        waitingClient = null; // Reset waiting client
      } else {
        // No one waiting, so this user waits
        waitingClient = ws;
        ws.send(
          JSON.stringify({ message: "Waiting for a stranger to connect..." })
        );
      }

      // Handle incoming messages
      ws.on("message", (message) => {
        if (ws.partner) {
          // Relay the message to the partner
          ws.partner.send(message);

          // Save the message to the chat log array (User 1 or User 2)
          chatMessages.push(`User ${userCounter}: ${message}`);
          userCounter = userCounter === 1 ? 2 : 1; // Alternate between User 1 and User 2
        }
        if (message === "User has ended the chat.") {
          // Handle chat stop scenario
          if (ws.partner) {
            ws.partner.send("The other user has ended the chat.");
          }
          saveChatToFile(Date.now().toString(), chatMessages); // Save chat logs
          ws.close(); // Close the WebSocket connection
        }
      });

      // Handle disconnects
      ws.on("close", () => {
        if (ws.partner) {
          ws.partner.send(
            JSON.stringify({ message: "Stranger has disconnected." })
          );
          ws.partner.partner = null;
          // Save the chat log when the chat ends
          saveChatToFile(Date.now().toString(), chatMessages);
        }
        if (waitingClient === ws) {
          waitingClient = null;
        }
      });
    });

    // Handle WebSocket upgrade request from HTTP
    req.socket.on("upgrade", (req, socket, head) => {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    });

    res.status(200).send("WebSocket server is running");
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
