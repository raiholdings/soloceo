"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getToken } from "@/lib/api";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

// Base của mạng xã hội cộng đồng (my.soloceo.vn) — lấy từ communityUrl của
// hồ sơ để luôn đúng, không phụ thuộc biến build.
function forumBase(communityUrl: string): string {
  try {
    return new URL(communityUrl).origin;
  } catch {
    return "https://my.soloceo.vn";
  }
}

interface Profile {
  username: string;
  email: string | null;
  name: string;
  avatar: string | null;
  verified: boolean;
  communityUrl: string;
}

interface OrgMe {
  id: string;
  name: string;
  plan: string;
  status: string;
  createdAt: string;
  ventures: Array<{ id: string; name: string; slug: string; status: string }>;
}

const PLAN_LABELS: Record<string, string> = {
  STARTER: "Khởi đầu",
  GROWTH: "Tăng trưởng",
  SCALE: "Bứt phá",
};

// Trang quản lý tài khoản — hồ sơ đồng bộ từ SoloCEO Community (my.soloceo.vn).
export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [org, setOrg] = useState<OrgMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/dang-nhap");
      return;
    }
    Promise.all([
      api<{ profile: Profile | null }>("/auth/wowonder/me").catch(() => ({
        profile: null,
      })),
      api<OrgMe>("/orgs/me").catch(() => null),
    ])
      .then(([p, o]) => {
        setProfile(p.profile);
        setOrg(o);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Không tải được tài khoản"),
      )
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <main className="p-24 text-center text-[#A0A0B8]">Đang tải...</main>;
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-bold">Tài khoản của tôi</h1>
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Hồ sơ đồng bộ từ Community */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hồ sơ SoloCEO Community</CardTitle>
          <p className="text-xs text-[#A0A0B8]">
            Thông tin cá nhân được đồng bộ từ mạng xã hội my.soloceo.vn — chỉnh
            sửa tại đó, cập nhật khắp nền tảng.
          </p>
        </CardHeader>
        <CardContent>
          {profile ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                {profile.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20 text-2xl font-bold text-accent-soft">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div>
                  <p className="flex items-center gap-2 text-lg font-semibold">
                    {profile.name}
                    {profile.verified && (
                      <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-400">
                        ✓ Đã xác minh
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-[#A0A0B8]">@{profile.username}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-[#A0A0B8]">Email</p>
                  <p>{profile.email ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[#A0A0B8]">Trang cộng đồng</p>
                  <a
                    href={profile.communityUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-soft hover:underline"
                  >
                    {profile.communityUrl.replace("https://", "")}
                  </a>
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={`${forumBase(profile.communityUrl)}/setting/${profile.username}/general-setting`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button size="sm">Chỉnh sửa hồ sơ ↗</Button>
                </a>
                <a
                  href={forumBase(profile.communityUrl)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button size="sm" variant="outline">
                    Mở cộng đồng
                  </Button>
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-[#A0A0B8]">
                Chưa lấy được hồ sơ cộng đồng (có thể phiên đã hết hạn). Đăng
                nhập lại để đồng bộ.
              </p>
              <Link href="/dang-nhap">
                <Button size="sm" variant="outline">
                  Đăng nhập lại
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tổ chức / gói cước */}
      {org && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tổ chức & gói cước</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#A0A0B8]">Tên tổ chức</span>
              <span>{org.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A0A0B8]">Gói hiện tại</span>
              <span className="text-accent-soft">
                {PLAN_LABELS[org.plan] ?? org.plan}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A0A0B8]">Trạng thái</span>
              <span
                className={
                  org.status === "ACTIVE" ? "text-emerald-400" : "text-amber-400"
                }
              >
                {org.status === "ACTIVE" ? "Đang hoạt động" : org.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A0A0B8]">Số doanh nghiệp</span>
              <span>{org.ventures.length}</span>
            </div>
            <Link href="/bat-dau" className="mt-2">
              <Button size="sm" variant="outline" className="w-full">
                Quản lý doanh nghiệp
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
