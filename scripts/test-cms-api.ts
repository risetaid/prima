/**
 * Test CMS API endpoints to debug why content is not showing
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  success: boolean;
  status: number;
  data?: any;
  error?: string;
}

async function testEndpoint(endpoint: string, description: string): Promise<TestResult> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing: ${description}`);
  console.log(`Endpoint: ${endpoint}`);
  console.log('='.repeat(70));

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    const data = await response.json();

    console.log(`Status: ${response.status} ${response.ok ? '✅' : '❌'}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    return {
      endpoint,
      success: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${errorMessage} ❌`);

    return {
      endpoint,
      success: false,
      status: 0,
      error: errorMessage
    };
  }
}

async function runTests() {
  console.log('\n🧪 TESTING CMS API ENDPOINTS');
  console.log(`Base URL: ${BASE_URL}\n`);

  const tests: Array<[string, string]> = [
    // Public endpoints (what frontend uses)
    ['/api/cms/content?type=articles&public=true&limit=20', 'Public Articles (used by /berita)'],
    ['/api/cms/content?type=videos&public=true&limit=20', 'Public Videos (used by /video-edukasi)'],
    ['/api/cms/content?type=all&public=true', 'Public All Content (used by ContentSelector)'],

    // Admin endpoints
    ['/api/cms/content?type=all', 'Admin All Content (used by /cms page)'],
    ['/api/cms/content?type=articles', 'Admin Articles'],
    ['/api/cms/content?type=videos', 'Admin Videos'],

    // Enhanced endpoint
    ['/api/cms/content?enhanced=true&public=true', 'Enhanced Content with Templates'],

    // Legacy endpoints
    ['/api/cms/articles', 'Legacy Articles Endpoint'],
    ['/api/cms/videos', 'Legacy Videos Endpoint'],
  ];

  const results: TestResult[] = [];

  for (const [endpoint, description] of tests) {
    const result = await testEndpoint(endpoint, description);
    results.push(result);

    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌\n`);

  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} [${result.status}] ${result.endpoint}`);

    if (result.data) {
      const itemCount = result.data.data?.length || 0;
      const hasStatistics = !!result.data.statistics;
      const hasPagination = !!result.data.pagination;

      console.log(`   Items: ${itemCount} | Stats: ${hasStatistics} | Pagination: ${hasPagination}`);

      if (result.data.success === false) {
        console.log(`   ⚠️  API Error: ${result.data.error}`);
      }
    }

    if (result.error) {
      console.log(`   ⚠️  Error: ${result.error}`);
    }
  });

  console.log('\n' + '='.repeat(70));

  // Check for specific issues
  console.log('\n🔍 DIAGNOSTIC CHECKS:');
  console.log('='.repeat(70));

  const publicArticles = results.find(r => r.endpoint.includes('type=articles&public=true'));
  if (publicArticles?.data?.data?.length === 0) {
    console.log('❌ PUBLIC ARTICLES ENDPOINT RETURNS EMPTY ARRAY');
    console.log('   This is why /berita page shows no content!');
    console.log('   Possible causes:');
    console.log('   1. API filtering logic issue');
    console.log('   2. Authentication/permission problem');
    console.log('   3. Query WHERE clause excluding all results');
  } else if (publicArticles?.data?.data?.length > 0) {
    console.log(`✅ Public articles endpoint returns ${publicArticles.data.data.length} items`);
  }

  const publicVideos = results.find(r => r.endpoint.includes('type=videos&public=true'));
  if (publicVideos?.data?.data?.length === 0) {
    console.log('✅ Public videos endpoint correctly returns 0 (no videos in DB)');
  }

  const adminContent = results.find(r => r.endpoint === '/api/cms/content?type=all');
  if (adminContent?.data?.data?.length === 0) {
    console.log('❌ ADMIN ENDPOINT ALSO RETURNS EMPTY');
    console.log('   This means the API query itself has issues!');
  } else if (adminContent?.data?.data?.length > 0) {
    console.log(`✅ Admin endpoint returns ${adminContent.data.data.length} items`);
  }

  console.log('\n' + '='.repeat(70));
}

// Run tests
runTests().catch(console.error);
