"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

interface OrgMe {
  id: string;
  name: string;
  plan: string;
  status: string;
  createdAt: string;
}

export default function SettingsApp() {
  const [org, setOrg] = useState<OrgMe | null>(null);

  useEffect(() => {
    api<OrgMe>("/orgs/me").then(setOrg).catch(() => {});
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cài đặt tổ chức</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {org ? (
          <>
            <p>
              <span className="text-[#A0A0B8]">Tên: </span>
              {org.name}
            </p>
            <p>
              <span className="text-[#A0A0B8]">Gói: </span>
              {org.plan}
            </p>
            <p>
              <span className="text-[#A0A0B8]">Trạng thái: </span>
              {org.status}
            </p>
            <p>
              <span className="text-[#A0A0B8]">Thành viên từ: </span>
              {new Date(org.createdAt).toLocaleDateString("vi-VN")}
            </p>
          </>
        ) : (
          <p className="text-[#A0A0B8]">Đang tải...</p>
        )}
      </CardContent>
    </Card>
  );
}
