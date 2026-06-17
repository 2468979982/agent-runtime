const apiKey = process.env.OPENAI_API_KEY || 'sk-gw-xxx';
const baseURL = process.env.BASE_URL || 'https://openai.u2o6.com/v1';

console.log('Testing OpenAI API with fetch()...');
console.log('API Key:', apiKey.substring(0, 10) + '...');
console.log('Base URL:', baseURL);

async function testAPI() {
  try {
    console.log('Sending chat request with fetch()...');
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'qwen-plus',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: false
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error:', response.status, errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Success!');
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testAPI();
