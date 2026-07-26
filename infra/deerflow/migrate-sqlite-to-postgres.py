# -*- coding: utf-8 -*-
"""Chép SQLite → Postgres (bản 2: ép đúng kiểu thời gian, UUID, JSON, bool)."""
import sqlite3, os, sys, json, asyncio, asyncpg, uuid
from datetime import datetime, date, timezone

SQLITE="/app/backend/.deer-flow/data/deerflow.db"
PG=os.environ.get("DEERFLOW_DATABASE_URL","").replace("postgresql+asyncpg://","postgresql://")
if not PG: sys.exit("thiếu DEERFLOW_DATABASE_URL")

ORDER=["users","threads_meta","runs","run_events","scheduled_tasks","scheduled_task_runs",
       "checkpoints","checkpoint_writes","writes","store","store_migrations","feedback",
       "channel_connections","channel_credentials","channel_conversations","channel_oauth_states"]

def to_dt(v):
    if v is None or isinstance(v,(datetime,date)): return v
    if isinstance(v,(int,float)):
        try: return datetime.fromtimestamp(v, tz=timezone.utc)
        except Exception: return None
    s=str(v).strip()
    if not s: return None
    for f in ("%Y-%m-%d %H:%M:%S.%f%z","%Y-%m-%d %H:%M:%S%z","%Y-%m-%d %H:%M:%S.%f","%Y-%m-%d %H:%M:%S","%Y-%m-%dT%H:%M:%S.%f%z","%Y-%m-%dT%H:%M:%S%z","%Y-%m-%dT%H:%M:%S.%f","%Y-%m-%dT%H:%M:%S","%Y-%m-%d"):
        try: return datetime.strptime(s.replace("Z","+0000"), f)
        except Exception: pass
    try: return datetime.fromisoformat(s.replace("Z","+00:00"))
    except Exception: return None

async def main():
    sc=sqlite3.connect(SQLITE); sc.row_factory=sqlite3.Row; cur=sc.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    stabs={r[0] for r in cur.fetchall()}
    pg=await asyncpg.connect(PG)
    ptabs={r["tablename"] for r in await pg.fetch("SELECT tablename FROM pg_tables WHERE schemaname='public'")}
    tong=0; loi=0
    for t in ORDER:
        if t not in stabs or t not in ptabs: continue
        cur.execute(f"SELECT * FROM {t}"); rows=cur.fetchall()
        if not rows: print(f"  {t}: 0 dòng nguồn"); continue
        meta={r["column_name"]:r["data_type"] for r in await pg.fetch(
            "SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1",t)}
        cols=[c for c in rows[0].keys() if c in meta]
        if not cols: continue
        ok=0; err=None
        for r in rows:
            vals=[]
            for c in cols:
                v=r[c]; dt=meta.get(c,"")
                if v is not None:
                    if dt.startswith("timestamp") or dt=="date": v=to_dt(v)
                    elif dt in ("json","jsonb"):
                        if isinstance(v,(bytes,bytearray)): v=v.decode("utf8","ignore")
                        if isinstance(v,str):
                            try: v=json.dumps(json.loads(v))
                            except Exception: v=json.dumps(v)
                        else: v=json.dumps(v)
                    elif dt=="boolean" and isinstance(v,int): v=bool(v)
                    elif dt=="uuid" and isinstance(v,str):
                        try: v=uuid.UUID(v)
                        except Exception: pass
                    elif dt in ("integer","bigint","smallint") and isinstance(v,str):
                        try: v=int(v)
                        except Exception: v=None
                vals.append(v)
            ph=",".join(f"${i+1}" for i in range(len(cols)))
            q=f'INSERT INTO "{t}" ({",".join(chr(34)+c+chr(34) for c in cols)}) VALUES ({ph}) ON CONFLICT DO NOTHING'
            try: await pg.execute(q,*vals); ok+=1
            except Exception as e:
                loi+=1
                if err is None: err=str(e)[:130]
        print(f"  {t}: {ok}/{len(rows)}" + (f"  ⚠ {err}" if err else ""))
        tong+=ok
    print(f"TỔNG chép: {tong} | lỗi: {loi}")
    for t in ("users","threads_meta","checkpoints"):
        if t in ptabs:
            print(f"  ➜ PG {t}: {await pg.fetchval(f'SELECT count(*) FROM \"{t}\"')}")
    await pg.close()
asyncio.run(main())
