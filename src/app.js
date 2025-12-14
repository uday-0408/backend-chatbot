import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chatRoutes.js";
import { chatGPTService } from "./services/chatGPTService.js";

const app = express();

// Enable CORS
app.use(cors());

// Parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Test endpoint for ChatGPT
app.post('/api/test-chatgpt', async (req, res) => {
  console.log('\n🧪 TEST CHATGPT ENDPOINT CALLED');
  console.log('📝 Request body:', req.body);
  
  const { message } = req.body;
  
  if (!message) {
    console.error('❌ Missing message in request');
    return res.status(400).json({ error: 'Message is required' });
  }
  
  try {
    console.log('🚀 Testing ChatGPT with message:', message);
    const response = await chatGPTService.generateResponse(message, []);
    console.log('✅ Test successful. Response:', response);
    
    res.json({ 
      success: true, 
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use("/api", chatRoutes);

export default app;
