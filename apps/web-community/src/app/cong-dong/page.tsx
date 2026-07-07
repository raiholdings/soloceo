"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, API_URL, getToken } from "@/lib/api";
import { Button, Card, CardContent } from "@soloceo/ui";

interface Publisher {
  user_id?: string;
  username: string;
  name: string;
  avatar: string;
}
interface FeedPost {
  post_id: string;
  postText: string;
  post_time: string;
  post_likes: number | string;
  post_comments: number | string;
  is_liked?: boolean;
  publisher: Publisher;
}
interface Comment {
  id?: string;
  comment_id?: string;
  text: string;
  publisher: Publisher;
  time?: string;
}

function Avatar({ p, size = 40 }: { p: Publisher; size?: number }) {
  return p.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={p.avatar}
      alt={p.name}
      style={{ width: size, height: size }}
      className="rounded-full object-cover"
    />
  ) : (
    <span
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-accent/25 font-bold text-accent-soft"
    >
      {(p.name || p.username || "?").charAt(0).toUpperCase()}
    </span>
  );
}

function PostCard({ post }: { post: FeedPost }) {
  const [likes, setLikes] = useState(Number(post.post_likes) || 0);
  const [liked, setLiked] = useState(Boolean(post.is_liked));
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function like() {
    setLiked((v) => !v);
    setLikes((n) => (liked ? n - 1 : n + 1));
    await api(`/community/posts/${post.post_id}/like`, { method: "POST" }).catch(
      () => {},
    );
  }

  async function loadComments() {
    setShowComments((v) => !v);
    if (comments.length === 0) {
      const r = await api<{ data?: Comment[] }>(
        `/community/posts/${post.post_id}/comments`,
      ).catch(() => ({ data: [] }));
      setComments(r.data ?? []);
    }
  }

  async function sendComment() {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await api(`/community/posts/${post.post_id}/comments`, {
        method: "POST",
        body: JSON.stringify({ text: draft }),
      });
      setDraft("");
      const r = await api<{ data?: Comment[] }>(
        `/community/posts/${post.post_id}/comments`,
      ).catch(() => ({ data: [] }));
      setComments(r.data ?? []);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <Avatar p={post.publisher} />
          <div>
            <p className="text-sm font-semibold">{post.publisher.name}</p>
            <p className="text-[10px] text-[#A0A0B8]">
              @{post.publisher.username} · {post.post_time}
            </p>
          </div>
        </div>
        {post.postText && (
          <p className="whitespace-pre-wrap text-sm">{post.postText}</p>
        )}
        <div className="flex gap-4 border-t border-surface-border pt-2 text-xs text-[#A0A0B8]">
          <button
            onClick={like}
            className={liked ? "text-accent-soft" : "hover:text-accent-soft"}
          >
            ♥ {likes}
          </button>
          <button onClick={loadComments} className="hover:text-white">
            💬 {Number(post.post_comments) || comments.length} bình luận
          </button>
        </div>
        {showComments && (
          <div className="flex flex-col gap-2 border-t border-surface-border pt-2">
            {comments.map((c, i) => (
              <div key={c.id ?? c.comment_id ?? i} className="flex gap-2">
                <Avatar p={c.publisher} size={28} />
                <div className="rounded-xl bg-surface px-3 py-1.5">
                  <p className="text-xs font-semibold">{c.publisher?.name}</p>
                  <p className="text-xs">{c.text}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendComment()}
                placeholder="Viết bình luận..."
                className="h-9 flex-1 rounded-lg border border-surface-border bg-transparent px-3 text-xs outline-none focus:border-accent"
              />
              <Button size="sm" disabled={busy} onClick={sendComment}>
                Gửi
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CommunityFeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const r = await api<{ data?: FeedPost[] }>("/community/feed");
      setPosts(r.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được feed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const isIn = Boolean(getToken());
    setLoggedIn(isIn);
    if (isIn) reload();
    else setLoading(false);
  }, [reload]);

  async function submit() {
    if (!content.trim()) return;
    setPosting(true);
    try {
      await api("/community/posts", {
        method: "POST",
        body: JSON.stringify({ text: content }),
      });
      setContent("");
      await reload();
    } finally {
      setPosting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-bold">Cộng đồng Solo CEO</h1>
      <p className="mb-6 text-sm text-[#A0A0B8]">
        Kết nối trực tiếp với cộng đồng — đăng bài, bình luận ngay tại đây.
      </p>

      {loggedIn ? (
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-2 p-4">
            <textarea
              rows={3}
              placeholder="Chia sẻ điều gì đó với cộng đồng..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="rounded-xl border border-surface-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <Button
              size="sm"
              className="self-end"
              disabled={posting || !content.trim()}
              onClick={submit}
            >
              {posting ? "Đang đăng..." : "Đăng bài"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="text-sm text-[#A0A0B8]">
              Đăng nhập để đọc và tham gia cộng đồng.
            </p>
            <a href={`${API_URL}/v1/auth/wowonder/login?return_url=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin + "/cong-dong" : "https://soloceo.vn/cong-dong")}`}>
              <Button size="sm">👥 Đăng nhập bằng SoloCEO Community</Button>
            </a>
          </CardContent>
        </Card>
      )}

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="py-8 text-center text-sm text-[#A0A0B8]">Đang tải...</p>
      ) : posts.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#A0A0B8]">
          {loggedIn
            ? "Chưa có bài viết nào — hãy là người đầu tiên!"
            : "Đăng nhập để xem bài viết cộng đồng."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((p) => (
            <PostCard key={p.post_id} post={p} />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-[#A0A0B8]">
        Muốn trải nghiệm đầy đủ mạng xã hội?{" "}
        <Link
          href="https://my.soloceo.vn"
          className="text-accent-soft hover:underline"
        >
          Mở my.soloceo.vn ↗
        </Link>
      </p>
    </main>
  );
}
