"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, getToken } from "@/lib/api";
import { Button, Card, CardContent } from "@soloceo/ui";

interface Post {
  id: string;
  content: string;
  createdAt: string;
  org: { name: string };
  _count: { likes: number; comments: number };
}

// Feed cộng đồng trên soloceo.vn (Phần 6.6)
export default function CommunityFeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const reload = useCallback(async () => {
    setPosts(await api<Post[]>("/posts"));
  }, []);

  useEffect(() => {
    setLoggedIn(Boolean(getToken()));
    reload().catch(() => {});
  }, [reload]);

  async function createPost() {
    if (!content.trim()) return;
    await api("/posts", { method: "POST", body: JSON.stringify({ content }) });
    setContent("");
    await reload();
  }

  async function like(postId: string) {
    await api(`/posts/${postId}/like`, { method: "POST" });
    await reload();
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-bold">Cộng đồng Solo CEO</h1>

      {loggedIn ? (
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-2 p-4">
            <textarea
              rows={2}
              placeholder="Chia sẻ hành trình của bạn..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="rounded-xl border border-surface-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <Button size="sm" className="self-end" onClick={createPost}>
              Đăng
            </Button>
          </CardContent>
        </Card>
      ) : (
        <p className="mb-6 text-sm text-[#A0A0B8]">
          <Link href="/dang-nhap" className="text-accent-soft underline">
            Đăng nhập
          </Link>{" "}
          để chia sẻ cùng cộng đồng.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardContent className="flex flex-col gap-2 p-4">
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
              <div className="flex gap-4 text-xs text-[#A0A0B8]">
                <button
                  onClick={() => loggedIn && like(post.id)}
                  className="hover:text-accent-soft"
                >
                  ♥ {post._count.likes}
                </button>
                <span>💬 {post._count.comments}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {posts.length === 0 && (
          <p className="py-12 text-center text-sm text-[#A0A0B8]">
            Chưa có bài viết nào — hãy là người đầu tiên chia sẻ!
          </p>
        )}
      </div>
    </main>
  );
}
