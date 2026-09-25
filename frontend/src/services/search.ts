import { apiClient } from "@/api/client";
import { SearchResult } from "@/types";

export const searchService = {
  global: (q: string) => apiClient.get<SearchResult[]>("/api/search", { params: { q } }).then((r) => r.data),
};
