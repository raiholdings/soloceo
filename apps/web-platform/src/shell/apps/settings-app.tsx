"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

const COMMUNITY_URL =
  process.env.NEXT_PUBLIC_COMMUNITY_URL ?? "https://my.soloceo.vn";

interface OrgMe {
  id: string;
  name: string;
  plan: string;
  status: string;
  createdAt: string;
}

interface Profile {
  username: string;
  email: string | null;
  name: string;
  avatar: string | null;
  verified: boolean;
  communityUrl: string;
}

export default function SettingsApp() {
  const [org, setOrg] = useState<OrgMe | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    api<OrgMe>("/orgs/me").then(setOrg).catch(() => {});
    api<{ profile: Profile | null }>("/auth/wowonder/me")
      .then((r) => setProfile(r.profile))
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tài khoản (SoloCEO Community)</CardTitle>
        </CardHeader>
        <CardContent>
          {profile ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                {profile.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="h-14 w-14 rounded-2xl object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20 text-xl font-bold text-accent-soft">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    {profile.name}
                    {profile.verified && (
                      <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] text-sky-400">
                        ✓
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[#A0A0B8]">
                    @{profile.username} · {profile.email ?? "—"}
                  </p>
                </div>
              </div>
              <a
                href={`${COMMUNITY_URL}/setting/${profile.username}/general-setting`}
                target="_blank"
                rel="noreferrer"
              >
                <Button size="sm" variant="outline" className="w-full">
                  Chỉnh sửa hồ sơ trên cộng đồng ↗
                </Button>
              </a>
            </div>
          ) : (
            <p className="text-sm text-[#A0A0B8]">
              Hồ sơ được đồng bộ từ my.soloceo.vn. Nếu trống, đăng nhập lại để
              làm mới.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tổ chức</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {org ? (
            <>
              <div className="flex justify-between">
                <span className="text-[#A0A0B8]">Tên</span>
                <span>{org.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A0A0B8]">Gói</span>
                <span>{org.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A0A0B8]">Trạng thái</span>
                <span>{org.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A0A0B8]">Thành viên từ</span>
                <span>
                  {new Date(org.createdAt).toLocaleDateString("vi-VN")}
                </span>
              </div>
            </>
          ) : (
            <p className="text-[#A0A0B8]">Đang tải...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
