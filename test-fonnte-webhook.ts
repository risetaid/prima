import fetch from 'node-fetch';

async function testFonnteWebhook() {
  const baseUrl = 'https://prima-production.up.railway.app';
  const testToken = 'test-token'; // You'll need to replace this with actual token

  const testMessage = {
    sender: '081333852187',
    message: 'halo, siapa kamu?',
    device: 'test'
  };

  try {
    console.log('Testing Fonnte webhook with message:', testMessage);

    const response = await fetch(`${baseUrl}/api/webhooks/fonnte/incoming`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify(testMessage)
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', result);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testFonnteWebhook();