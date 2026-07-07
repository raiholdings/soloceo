"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button, Card, CardContent } from "@soloceo/ui";

interface Post {
  id: string;
  content: string;
  createdAt: string;
  org: { name: string };
  comments: Array<{ id: string; content: string; org: { name: string } }>;
  _count: { likes: number; comments: number };
}

export default function CommunityApp() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    setPosts(await api<Post[]>("/posts"));
  }, []);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  async function createPost() {
    if (!content.trim()) return;
    setBusy(true);
    try {
      await api("/posts", {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      setContent("");
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function like(postId: string) {
    await api(`/posts/${postId}/like`, { method: "POST" });
    await reload();
  }

  async function comment(postId: string) {
    const draft = commentDrafts[postId];
    if (!draft?.trim()) return;
    await api(`/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content: draft }),
    });
    setCommentDrafts((d) => ({ ...d, [postId]: "" }));
    await reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-2 p-4">
          <textarea
            rows={2}
            placeholder="Chia sẻ hành trình Solo CEO của bạn..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="rounded-xl border border-surface-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <Button size="sm" className="self-end" disabled={busy} onClick={createPost}>
            Đăng
          </Button>
        </CardContent>
      </Card>

      {posts.map((post) => (
        <Card key={post.id}>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/25 text-sm font-bold text-accent-soft">
                {post.org.name.charAt(0)}
              </span>
              <div>
                <p className="text-sm font-semibold">{post.org.name}</p>
                <p className="text-[10px] text-[#A0A0B8]">
                  {new Date(post.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm">{post.content}</p>
            <div className="flex items-center gap-4 text-xs text-[#A0A0B8]">
              <button onClick={() => like(post.id)} className="hover:text-accent-soft">
                ♥ {post._count.likes}
              </button>
              <span>💬 {post._count.comments}</span>
            </div>
            {post.comments.length > 0 && (
              <div className="flex flex-col gap-1 border-l-2 border-surface-border pl-3">
                {post.comments.map((c) => (
                  <p key={c.id} className="text-xs">
                    <span className="font-semibold text-accent-soft">
                      {c.org.name}:
                    </span>{" "}
                    {c.content}
                  </p>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                placeholder="Viết bình luận..."
                value={commentDrafts[post.id] ?? ""}
                onChange={(e) =>
                  setCommentDrafts((d) => ({ ...d, [post.id]: e.target.value }))
                }
                onKeyDown={(e) => e.key === "Enter" && comment(post.id)}
                className="h-8 flex-1 rounded-lg border border-surface-border bg-transparent px-3 text-xs outline-none focus:border-accent"
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
