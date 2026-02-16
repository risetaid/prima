const env = process.env as Record<string, string | undefined>;
env.NODE_ENV ??= "test";
