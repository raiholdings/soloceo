"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiRequestError, getToken } from "@/lib/api";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

interface Venture {
  id: string;
  name: string;
  slug: string;
  industry?: string | null;
  status: string;
}

interface OrgMe {
  id: string;
  name: string;
  plan: string;
  ventures: Venture[];
}

const INDUSTRIES = [
  { value: "real_estate", label: "Bất động sản" },
  { value: "fnb", label: "F&B — Ẩm thực, đồ uống" },
  { value: "education", label: "Giáo dục" },
  { value: "services", label: "Dịch vụ" },
  { value: "other", label: "Khác" },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// Onboarding: tạo Org (nếu chưa có) → wizard venture 3 bước (tên/slug, ngành, mô tả)
export default function OnboardingPage() {
  const router = useRouter();
  const [org, setOrg] = useState<OrgMe | null>(null);
  const [phase, setPhase] = useState<"loading" | "create-org" | "wizard" | "done">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);

  const [orgName, setOrgName] = useState("");
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [industry, setIndustry] = useState("other");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/dang-nhap");
      return;
    }
    api<OrgMe>("/orgs/me")
      .then((o) => {
        setOrg(o);
        setPhase(o.ventures.length > 0 ? "done" : "wizard");
      })
      .catch((err) => {
        if (err instanceof ApiRequestError && err.status === 404) {
          setPhase("create-org");
        } else {
          setError(err.message);
        }
      });
  }, [router]);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/orgs", {
        method: "POST",
        body: JSON.stringify({ name: orgName }),
      });
      const o = await api<OrgMe>("/orgs/me");
      setOrg(o);
      setPhase("wizard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tạo Org");
    } finally {
      setBusy(false);
    }
  }

  async function createVenture() {
    setBusy(true);
    setError(null);
    try {
      const v = await api<Venture>("/ventures", {
        method: "POST",
        body: JSON.stringify({ name, slug, industry, description }),
      });
      router.push(`/v/${v.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tạo venture");
      setBusy(false);
    }
  }

  if (phase === "loading") {
    return <main className="p-24 text-center text-[#A0A0B8]">Đang tải...</main>;
  }

  if (phase === "done" && org) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="mb-6 text-2xl font-bold">Doanh nghiệp của tôi</h1>
        <div className="flex flex-col gap-4">
          {org.ventures.map((v) => (
            <Card key={v.id}>
              <CardHeader>
                <CardTitle>{v.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-sm text-[#A0A0B8]">
                  {v.slug}.app.soloceo.vn — {v.status}
                </span>
                <div className="flex gap-2">
                  <Link href={`/v/${v.slug}`}>
                    <Button size="sm" variant="outline">
                      Hồ sơ public
                    </Button>
                  </Link>
                  <a href="http://localhost:3001">
                    <Button size="sm">Mở SoloCEO OS</Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6">
      <Card className="w-full max-w-lg">
        {phase === "create-org" ? (
          <>
            <CardHeader>
              <CardTitle>Bước 0 — Tạo tài khoản doanh nghiệp</CardTitle>
              <p className="text-sm text-[#A0A0B8]">
                Mỗi Solo CEO có một tổ chức (Org) để quản lý mọi venture.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={createOrg} className="flex flex-col gap-4">
                <input
                  required
                  placeholder="Tên của bạn hoặc thương hiệu cá nhân"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="h-10 rounded-xl border border-surface-border bg-transparent px-4 text-sm outline-none focus:border-accent"
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button type="submit" disabled={busy}>
                  {busy ? "Đang tạo..." : "Tạo và tiếp tục"}
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>
                Bước {step}/3 —{" "}
                {step === 1
                  ? "Tên doanh nghiệp"
                  : step === 2
                    ? "Chọn ngành"
                    : "Giới thiệu"}
              </CardTitle>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3].map((s) => (
                  <span
                    key={s}
                    className={`h-1 flex-1 rounded ${s <= step ? "bg-accent" : "bg-surface"}`}
                  />
                ))}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {step === 1 && (
                <>
                  <input
                    required
                    placeholder="VD: Cà phê Anh Thư"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setSlug(slugify(e.target.value));
                    }}
                    className="h-10 rounded-xl border border-surface-border bg-transparent px-4 text-sm outline-none focus:border-accent"
                  />
                  <div>
                    <label className="mb-1 block text-xs text-[#A0A0B8]">
                      Địa chỉ website của bạn
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        required
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="h-10 flex-1 rounded-xl border border-surface-border bg-transparent px-4 text-sm outline-none focus:border-accent"
                      />
                      <span className="text-sm text-[#A0A0B8]">
                        .app.soloceo.vn
                      </span>
                    </div>
                  </div>
                  <Button
                    disabled={!name || !slug}
                    onClick={() => setStep(2)}
                  >
                    Tiếp tục
                  </Button>
                </>
              )}
              {step === 2 && (
                <>
                  <div className="grid grid-cols-1 gap-2">
                    {INDUSTRIES.map((i) => (
                      <button
                        key={i.value}
                        onClick={() => setIndustry(i.value)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                          industry === i.value
                            ? "border-accent bg-accent/10"
                            : "border-surface-border hover:bg-surface"
                        }`}
                      >
                        {i.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Quay lại
                    </Button>
                    <Button className="flex-1" onClick={() => setStep(3)}>
                      Tiếp tục
                    </Button>
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <textarea
                    rows={4}
                    placeholder="Mô tả ngắn về sản phẩm/dịch vụ của bạn..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="rounded-xl border border-surface-border bg-transparent px-4 py-3 text-sm outline-none focus:border-accent"
                  />
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      Quay lại
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={busy}
                      onClick={createVenture}
                    >
                      {busy ? "Đang tạo..." : "Khởi tạo doanh nghiệp 🚀"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </main>
  );
}
