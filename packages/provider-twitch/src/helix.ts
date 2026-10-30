import type { ChatBadge } from '@chatto/core';
import type { TwitchAuth } from './auth';

const HELIX_BASE = 'https://api.twitch.tv/helix';

export interface HelixUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
}

interface HelixBadgeSet {
  set_id: string;
  versions: {
    id: string;
    title: string;
    image_url_1x: string;
    image_url_2x: string;
    image_url_4x: string;
  }[];
}

export class HelixError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'HelixError';
  }
}

/** Thin Helix client. Retries once with a refreshed token on 401. */
export class HelixClient {
  constructor(private readonly auth: TwitchAuth) {}

  async request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
    const token = await this.auth.getAccessToken();
    const response = await fetch(`${HELIX_BASE}${path}`, {
      ...init,
      headers: {
        'Client-Id': this.auth.clientId,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
    if (response.status === 401 && !retried) {
      await this.auth.refresh();
      return this.request<T>(path, init, true);
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      throw new HelixError(body.message ?? `Helix ${path} failed`, response.status);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  async getUserByLogin(login: string): Promise<HelixUser | null> {
    const { data } = await this.request<{ data: HelixUser[] }>(`/users?login=${encodeURIComponent(login)}`);
    return data[0] ?? null;
  }

  async getUsersById(ids: string[]): Promise<HelixUser[]> {
    if (ids.length === 0) return [];
    const query = ids
      .slice(0, 100)
      .map((id) => `id=${encodeURIComponent(id)}`)
      .join('&');
    const { data } = await this.request<{ data: HelixUser[] }>(`/users?${query}`);
    return data;
  }

  /** Global + channel badges merged into one lookup keyed by `set_id/version`. */
  async getBadges(broadcasterId: string): Promise<Map<string, ChatBadge>> {
    const [global, channel] = await Promise.all([
      this.request<{ data: HelixBadgeSet[] }>('/chat/badges/global'),
      this.request<{ data: HelixBadgeSet[] }>(`/chat/badges?broadcaster_id=${encodeURIComponent(broadcasterId)}`),
    ]);
    const map = new Map<string, ChatBadge>();
    // Channel badges come last so they override global ones (custom sub badges).
    for (const set of [...global.data, ...channel.data]) {
      for (const version of set.versions) {
        map.set(`${set.set_id}/${version.id}`, {
          id: `${set.set_id}/${version.id}`,
          setId: set.set_id,
          title: version.title,
          image: { x1: version.image_url_1x, x2: version.image_url_2x, x4: version.image_url_4x },
        });
      }
    }
    return map;
  }

  async createEventSubSubscription(
    type: string,
    version: string,
    condition: Record<string, string>,
    sessionId: string,
  ): Promise<void> {
    await this.request('/eventsub/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ type, version, condition, transport: { method: 'websocket', session_id: sessionId } }),
    });
  }
}
