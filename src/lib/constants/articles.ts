export const ARTICLE_CATEGORIES = [
  { value: "general", label: "Umum" },
  { value: "nutrisi", label: "Nutrisi" },
  { value: "olahraga", label: "Olahraga" },
  { value: "motivational", label: "Motivasi" },
  { value: "medical", label: "Medis" },
  { value: "faq", label: "FAQ" },
  { value: "testimoni", label: "Testimoni" },
] as const;

export type ArticleCategory = typeof ARTICLE_CATEGORIES[number]["value"];
export type ArticleStatus = "draft" | "published" | "archived";