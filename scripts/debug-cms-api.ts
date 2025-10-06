/**
 * Debug script to test actual CMS API calls
 */

async function testAPIEndpoint(url: string, description: string) {
  console.log(`\n🔍 Testing: ${description}`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(`http://localhost:3000${url}`, {
      headers: {
        'Cookie': process.env.TEST_COOKIE || ''
      }
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   Success: ${data.success}`);
      console.log(`   Data length: ${data.data?.length || 0}`);
      console.log(`   Statistics:`, data.statistics ? 'Present' : 'Missing');
      
      if (data.data && data.data.length > 0) {
        console.log(`   Content items:`);
        data.data.forEach((item: any, index: number) => {
          console.log(`      ${index + 1}. ${item.title} (${item.type}, ${item.status})`);
        });
      }
      
      return data;
    } else {
      const error = await response.text();
      console.log(`   ❌ Error:`, error);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Exception:`, error);
    return null;
  }
}

async function debugCMSAPI() {
  console.log('🔍 CMS API Debug Tool\n');
  console.log('Testing API endpoints without authentication...\n');
  console.log('Note: This will fail if server requires auth.');
  console.log('For authenticated tests, run in browser console instead.\n');
  
  // Test 1: Statistics only
  await testAPIEndpoint(
    '/api/cms/content?type=all&limit=0&stats_only=true',
    'Statistics Request (stats_only=true, limit=0)'
  );
  
  // Test 2: Content request (what frontend actually calls)
  await testAPIEndpoint(
    '/api/cms/content?type=all',
    'Content Request (type=all, default limit)'
  );
  
  // Test 3: Articles only
  await testAPIEndpoint(
    '/api/cms/content?type=articles',
    'Articles Request'
  );
  
  // Test 4: Videos only
  await testAPIEndpoint(
    '/api/cms/content?type=videos',
    'Videos Request'
  );
  
  console.log('\n\n✨ Debug Tips:');
  console.log('1. If you see 401 errors, the API requires authentication');
  console.log('2. Open browser DevTools > Network tab while on /cms page');
  console.log('3. Look for /api/cms/content requests');
  console.log('4. Check their responses to see actual data returned');
  console.log('\n📝 Browser Console Test:');
  console.log('   Copy-paste this in browser console while on /cms page:');
  console.log('');
  console.log('   fetch("/api/cms/content?type=all").then(r => r.json()).then(console.log)');
  console.log('');
}

debugCMSAPI();
