import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Clear Auth Cache</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
        }
        button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          margin: 10px 0;
        }
        button:hover {
          background: #2563eb;
        }
        pre {
          background: #f3f4f6;
          padding: 15px;
          border-radius: 8px;
          overflow-x: auto;
        }
        .success {
          color: #10b981;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <h1>🧹 Clear PRIMA Auth Cache</h1>
      <button onclick="clearCache()">Clear Cache & Reload</button>
      <button onclick="showCache()">Show Current Cache</button>
      <div id="result"></div>
      
      <script>
        function clearCache() {
          // Clear all PRIMA-related cache
          localStorage.removeItem('prima_user_auth_status');
          localStorage.removeItem('prima_last_successful_login');
          
          // Also clear any other potential cache keys
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.includes('prima') || key.includes('clerk')) {
              localStorage.removeItem(key);
            }
          });
          
          // Clear session storage too
          sessionStorage.clear();
          
          document.getElementById('result').innerHTML = '<p class="success">✅ All cache cleared! Reloading in 2 seconds...</p>';
          setTimeout(() => {
            window.location.href = '/sign-in';
          }, 2000);
        }
        
        function showCache() {
          const authCache = localStorage.getItem('prima_user_auth_status');
          const loginCache = localStorage.getItem('prima_last_successful_login');
          
          let html = '<h3>Current Cache:</h3>';
          
          if (authCache) {
            try {
              const parsed = JSON.parse(authCache);
              html += '<h4>Auth Status:</h4><pre>' + JSON.stringify(parsed, null, 2) + '</pre>';
            } catch (e) {
              html += '<p>Auth cache exists but is invalid</p>';
            }
          } else {
            html += '<p>No auth cache found</p>';
          }
          
          if (loginCache) {
            const timestamp = parseInt(loginCache);
            const date = new Date(timestamp);
            html += '<h4>Last Login:</h4><pre>' + date.toLocaleString() + '</pre>';
          } else {
            html += '<p>No login timestamp found</p>';
          }
          
          document.getElementById('result').innerHTML = html;
        }
        
        // Auto-show cache on load
        showCache();
      </script>
    </body>
    </html>
    `,
    {
      headers: {
        'Content-Type': 'text/html',
      },
    }
  );
}
