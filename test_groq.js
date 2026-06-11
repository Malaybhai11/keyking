const axios = require('axios');
const key = process.env.GROQ_API_KEY;

async function run() {
  try {
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: "llama-3.3-70b-versatile",
      messages: [{role: "user", content: "hi"}],
      tools: [{
        type: "function",
        function: { name: "test", description: "test", parameters: {type: "object"} }
      }],
      tool_choice: "required"
    }, {
      headers: { Authorization: `Bearer ${key}` }
    });
    console.log(res.status);
  } catch(e) {
    console.error(e.response?.status, e.response?.data);
  }
}
run();
