import { Server } from "ws";
import { IncomingMessage, ServerResponse } from "http";

// WebSocket server
export default function handler(req, res) {
  if (req.method === "GET") {
    const wsServer = new Server({ noServer: true });

    let waitingClient = null; // Store a client waiting for a partner

    wsServer.on("connection", (ws) => {
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

    // Upgrade the HTTP request to WebSocket
    req.socket.on("upgrade", (req, socket, head) => {
      wsServer.handleUpgrade(req, socket, head, (ws) => {
        wsServer.emit("connection", ws, req);
      });
    });

    res.status(200).send("WebSocket server is running");
  } else {
    // Respond with 405 for non-GET requests
    res.status(405).json({ message: "Method not allowed" });
  }
}
