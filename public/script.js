const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const stopButton = document.getElementById("stopButton");

// Connect to WebSocket via the Vercel serverless function
const ws = new WebSocket(`wss://${window.location.hostname}/api/websocket`);

ws.onmessage = (event) => {
  let messageData = event.data;

  try {
    const parsedMessage = JSON.parse(messageData);
    addMessageToChat(parsedMessage.message);
  } catch (e) {
    console.error("Failed to parse WebSocket message:", messageData);
  }
};

// Send a message when the send button is clicked or Enter is pressed
sendButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

// Stop the chat when the "Stop Chat" button is clicked
stopButton.addEventListener("click", stopChat);

function sendMessage() {
  const message = messageInput.value.trim();
  if (message) {
    ws.send(JSON.stringify({ message }));
    addMessageToChat(`You: ${message}`);
    messageInput.value = "";
  }
}

function stopChat() {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ message: "User has ended the chat." }));
    ws.close(); // Close the WebSocket connection
    addMessageToChat("You have ended the chat.");
  }
}

function addMessageToChat(message) {
  const messageElem = document.createElement("div");
  messageElem.textContent = message;
  messagesDiv.appendChild(messageElem);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
