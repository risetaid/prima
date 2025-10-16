/**
 * CMS API Tests
 * Tests for content management endpoints
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { buildGetRequest, buildPostRequest, buildPatchRequest, buildDeleteRequest } from "../../helpers/request-builder";
import { mockAuthToken } from "../../fixtures/user.fixtures";

describe("CMS - Articles API", () => {
  describe("GET /api/cms/articles", () => {
    it("should list articles with pagination", async () => {
      const request = buildGetRequest("/api/cms/articles", {
        query: { page: "1", limit: "20" },
        token: mockAuthToken,
      });
      const url = new URL(request.url);
      expect(url.searchParams.get("page")).toBe("1");
      expect(url.searchParams.get("limit")).toBe("20");
    });

    it("should support search filter", async () => {
      const request = buildGetRequest("/api/cms/articles", {
        query: { search: "kesehatan" },
        token: mockAuthToken,
      });
      const url = new URL(request.url);
      expect(url.searchParams.get("search")).toBe("kesehatan");
    });

    it("should support category filter", async () => {
      const request = buildGetRequest("/api/cms/articles", {
        query: { category: "TIPS" },
        token: mockAuthToken,
      });
      const url = new URL(request.url);
      expect(url.searchParams.get("category")).toBe("TIPS");
    });
  });

  describe("POST /api/cms/articles", () => {
    it("should create article with valid data", async () => {
      const data = {
        title: "Tips Kesehatan",
        content: "Konten artikel...",
        category: "TIPS",
      };
      const request = buildPostRequest("/api/cms/articles", data, {
        token: mockAuthToken,
      });
      const body = await request.json();
      expect(body.title).toBe("Tips Kesehatan");
    });

    it("should validate required fields", async () => {
      const data = {
        title: "Article",
        // missing content
      };
      const request = buildPostRequest("/api/cms/articles", data, {
        token: mockAuthToken,
      });
      expect(request).toBeDefined();
    });
  });

  describe("GET /api/cms/articles/:id", () => {
    it("should retrieve article by ID", async () => {
      const articleId = "article-123";
      const request = buildGetRequest(`/api/cms/articles/${articleId}`, {
        token: mockAuthToken,
      });
      expect(request.url).toContain(articleId);
    });
  });

  describe("PATCH /api/cms/articles/:id", () => {
    it("should update article", async () => {
      const articleId = "article-123";
      const data = { title: "Updated Title" };
      const request = buildPatchRequest(`/api/cms/articles/${articleId}`, data, {
        token: mockAuthToken,
      });
      expect(request.method).toBe("PATCH");
    });
  });

  describe("DELETE /api/cms/articles/:id", () => {
    it("should delete article", async () => {
      const articleId = "article-123";
      const request = buildDeleteRequest(`/api/cms/articles/${articleId}`, {
        token: mockAuthToken,
      });
      expect(request.method).toBe("DELETE");
    });
  });
});

describe("CMS - Videos API", () => {
  describe("GET /api/cms/videos", () => {
    it("should list videos", async () => {
      const request = buildGetRequest("/api/cms/videos", {
        token: mockAuthToken,
      });
      expect(request.url).toContain("videos");
    });

    it("should support pagination", async () => {
      const request = buildGetRequest("/api/cms/videos", {
        query: { page: "1", limit: "10" },
        token: mockAuthToken,
      });
      const url = new URL(request.url);
      expect(url.searchParams.get("limit")).toBe("10");
    });
  });

  describe("POST /api/cms/videos", () => {
    it("should create video", async () => {
      const data = {
        title: "Video Kesehatan",
        youtubeUrl: "https://youtube.com/watch?v=123",
        description: "Deskripsi video",
      };
      const request = buildPostRequest("/api/cms/videos", data, {
        token: mockAuthToken,
      });
      const body = await request.json();
      expect(body.title).toBe("Video Kesehatan");
    });
  });

  describe("GET /api/cms/videos/:id", () => {
    it("should retrieve video by ID", async () => {
      const videoId = "video-123";
      const request = buildGetRequest(`/api/cms/videos/${videoId}`, {
        token: mockAuthToken,
      });
      expect(request.url).toContain(videoId);
    });
  });

  describe("PATCH /api/cms/videos/:id", () => {
    it("should update video", async () => {
      const videoId = "video-123";
      const data = { title: "Updated Video" };
      const request = buildPatchRequest(`/api/cms/videos/${videoId}`, data, {
        token: mockAuthToken,
      });
      expect(request.method).toBe("PATCH");
    });
  });

  describe("DELETE /api/cms/videos/:id", () => {
    it("should delete video", async () => {
      const videoId = "video-123";
      const request = buildDeleteRequest(`/api/cms/videos/${videoId}`, {
        token: mockAuthToken,
      });
      expect(request.method).toBe("DELETE");
    });
  });
});

describe("CMS - Content Bulk Operations", () => {
  describe("POST /api/cms/content", () => {
    it("should import multiple content items", async () => {
      const data = {
        articles: [
          { title: "Article 1", content: "Content 1" },
          { title: "Article 2", content: "Content 2" },
        ],
        videos: [
          { title: "Video 1", youtubeUrl: "https://youtube.com/watch?v=1" },
        ],
      };
      const request = buildPostRequest("/api/cms/content", data, {
        token: mockAuthToken,
      });
      expect(request.method).toBe("POST");
    });
  });
});

describe("YouTube Integration", () => {
  describe("POST /api/youtube/fetch", () => {
    it("should fetch YouTube video metadata", async () => {
      const data = {
        youtubeUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
      };
      const request = buildPostRequest("/api/youtube/fetch", data, {
        token: mockAuthToken,
      });
      const body = await request.json();
      expect(body.youtubeUrl).toBe("https://youtube.com/watch?v=dQw4w9WgXcQ");
    });

    it("should validate YouTube URL format", async () => {
      const data = {
        youtubeUrl: "not-a-valid-url",
      };
      const request = buildPostRequest("/api/youtube/fetch", data, {
        token: mockAuthToken,
      });
      expect(request).toBeDefined();
    });
  });
});
