/**
 * LiteLLMClient — quản lý virtual key + usage per-org (CLAUDE.md Phần 8).
 * LITELLM_FAKE=1: giả lập cho dev local (key giả, usage giả trong bộ nhớ).
 */
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "node:crypto";

export interface VirtualKeyInfo {
  key: string;
  maxBudgetUsd: number;
}

export interface SpendLogRow {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  day: string; // YYYY-MM-DD
}

export interface ILiteLLMClient {
  generateKey(orgId: string, maxBudgetUsd: number): Promise<VirtualKeyInfo>;
  getSpendByOrg(orgId: string, sinceIso: string): Promise<SpendLogRow[]>;
}

@Injectable()
export class LiteLLMClient implements ILiteLLMClient {
  private fakeSpend = new Map<string, SpendLogRow[]>();

  constructor(private readonly config: ConfigService) {}

  private get isFake(): boolean {
    return this.config.get("LITELLM_FAKE") === "1";
  }

  private async request<T>(path: string, body?: unknown): Promise<T> {
    const baseUrl = this.config.get<string>("LITELLM_BASE_URL");
    const masterKey = this.config.get<string>("LITELLM_MASTER_KEY");
    const res = await fetch(`${baseUrl}${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${masterKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      throw new Error(`LiteLLM ${path} → ${res.status}`);
    }
    return (await res.json()) as T;
  }

  /** Tạo virtual key gắn metadata.org_id + max_budget theo gói (Phần 8.2) */
  async generateKey(
    orgId: string,
    maxBudgetUsd: number,
  ): Promise<VirtualKeyInfo> {
    if (this.isFake) {
      return {
        key: `sk-fake-${randomBytes(16).toString("hex")}`,
        maxBudgetUsd,
      };
    }
    const r = await this.request<{ key: string }>("/key/generate", {
      metadata: { org_id: orgId },
      max_budget: maxBudgetUsd,
      budget_duration: "30d",
    });
    return { key: r.key, maxBudgetUsd };
  }

  async getSpendByOrg(orgId: string, sinceIso: string): Promise<SpendLogRow[]> {
    if (this.isFake) {
      return (this.fakeSpend.get(orgId) ?? []).filter(
        (r) => r.day >= sinceIso.slice(0, 10),
      );
    }
    const rows = await this.request<
      Array<{
        model: string;
        prompt_tokens: number;
        completion_tokens: number;
        spend: number;
        startTime: string;
      }>
    >(`/spend/logs?start_date=${sinceIso.slice(0, 10)}`);
    return rows.map((r) => ({
      model: r.model,
      inputTokens: r.prompt_tokens,
      outputTokens: r.completion_tokens,
      costUsd: r.spend,
      day: r.startTime.slice(0, 10),
    }));
  }

  /** Dev-only: bơm usage giả để demo dashboard + cảnh báo budget */
  addFakeSpend(orgId: string, row: SpendLogRow) {
    const list = this.fakeSpend.get(orgId) ?? [];
    list.push(row);
    this.fakeSpend.set(orgId, list);
  }
}
