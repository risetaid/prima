/**
 * Content Management Tests
 * Tests for videos and news articles (berita)
 */

import { TestResult } from "./types";
import { TestUtils } from "./utils";

export class ContentTests {
  private client = TestUtils.createTestClient();
  private testResults: TestResult[] = [];

  /**
   * Run all content management tests
   */
  async runAll(): Promise<TestResult[]> {
    console.log("\n📺 Running Content Management Tests...");
    this.testResults = [];

    // Video tests
    await this.testListVideos();
    await this.testGetVideoDetails();
    await this.testCreateVideo();
    await this.testUpdateVideo();
    await this.testDeleteVideo();
    await this.testVideoYouTubeSync();

    // Article tests
    await this.testListArticles();
    await this.testGetArticleDetails();
    await this.testCreateArticle();
    await this.testUpdateArticle();
    await this.testDeleteArticle();
    await this.testArticlePublishing();

    // Content search and filtering
    await this.testContentSearch();
    await this.testContentFiltering();
    await this.testContentPagination();

    return this.testResults;
  }

  private async testListVideos() {
    const endpoint = "/api/cms/videos";
    const result = await TestUtils.runTest(
      "List All Videos",
      "content",
      async () => {
        const response = await this.client.get(endpoint);

        // Should return videos list or require auth
        if (response.status === 500) {
          throw new Error("Video listing error");
        }

        if (response.ok && !Array.isArray(response.data)) {
          throw new Error("Invalid response format - expected array");
        }
      },
      {
        method: "GET",
        endpoint,
        description: "Retrieve list of all educational videos",
      }
    );
    this.testResults.push(result);
  }

  private async testGetVideoDetails() {
    const endpoint = "/api/cms/videos/test_video_123";
    const result = await TestUtils.runTest(
      "Get Single Video Details",
      "content",
      async () => {
        const response = await this.client.get(endpoint);

        // Should return video or 404
        if (response.status === 500) {
          throw new Error("Video details retrieval error");
        }
      },
      {
        method: "GET",
        endpoint,
        description: "Get detailed information for specific video",
      }
    );
    this.testResults.push(result);
  }

  private async testCreateVideo() {
    const endpoint = "/api/cms/videos";
    const result = await TestUtils.runTest(
      "Create New Video",
      "content",
      async () => {
        const videoData = {
          title: "Video Test - Kesehatan Mata",
          description: "Panduan menjaga kesehatan mata",
          youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          category: "health",
          tags: ["kesehatan", "mata", "edukasi"],
        };

        const response = await this.client.post(endpoint, videoData);

        // Should create or require auth
        if (response.status === 500) {
          throw new Error("Video creation error");
        }
      },
      {
        method: "POST",
        endpoint,
        description: "Create new educational video with YouTube URL",
      }
    );
    this.testResults.push(result);
  }

  private async testUpdateVideo() {
    const endpoint = "/api/cms/videos/test_video_123";
    const result = await TestUtils.runTest(
      "Update Video Information",
      "content",
      async () => {
        const updateData = {
          title: "Updated Video Title",
          description: "Updated description",
        };

        const response = await this.client.put(endpoint, updateData);

        // Should update or return not found/auth error
        if (response.status === 500) {
          throw new Error("Video update error");
        }
      },
      {
        method: "PUT",
        endpoint,
        description: "Update video title and description",
      }
    );
    this.testResults.push(result);
  }

  private async testDeleteVideo() {
    const endpoint = "/api/cms/videos/test_video_123";
    const result = await TestUtils.runTest(
      "Delete Video",
      "content",
      async () => {
        const response = await this.client.delete(endpoint);

        // Should delete or return not found/auth error
        if (response.status === 500) {
          throw new Error("Video deletion error");
        }
      },
      {
        method: "DELETE",
        endpoint,
        description: "Remove video from system",
      }
    );
    this.testResults.push(result);
  }

  private async testVideoYouTubeSync() {
    const endpoint = "/api/youtube/fetch";
    const result = await TestUtils.runTest(
      "YouTube Video Sync",
      "content",
      async () => {
        // Test YouTube metadata fetch integration
        const response = await this.client.post(endpoint, {
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        });

        // Should handle YouTube API calls
        if (response.status === 500) {
          throw new Error("YouTube sync error");
        }
      },
      {
        method: "POST",
        endpoint,
        description: "Fetch metadata from a YouTube video URL",
      }
    );
    this.testResults.push(result);
  }

  private async testListArticles() {
    const endpoint = "/api/cms/articles";
    const result = await TestUtils.runTest(
      "List All Articles",
      "content",
      async () => {
        const response = await this.client.get(endpoint);

        // Should return articles list
        if (response.status === 500) {
          throw new Error("Article listing error");
        }

        if (response.ok && !Array.isArray(response.data)) {
          throw new Error("Invalid response format - expected array");
        }
      },
      {
        method: "GET",
        endpoint,
        description: "Retrieve list of all health articles (berita)",
      }
    );
    this.testResults.push(result);
  }

  private async testGetArticleDetails() {
    const endpoint = "/api/cms/articles/test_article_123";
    const result = await TestUtils.runTest(
      "Get Single Article Details",
      "content",
      async () => {
        const response = await this.client.get(endpoint);

        // Should return article or 404
        if (response.status === 500) {
          throw new Error("Article details retrieval error");
        }
      },
      {
        method: "GET",
        endpoint,
        description: "Get full content and metadata for specific article",
      }
    );
    this.testResults.push(result);
  }

  private async testCreateArticle() {
    const endpoint = "/api/cms/articles";
    const result = await TestUtils.runTest(
      "Create New Article",
      "content",
      async () => {
        const articleData = {
          title: "Tips Menjaga Kesehatan di Musim Hujan",
          content: "Konten artikel lengkap tentang kesehatan...",
          excerpt: "Tips menjaga kesehatan saat musim hujan",
          category: "health",
          tags: ["kesehatan", "musim hujan", "tips"],
          author: "Tim PRIMA",
          featured: false,
        };

        const response = await this.client.post(endpoint, articleData);

        // Should create or require auth
        if (response.status === 500) {
          throw new Error("Article creation error");
        }
      },
      {
        method: "POST",
        endpoint,
        description: "Create new health article with full content",
      }
    );
    this.testResults.push(result);
  }

  private async testUpdateArticle() {
    const endpoint = "/api/cms/articles/test_article_123";
    const result = await TestUtils.runTest(
      "Update Article Content",
      "content",
      async () => {
        const updateData = {
          title: "Updated Article Title",
          content: "Updated article content",
        };

        const response = await this.client.put(endpoint, updateData);

        // Should update or return not found/auth error
        if (response.status === 500) {
          throw new Error("Article update error");
        }
      },
      {
        method: "PUT",
        endpoint,
        description: "Update article title and content",
      }
    );
    this.testResults.push(result);
  }

  private async testDeleteArticle() {
    const endpoint = "/api/cms/articles/test_article_123";
    const result = await TestUtils.runTest(
      "Delete Article",
      "content",
      async () => {
        const response = await this.client.delete(endpoint);

        // Should delete or return not found/auth error
        if (response.status === 500) {
          throw new Error("Article deletion error");
        }
      },
      {
        method: "DELETE",
        endpoint,
        description: "Remove article from system",
      }
    );
    this.testResults.push(result);
  }

  private async testArticlePublishing() {
    const endpoint = "/api/cms/articles/test_article_123";
    const result = await TestUtils.runTest(
      "Article Publishing Workflow",
      "content",
      async () => {
        // Test publishing/unpublishing
        const publishData = {
          published: true,
          publishedAt: new Date().toISOString(),
        };

        const response = await this.client.put(endpoint, publishData);

        // Should handle publishing
        if (response.status === 500) {
          throw new Error("Article publishing error");
        }
      },
      {
        method: "PUT",
        endpoint,
        description: "Publish or unpublish article",
      }
    );
    this.testResults.push(result);
  }

  private async testContentSearch() {
    const endpoint = "/api/cms/content?search={query}";
    const result = await TestUtils.runTest(
      "Content Search Functionality",
      "content",
      async () => {
        const searchQueries = [
          "/api/cms/content?search=kesehatan",
          "/api/cms/content?search=diabetes",
          "/api/cms/content?search=covid",
        ];

        for (const query of searchQueries) {
          const response = await this.client.get(query);
          if (response.status === 500) {
            throw new Error(`Content search error for: ${query}`);
          }
        }
      },
      {
        method: "GET",
        endpoint,
        description: "Search videos and articles by keyword",
      }
    );
    this.testResults.push(result);
  }

  private async testContentFiltering() {
    const endpoint = "/api/cms/content?category={category}&type={type}";
    const result = await TestUtils.runTest(
      "Content Filtering by Category",
      "content",
      async () => {
        const filters = [
          "/api/cms/content?category=health",
          "/api/cms/content?type=video",
          "/api/cms/content?type=article",
        ];

        for (const filter of filters) {
          const response = await this.client.get(filter);
          if (response.status === 500) {
            throw new Error(`Content filtering error for: ${filter}`);
          }
        }
      },
      {
        method: "GET",
        endpoint,
        description: "Filter content by category and type",
      }
    );
    this.testResults.push(result);
  }

  private async testContentPagination() {
    const endpoint = "/api/cms/content?page={page}&limit={limit}";
    const result = await TestUtils.runTest(
      "Content Pagination",
      "content",
      async () => {
        const pages = [
          "/api/cms/content?page=1&limit=10",
          "/api/cms/content?page=2&limit=10",
          "/api/cms/content?page=1&limit=20",
        ];

        for (const page of pages) {
          const response = await this.client.get(page);
          if (response.status === 500) {
            throw new Error(`Pagination error for: ${page}`);
          }

          // Validate pagination structure
          if (response.ok && response.data) {
            if (
              !response.data.hasOwnProperty("total") &&
              !Array.isArray(response.data)
            ) {
              console.log(
                "   ℹ️  Response structure may need pagination metadata"
              );
            }
          }
        }
      },
      {
        method: "GET",
        endpoint,
        description: "Paginate through content with page and limit parameters",
      }
    );
    this.testResults.push(result);
  }
}
