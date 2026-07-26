import { NextResponse } from "next/server";

// Dữ liệu THỰC cho gallery mẫu dưới ô chat (proxy bigdata — bigdata không mở CORS).
const BD = "https://bigdata.soloceo.vn";

async function j(url: string, fallback: unknown) {
  try {
    const r = await fetch(url, { cache: "no-store", next: { revalidate: 0 } });
    return await r.json();
  } catch {
    return fallback;
  }
}

export async function GET(req: Request) {
  const kho = new URL(req.url).searchParams.get("kho") ?? "engine";
  switch (kho) {
    case "y-tuong":
      return NextResponse.json(await j(`${BD}/api/ideas?sort=top&limit=9`, { ideas: [] }));
    case "van-de":
      return NextResponse.json(await j(`${BD}/api/van-de?limit=9`, { van_de: [] }));
    case "giai-phap":
      return NextResponse.json(await j(`${BD}/api/giai-phap?limit=9`, { giai_phap: [] }));
    case "mo-hinh":
      return NextResponse.json(await j(`${BD}/api/mo-hinh-kd?limit=9`, { mo_hinh: [] }));
    case "san-pham":
      return NextResponse.json(await j(`${BD}/api/san-pham?limit=9`, { san_pham: [] }));
    case "su-kien":
      return NextResponse.json(await j(`${BD}/api/su-kien?limit=9`, { su_kien: [] }));
    default:
      return NextResponse.json(await j(`${BD}/api/engine`, {}));
  }
}
