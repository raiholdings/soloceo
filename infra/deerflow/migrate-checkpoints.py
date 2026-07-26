# -*- coding: utf-8 -*-
"""Chép nốt checkpoints sang Postgres: loại bỏ ký tự NUL mà Postgres không nhận."""
import sqlite3, os, json, asyncio, asyncpg
from datetime import datetime, date, timezone

SQLITE = "/app/backend/.deer-flow/data/deerflow.db"
PG = os.environ["DEERFLOW_DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")
NUL = chr(0)


def clean(x):
    if isinstance(x, str):
        return x.replace(NUL, "").replace("\\u0000", "")
    return x


def to_dt(v):
    if v is None or isinstance(v, (datetime, date)):
        return v
    if isinstance(v, (int, float)):
        try:
            return datetime.fromtimestamp(v, tz=timezone.utc)
        except Exception:
            return None
    s = str(v).strip()
    for f in ("%Y-%m-%d %H:%M:%S.%f%z", "%Y-%m-%d %H:%M:%S%z", "%Y-%m-%d %H:%M:%S.%f",
              "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(s.replace("Z", "+0000"), f)
        except Exception:
            pass
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


async def main():
    sc = sqlite3.connect(SQLITE)
    sc.row_factory = sqlite3.Row
    cur = sc.cursor()
    pg = await asyncpg.connect(PG)
    for t in ("checkpoints", "writes", "checkpoint_writes"):
        try:
            cur.execute("SELECT count(*) FROM " + t)
            n_src = cur.fetchone()[0]
        except Exception:
            continue
        meta = {r["column_name"]: r["data_type"] for r in await pg.fetch(
            "SELECT column_name,data_type FROM information_schema.columns "
            "WHERE table_schema='public' AND table_name=$1", t)}
        if not meta:
            print("  " + t + ": không có bảng tương ứng ở Postgres")
            continue
        before = await pg.fetchval('SELECT count(*) FROM "' + t + '"')
        cur.execute("SELECT * FROM " + t)
        cols = None
        err = None
        for r in cur.fetchall():
            if cols is None:
                cols = [c for c in r.keys() if c in meta]
            vals = []
            for c in cols:
                v = r[c]
                dt = meta.get(c, "")
                if v is not None:
                    if dt.startswith("timestamp") or dt == "date":
                        v = to_dt(v)
                    elif dt in ("json", "jsonb"):
                        if isinstance(v, (bytes, bytearray)):
                            v = v.decode("utf8", "ignore")
                        v = clean(v if isinstance(v, str) else json.dumps(v))
                        try:
                            v = json.dumps(json.loads(v))
                        except Exception:
                            v = json.dumps(v)
                    elif dt in ("text", "character varying"):
                        v = clean(v)
                    elif dt == "boolean" and isinstance(v, int):
                        v = bool(v)
                vals.append(v)
            ph = ",".join("$" + str(i + 1) for i in range(len(cols)))
            names = ",".join('"' + c + '"' for c in cols)
            q = 'INSERT INTO "' + t + '" (' + names + ") VALUES (" + ph + ") ON CONFLICT DO NOTHING"
            try:
                await pg.execute(q, *vals)
            except Exception as e:
                if err is None:
                    err = str(e)[:110]
        after = await pg.fetchval('SELECT count(*) FROM "' + t + '"')
        msg = "  " + t + ": nguồn " + str(n_src) + " -> PG " + str(after) + " (thêm " + str(after - before) + ")"
        print(msg + ("  canh bao: " + err if err else ""))
    await pg.close()


asyncio.run(main())
