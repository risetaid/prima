/**
 * Test Request Builder
 * Creates request objects for testing API routes
 */

export interface RequestOptions {
  method?: string;
  body?: Record<string, unknown> | null;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  query?: Record<string, string>;
  token?: string;
}

// Simple mock request class for testing
class MockRequest {
  method: string;
  url: string;
  headers: Map<string, string>;
  body?: string;

  constructor(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    } = {}
  ) {
    this.url = url;
    this.method = options.method || "GET";
    this.headers = new Map(Object.entries(options.headers || {}));
    this.body = options.body;
  }

  get(key: string) {
    return this.headers.get(key.toLowerCase());
  }

  set(key: string, value: string) {
    this.headers.set(key.toLowerCase(), value);
  }

  async json() {
    if (this.body) {
      return JSON.parse(this.body);
    }
    return {};
  }

  clone() {
    return new MockRequest(this.url, {
      method: this.method,
      headers: Object.fromEntries(this.headers),
      body: this.body,
    });
  }
}

// Headers wrapper for compatibility
class HeadersWrapper {
  private map: Map<string, string>;

  constructor(obj?: Record<string, string>) {
    this.map = new Map(Object.entries(obj || {}));
  }

  get(key: string): string | null {
    return this.map.get(key.toLowerCase()) || null;
  }

  set(key: string, value: string) {
    this.map.set(key.toLowerCase(), value);
  }
}

/**
 * Build a test HTTP request
 */
export function buildRequest(path: string, options: RequestOptions = {}): any {
  const {
    method = "GET",
    body = null,
    headers = {},
    query = {},
    token,
  } = options;

  // Build URL with query parameters
  let url = `http://localhost:3000${path}`;
  if (Object.keys(query).length > 0) {
    const searchParams = new URLSearchParams(query);
    url += `?${searchParams.toString()}`;
  }

  // Setup headers
  const headerObj: Record<string, string> = {
    "content-type": "application/json",
    ...headers,
  };

  if (token) {
    headerObj["authorization"] = `Bearer ${token}`;
  }

  // Create request
  const request = new MockRequest(url, {
    method,
    headers: headerObj,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Add headers getter for compatibility
  request.headers = new HeadersWrapper(headerObj) as any;

  return request;
}

/**
 * Build GET request
 */
export function buildGetRequest(path: string, options: Omit<RequestOptions, "body"> = {}): any {
  return buildRequest(path, { ...options, method: "GET" });
}

/**
 * Build POST request with JSON body
 */
export function buildPostRequest(
  path: string,
  body: Record<string, unknown>,
  options: Omit<RequestOptions, "body" | "method"> = {}
): any {
  return buildRequest(path, { ...options, method: "POST", body });
}

/**
 * Build PATCH request
 */
export function buildPatchRequest(
  path: string,
  body: Record<string, unknown>,
  options: Omit<RequestOptions, "body" | "method"> = {}
): any {
  return buildRequest(path, { ...options, method: "PATCH", body });
}

/**
 * Build DELETE request
 */
export function buildDeleteRequest(
  path: string,
  options: Omit<RequestOptions, "body"> = {}
): any {
  return buildRequest(path, { ...options, method: "DELETE" });
}

/**
 * Build webhook request with secret token
 */
export function buildWebhookRequest(
  path: string,
  body: Record<string, unknown>,
  webhookSecret?: string
): any {
  return buildPostRequest(path, body, {
    headers: {
      "x-webhook-secret": webhookSecret || process.env.WEBHOOK_SECRET || "test_secret",
    },
  });
}

/**
 * Build authenticated request
 */
export function buildAuthRequest(
  path: string,
  method: string = "GET",
  token: string = "test_token_123",
  body?: Record<string, unknown>
): any {
  return buildRequest(path, {
    method,
    body,
    token,
  });
}

/**
 * Extract response data from NextResponse
 */
export async function getResponseData(response: Response): Promise<unknown> {
  const clone = response.clone();
  return await clone.json().catch(() => clone.text());
}

/**
 * Get response status
 */
export function getResponseStatus(response: Response): number {
  return response.status;
}
