import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

// Database credentials
const sql = postgres({
  host: 'switchyard.proxy.rlwy.net',
  port: 23431,
  username: 'postgres',
  password: 'eVBMjcVNugdOgeXoMdCMoaQxTDalGkoN',
  database: 'railway',
  ssl: 'require'
});

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_image_url: string | null;
  category: string;
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
  status: string;
  published_at: Date | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

interface Video {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_minutes: string | null;
  category: string;
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
  status: string;
  published_at: Date | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

interface DumpResult {
  timestamp: string;
  articles: {
    total: number;
    published: number;
    draft: number;
    archived: number;
    deleted: number;
    data: Article[];
  };
  videos: {
    total: number;
    published: number;
    draft: number;
    archived: number;
    deleted: number;
    data: Video[];
  };
}

async function dumpCMSContent() {
  try {
    console.log('🔌 Connecting to database...');
    console.log('✅ Connected successfully!\n');

    // Query articles
    console.log('📰 Fetching articles...');
    const articles = await sql<Article[]>`
      SELECT
        id,
        title,
        slug,
        content,
        excerpt,
        featured_image_url,
        category,
        tags,
        seo_title,
        seo_description,
        status,
        published_at,
        created_by,
        created_at,
        updated_at,
        deleted_at
      FROM cms_articles
      ORDER BY created_at DESC
    `;
    const articlesPublished = articles.filter(a => a.status === 'PUBLISHED' && !a.deleted_at).length;
    const articlesDraft = articles.filter(a => a.status === 'DRAFT' && !a.deleted_at).length;
    const articlesArchived = articles.filter(a => a.status === 'ARCHIVED' && !a.deleted_at).length;
    const articlesDeleted = articles.filter(a => a.deleted_at !== null).length;

    console.log(`  Total: ${articles.length}`);
    console.log(`  Published: ${articlesPublished}`);
    console.log(`  Draft: ${articlesDraft}`);
    console.log(`  Archived: ${articlesArchived}`);
    console.log(`  Deleted: ${articlesDeleted}\n`);

    // Query videos
    console.log('🎥 Fetching videos...');
    const videos = await sql<Video[]>`
      SELECT
        id,
        title,
        slug,
        description,
        video_url,
        thumbnail_url,
        duration_minutes,
        category,
        tags,
        seo_title,
        seo_description,
        status,
        published_at,
        created_by,
        created_at,
        updated_at,
        deleted_at
      FROM cms_videos
      ORDER BY created_at DESC
    `;
    const videosPublished = videos.filter(v => v.status === 'PUBLISHED' && !v.deleted_at).length;
    const videosDraft = videos.filter(v => v.status === 'DRAFT' && !v.deleted_at).length;
    const videosArchived = videos.filter(v => v.status === 'ARCHIVED' && !v.deleted_at).length;
    const videosDeleted = videos.filter(v => v.deleted_at !== null).length;

    console.log(`  Total: ${videos.length}`);
    console.log(`  Published: ${videosPublished}`);
    console.log(`  Draft: ${videosDraft}`);
    console.log(`  Archived: ${videosArchived}`);
    console.log(`  Deleted: ${videosDeleted}\n`);

    // Create dump object
    const dump: DumpResult = {
      timestamp: new Date().toISOString(),
      articles: {
        total: articles.length,
        published: articlesPublished,
        draft: articlesDraft,
        archived: articlesArchived,
        deleted: articlesDeleted,
        data: articles
      },
      videos: {
        total: videos.length,
        published: videosPublished,
        draft: videosDraft,
        archived: videosArchived,
        deleted: videosDeleted,
        data: videos
      }
    };

    // Write to file
    const outputDir = path.join(process.cwd(), 'scripts', 'dumps');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `cms-content-dump-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(dump, null, 2));

    console.log(`✅ Dump saved to: ${filepath}\n`);

    // Print summary
    console.log('📊 SUMMARY:');
    console.log('='.repeat(60));
    console.log('Articles:');
    articles.forEach((article, index) => {
      const statusIcon = article.status === 'PUBLISHED' ? '✅' : article.status === 'DRAFT' ? '📝' : '📦';
      const deletedIcon = article.deleted_at ? '🗑️' : '';
      console.log(`  ${index + 1}. ${statusIcon}${deletedIcon} ${article.title}`);
      console.log(`     Status: ${article.status} | Slug: ${article.slug}`);
      console.log(`     Published At: ${article.published_at || 'Not published'}`);
      console.log(`     Deleted At: ${article.deleted_at || 'Not deleted'}`);
      console.log('');
    });

    console.log('\nVideos:');
    videos.forEach((video, index) => {
      const statusIcon = video.status === 'PUBLISHED' ? '✅' : video.status === 'DRAFT' ? '📝' : '📦';
      const deletedIcon = video.deleted_at ? '🗑️' : '';
      console.log(`  ${index + 1}. ${statusIcon}${deletedIcon} ${video.title}`);
      console.log(`     Status: ${video.status} | Slug: ${video.slug}`);
      console.log(`     Published At: ${video.published_at || 'Not published'}`);
      console.log(`     Deleted At: ${video.deleted_at || 'Not deleted'}`);
      console.log('');
    });

    console.log('='.repeat(60));
    console.log(`\n💾 Full dump saved to: ${filepath}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await sql.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the dump
dumpCMSContent().catch(console.error);
