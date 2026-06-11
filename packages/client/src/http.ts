import type { z } from "zod";
import { throwIfNotOk } from "./error.js";

export type FetchLike = typeof fetch;

export interface HttpClientOptions {
  baseUrl: string;
  getAccessToken: () => string | Promise<string>;
  fetch?: FetchLike;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly getAccessToken: () => string | Promise<string>;
  private readonly fetchImpl: FetchLike;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.getAccessToken = options.getAccessToken;
    this.fetchImpl = options.fetch ?? fetch;
  }

  async get<T extends z.ZodType>(
    path: string,
    schema: T,
    searchParams?: Record<string, string | number | undefined>,
  ): Promise<z.infer<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (searchParams) {
      for (const [key, value] of Object.entries(searchParams)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return this.request(url, { method: "GET" }, schema);
  }

  async post<T extends z.ZodType>(
    path: string,
    body: unknown,
    schema: T,
  ): Promise<z.infer<T>> {
    const url = `${this.baseUrl}${path}`;
    return this.request(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      schema,
    );
  }

  private async request<T extends z.ZodType>(
    url: string | URL,
    init: RequestInit,
    schema: T,
  ): Promise<z.infer<T>> {
    const token = await this.getAccessToken();
    const response = await this.fetchImpl(String(url), {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    await throwIfNotOk(response);
    const json: unknown = await response.json();
    const envelope = schema.parse(json);
    return envelope;
  }
}
