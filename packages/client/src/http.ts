import type { z } from "zod";
import { PROJECT_ID_HEADER } from "@ssota/contracts";
import { throwIfNotOk } from "./error.js";

export type FetchLike = typeof fetch;

export interface HttpClientOptions {
  baseUrl: string;
  getAccessToken: () => string | Promise<string>;
  getSubjectId?: () => string | undefined | Promise<string | undefined>;
  getProjectId?: () => string | undefined | Promise<string | undefined>;
  fetch?: FetchLike;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly getAccessToken: () => string | Promise<string>;
  private readonly getSubjectId?: () => string | undefined | Promise<string | undefined>;
  private readonly getProjectId?: () => string | undefined | Promise<string | undefined>;
  private readonly fetchImpl: FetchLike;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.getAccessToken = options.getAccessToken;
    this.getSubjectId = options.getSubjectId;
    this.getProjectId = options.getProjectId;
    this.fetchImpl = options.fetch ?? fetch;
  }

  async get<T extends z.ZodType>(
    path: string,
    schema: T,
    searchParams?: Record<string, string | number | string[] | undefined>,
  ): Promise<z.infer<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (searchParams) {
      for (const [key, value] of Object.entries(searchParams)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          url.searchParams.set(key, value.join(","));
        } else {
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
    const subjectId = this.getSubjectId ? await this.getSubjectId() : undefined;
    const projectId = this.getProjectId ? await this.getProjectId() : undefined;
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    if (subjectId) {
      headers["X-SSOTA-Subject-Id"] = subjectId;
    }
    if (projectId) {
      headers[PROJECT_ID_HEADER] = projectId;
    }

    const response = await this.fetchImpl(String(url), {
      ...init,
      headers,
    });

    await throwIfNotOk(response);
    const json: unknown = await response.json();
    return schema.parse(json);
  }
}
