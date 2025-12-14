import axios from 'axios';

class ChatGPTService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiUrl = 'https://api.openai.com/v1/responses';
    console.log('[chatGPTService.js - constructor] 🤖 ChatGPT Service - WORKING ENDPOINT FORMAT');
    console.log('[chatGPTService.js - constructor] 🔗 API URL:', this.apiUrl);
    console.log('[chatGPTService.js - constructor] 🔑 API Key configured:', this.apiKey ? 'YES' : 'NO');
    console.log('[chatGPTService.js - constructor] 🔑 FULL API KEY VALUE:', this.apiKey);
    console.log('[chatGPTService.js - constructor] 🔑 API Key length:', this.apiKey ? this.apiKey.length : 0);
    console.log('[chatGPTService.js - constructor] 🔑 API Key first 10 chars:', this.apiKey ? this.apiKey.substring(0, 10) : 'N/A');
    console.log('[chatGPTService.js - constructor] 🔑 API Key last 4 chars:', this.apiKey ? this.apiKey.substring(this.apiKey.length - 4) : 'N/A');
  }

  async generateResponse(userMessage, conversationHistory = [], sessionId = null) {
    console.log('[chatGPTService.js - generateResponse] 🚀 WORKING FORMAT - Generating response for:', userMessage.substring(0, 50) + '...');
    console.log('[chatGPTService.js - generateResponse] 🔑 Using API Key:', this.apiKey);
    
    if (!this.apiKey || this.apiKey === 'your_openai_api_key_here') {
      const error = 'OpenAI API key is not configured';
      console.error('[chatGPTService.js - generateResponse] ❌ API Key Error:', error);
      throw new Error(error);
    }

    try {
      console.log('[chatGPTService.js - generateResponse] 📋 Building request - EXACT WORKING FORMAT...');
      
      const requestData = {
        model: 'gpt-4.1-mini',
        input: userMessage
      };

      console.log('[chatGPTService.js - generateResponse] 📦 Request data:', JSON.stringify(requestData, null, 2));
      
      const response = await axios.post(this.apiUrl, requestData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[chatGPTService.js - generateResponse] ✅ Response received!');
      console.log('[chatGPTService.js - generateResponse] 📊 Status:', response.status);
      console.log('[chatGPTService.js - generateResponse] 📄 Response data:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.output && response.data.output[0] && response.data.output[0].content && response.data.output[0].content[0]) {
        const aiResponse = response.data.output[0].content[0].text.trim();
        console.log('[chatGPTService.js - generateResponse] 🎯 AI Response:', aiResponse);
        return aiResponse;
      } else {
        console.error('[chatGPTService.js - generateResponse] ❌ Unexpected response format:', response.data);
        throw new Error('Invalid response format from OpenAI');
      }

    } catch (error) {
      console.error('[chatGPTService.js - generateResponse] ❌ Error occurred:', error.message);
      
      if (error.response) {
        console.error('[chatGPTService.js - generateResponse] 📊 Error Status:', error.response.status);
        console.error('[chatGPTService.js - generateResponse] 📄 Error Response:', JSON.stringify(error.response.data, null, 2));
        throw new Error(`OpenAI API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('[chatGPTService.js - generateResponse] 📡 No response received');
        throw new Error('No response received from OpenAI API');
      } else {
        console.error('[chatGPTService.js - generateResponse] 🚫 Request setup error:', error.message);
        throw error;
      }
    }
  }
}

export const chatGPTService = new ChatGPTService();