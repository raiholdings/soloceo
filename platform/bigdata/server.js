// bigdata.soloceo.vn — "Bộ não thứ 2" của SoloCEO (v3)
// Siêu dữ liệu cập nhật liên tục: startup toàn cầu, nhà sáng lập & CEO, công nghệ, tin tức, dataset.
// Cập nhật hàng giờ (tin tức/công nghệ) + daily full (startup/founder). AI so sánh ý tưởng.
const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH = process.env.DB_PATH || "/data/bigdata.db";
const LLM_BASE = process.env.LLM_BASE_URL || "https://llm.soloceo.vn/v1";
const LLM_KEY = process.env.LLM_API_KEY || "";
const LLM_MODEL = process.env.LLM_MODEL_NAME || "soloceo-smart";
const REFRESH_TOKEN = process.env.REFRESH_TOKEN || "soloceo-bigdata-refresh";
const UA = "SoloCEO-BigData/3.0 (https://bigdata.soloceo.vn; info@soloceo.vn)";
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY,
  type TEXT, source TEXT, ext_key TEXT,
  name TEXT, url TEXT, description TEXT, oneliner TEXT,
  category TEXT, subcategory TEXT, year INTEGER, batch TEXT,
  status TEXT, outcome TEXT, region TEXT, team_size INTEGER,
  tags TEXT, logo TEXT, top INTEGER, stage TEXT,
  score INTEGER, published TEXT, updated_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_extkey ON items(type, ext_key);
CREATE INDEX IF NOT EXISTS idx_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_year ON items(year);
CREATE INDEX IF NOT EXISTS idx_cat ON items(category);
CREATE INDEX IF NOT EXISTS idx_out ON items(outcome);
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
  name, description, oneliner, category, subcategory, tags, region, content='items', content_rowid='id'
);
`);
// FTS external-content: dựng lại toàn bộ (nhanh, đúng sau upsert/delete)
function rebuildFts(){try{db.exec("INSERT INTO items_fts(items_fts) VALUES('rebuild')");}catch(e){console.error("FTS rebuild lỗi",e.message);}}

// ---------- HELPERS ----------
async function fetchText(u,opt={}){const r=await fetch(u,{headers:{"user-agent":UA,...(opt.headers||{})}});if(!r.ok)throw new Error(u.slice(0,60)+" "+r.status);return r.text();}
async function fetchJson(u,opt={}){return JSON.parse(await fetchText(u,opt));}
const nowIso=()=>{try{return new Date().toISOString();}catch(e){return "";}};

const COLS=["type","source","ext_key","name","url","description","oneliner","category","subcategory","year","batch","status","outcome","region","team_size","tags","logo","top","stage","score","published","updated_at"];
const DEF={type:"",source:"",ext_key:"",name:"",url:"",description:"",oneliner:"",category:"Khác",subcategory:"",year:null,batch:"",status:"",outcome:"",region:"",team_size:null,tags:"",logo:"",top:0,stage:"",score:0,published:"",updated_at:""};
const upsertStmt=db.prepare(`INSERT INTO items(${COLS.join(",")}) VALUES(${COLS.map(c=>"@"+c).join(",")})
  ON CONFLICT(type,ext_key) DO UPDATE SET
  name=excluded.name,url=excluded.url,description=excluded.description,oneliner=excluded.oneliner,
  category=excluded.category,subcategory=excluded.subcategory,year=excluded.year,batch=excluded.batch,
  status=excluded.status,outcome=excluded.outcome,region=excluded.region,team_size=excluded.team_size,
  tags=excluded.tags,logo=excluded.logo,top=excluded.top,stage=excluded.stage,score=excluded.score,
  published=excluded.published,updated_at=excluded.updated_at`);
const upsertMany=db.transaction(rows=>{
  for(const r of rows){const row={...DEF,...r,updated_at:nowIso()}; if(!row.ext_key) row.ext_key=row.name; try{upsertStmt.run(row);}catch(e){}}
});
function ingestRows(rows){upsertMany(rows); return rows.length;}
function delType(t){db.prepare("DELETE FROM items WHERE type=?").run(t);}

// ---------- SOURCES ----------
function batchYear(b){const m=(b||"").match(/(19|20)\d{2}/);return m?parseInt(m[0]):null;}
function outcomeOf(s){if(s==="Public"||s==="Acquired")return "thanh-cong";if(s==="Inactive")return "dong-cua";return "dang-hoat-dong";}
// Việt hóa tên ngành phổ biến (YC industries + ngôn ngữ GitHub → tiếng Việt)
const VICAT={"Fintech":"Công nghệ tài chính","Healthcare":"Y tế & Sức khỏe","B2B":"Doanh nghiệp (B2B)","Consumer":"Tiêu dùng","Education":"Giáo dục","Real Estate and Construction":"Bất động sản & Xây dựng","Government":"Chính phủ","Industrials":"Công nghiệp","Unknown":"Khác","Other":"Khác",
  "Artificial Intelligence":"Trí tuệ nhân tạo","Analytics":"Phân tích dữ liệu","Engineering, Product and Design":"Kỹ thuật & Thiết kế","Sales and Marketing":"Bán hàng & Marketing","Operations":"Vận hành","Financial Services":"Dịch vụ tài chính","Insurance":"Bảo hiểm","Retail":"Bán lẻ","Media":"Truyền thông","Gaming":"Trò chơi","Logistics":"Logistics & Vận tải","Agriculture":"Nông nghiệp","Energy":"Năng lượng","Transportation":"Giao thông vận tải"};
function viCat(c){return VICAT[c]||c;}
function parseAwesomeRst(rst){
  const lines=rst.split("\n"); const out=[]; let cat="Khác";
  const linkRe=/`([^<`]+?)\s*<([^>]+)>`_/g;
  for(let i=0;i<lines.length;i++){const ln=lines[i],nx=lines[i+1]||"";
    if(ln.trim()&&/^[-~=^"']{3,}\s*$/.test(nx)&&ln.length<=60&&!ln.includes("`")){cat=ln.trim();continue;}
    let m;while((m=linkRe.exec(ln))!==null){const name=m[1].trim(),url=m[2].trim();if(!/^https?:\/\//.test(url))continue;
      const desc=ln.split("`_").slice(1).join("").replace(/^[\s-]+/,"").trim();
      out.push({type:"dataset",source:"awesome-datasets",ext_key:name+"|"+url,name,url,description:desc||cat+" dataset",oneliner:desc,category:cat});}}
  return out;
}
async function ingestDatasets(){const rst=await fetchText("https://raw.githubusercontent.com/awesomedata/awesome-public-datasets/master/README.rst");
  const ds=parseAwesomeRst(rst); return ingestRows(ds);}

async function ingestYC(){const yc=await fetchJson("https://yc-oss.github.io/api/companies/all.json");
  const sp=yc.filter(c=>c.name).map(c=>({type:"startup",source:"yc",ext_key:"yc-"+(c.id||c.slug||c.name),
    name:c.name,url:c.website||c.url||"",description:c.long_description||c.one_liner||"",oneliner:c.one_liner||"",
    category:viCat(c.industry)||"Khác",subcategory:c.subindustry||"",year:batchYear(c.batch),batch:c.batch||"",status:c.status||"",
    outcome:outcomeOf(c.status),region:(c.regions||[]).slice(0,3).join(", ")||(c.all_locations||"").split(";")[0].trim(),
    team_size:c.team_size||null,tags:(c.tags||[]).join(", "),logo:c.small_logo_thumb_url||"",top:c.top_company?1:0,stage:c.stage||""}));
  return ingestRows(sp);}

// Nhà sáng lập & CEO nổi tiếng — Wikidata SPARQL
async function sparql(query){
  const u="https://query.wikidata.org/sparql?format=json&query="+encodeURIComponent(query);
  const j=await fetchJson(u,{headers:{"accept":"application/sparql-results+json"}});
  return j.results.bindings;
}
async function ingestFounders(){
  // Người sáng lập của công ty (P112) + mô tả, giới hạn theo sitelink (nổi tiếng)
  const q=`SELECT ?p ?pLabel ?pDesc ?cLabel (SAMPLE(?img) as ?img) WHERE {
    ?c wdt:P112 ?p . ?c wdt:P31/wdt:P279* wd:Q4830453 .
    ?p wikibase:sitelinks ?sl . FILTER(?sl > 8)
    OPTIONAL { ?p wdt:P18 ?img }
    OPTIONAL { ?p schema:description ?pDesc . FILTER(LANG(?pDesc) IN ("vi","en")) }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "vi,en". }
  } GROUP BY ?p ?pLabel ?pDesc ?cLabel LIMIT 3000`;
  let rows=[];
  try{const b=await sparql(q);
    rows=b.filter(x=>x.pLabel&&!/^Q\d+$/.test(x.pLabel.value)).map(x=>({
      type:"founder",source:"wikidata",ext_key:x.p.value.split("/").pop(),
      name:x.pLabel.value,url:x.p.value,
      description:(x.pDesc?x.pDesc.value:"")+(x.cLabel?" — Nhà sáng lập "+x.cLabel.value:""),
      oneliner:x.cLabel?"Nhà sáng lập "+x.cLabel.value:(x.pDesc?x.pDesc.value:""),
      category:"Nhà sáng lập",subcategory:x.cLabel?x.cLabel.value:"",logo:x.img?x.img.value:""}));
  }catch(e){console.error("founders SPARQL lỗi",e.message);}
  // CEO đương/cựu (P39 = chief executive officer)
  const q2=`SELECT ?p ?pLabel ?pDesc (SAMPLE(?img) as ?img) WHERE {
    ?p wdt:P39 wd:Q484876 . ?p wikibase:sitelinks ?sl . FILTER(?sl > 10)
    OPTIONAL { ?p wdt:P18 ?img }
    OPTIONAL { ?p schema:description ?pDesc . FILTER(LANG(?pDesc) IN ("vi","en")) }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "vi,en". }
  } GROUP BY ?p ?pLabel ?pDesc LIMIT 2500`;
  try{const b2=await sparql(q2);
    const ceos=b2.filter(x=>x.pLabel&&!/^Q\d+$/.test(x.pLabel.value)).map(x=>({
      type:"ceo",source:"wikidata",ext_key:x.p.value.split("/").pop(),
      name:x.pLabel.value,url:x.p.value,description:x.pDesc?x.pDesc.value:"CEO / Lãnh đạo doanh nghiệp",
      oneliner:x.pDesc?x.pDesc.value:"CEO",category:"CEO",logo:x.img?x.img.value:""}));
    rows=rows.concat(ceos);
  }catch(e){console.error("ceo SPARQL lỗi",e.message);}
  if(rows.length){delType("founder");delType("ceo");ingestRows(rows);}
  return rows.length;
}

// Doanh nghiệp theo QUỐC GIA (Wikidata) — nhãn ưu tiên tiếng Việt
const COUNTRIES=[
  {q:"Q881",vi:"Việt Nam",lim:5000},{q:"Q30",vi:"Hoa Kỳ",lim:4000},{q:"Q148",vi:"Trung Quốc",lim:3000},
  {q:"Q17",vi:"Nhật Bản",lim:2000},{q:"Q884",vi:"Hàn Quốc",lim:1500},{q:"Q865",vi:"Đài Loan",lim:1000},
  {q:"Q334",vi:"Singapore",lim:1000},{q:"Q869",vi:"Thái Lan",lim:1000},{q:"Q252",vi:"Indonesia",lim:1000},
  {q:"Q928",vi:"Philippines",lim:800},{q:"Q833",vi:"Malaysia",lim:800},{q:"Q145",vi:"Anh",lim:2000},
  {q:"Q183",vi:"Đức",lim:2000},{q:"Q142",vi:"Pháp",lim:1500},{q:"Q668",vi:"Ấn Độ",lim:2000},
  {q:"Q408",vi:"Úc",lim:1200},{q:"Q16",vi:"Canada",lim:1500},{q:"Q155",vi:"Brazil",lim:1200},
  {q:"Q96",vi:"Mexico",lim:1000},{q:"Q38",vi:"Ý",lim:1200},{q:"Q29",vi:"Tây Ban Nha",lim:1000},
  {q:"Q55",vi:"Hà Lan",lim:900},{q:"Q39",vi:"Thụy Sĩ",lim:900},{q:"Q34",vi:"Thụy Điển",lim:800},
  {q:"Q20",vi:"Na Uy",lim:600},{q:"Q35",vi:"Đan Mạch",lim:600},{q:"Q33",vi:"Phần Lan",lim:600},
  {q:"Q31",vi:"Bỉ",lim:600},{q:"Q40",vi:"Áo",lim:600},{q:"Q45",vi:"Bồ Đào Nha",lim:500},
  {q:"Q36",vi:"Ba Lan",lim:800},{q:"Q213",vi:"Séc",lim:500},{q:"Q28",vi:"Hungary",lim:500},
  {q:"Q159",vi:"Nga",lim:1500},{q:"Q212",vi:"Ukraine",lim:600},{q:"Q801",vi:"Israel",lim:1000},
  {q:"Q878",vi:"UAE",lim:700},{q:"Q851",vi:"Ả Rập Xê Út",lim:600},{q:"Q43",vi:"Thổ Nhĩ Kỳ",lim:900},
  {q:"Q258",vi:"Nam Phi",lim:700},{q:"Q414",vi:"Argentina",lim:700},{q:"Q298",vi:"Chile",lim:500},
  {q:"Q739",vi:"Colombia",lim:500},{q:"Q664",vi:"New Zealand",lim:500},{q:"Q843",vi:"Pakistan",lim:600},
  {q:"Q902",vi:"Bangladesh",lim:500},{q:"Q836",vi:"Myanmar",lim:400},{q:"Q424",vi:"Campuchia",lim:400},
  {q:"Q819",vi:"Lào",lim:300},{q:"Q1033",vi:"Nigeria",lim:500},{q:"Q114",vi:"Kenya",lim:400},
  {q:"Q79",vi:"Ai Cập",lim:600},{q:"Q794",vi:"Iran",lim:600},{q:"Q419",vi:"Peru",lim:400},
  {q:"Q27",vi:"Ireland",lim:600},{q:"Q37",vi:"Litva",lim:300},
];
async function ingestByCountry(){
  let total=0; delType("company");
  for(const c of COUNTRIES){
    const q=`SELECT ?c ?cLabel ?cDesc ?indLabel ?web (SAMPLE(?logo) AS ?logo) WHERE {
      ?c wdt:P31/wdt:P279* wd:Q4830453 . ?c wdt:P17 wd:${c.q} .
      OPTIONAL { ?c wdt:P452 ?ind } OPTIONAL { ?c wdt:P856 ?web } OPTIONAL { ?c wdt:P154 ?logo }
      OPTIONAL { ?c schema:description ?cDesc . FILTER(LANG(?cDesc) IN ("vi","en")) }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "vi,en". }
    } GROUP BY ?c ?cLabel ?cDesc ?indLabel ?web LIMIT ${c.lim}`;
    try{const b=await sparql(q);
      const rows=b.filter(x=>x.cLabel&&!/^Q\d+$/.test(x.cLabel.value)).map(x=>({
        type:"company",source:"wikidata",ext_key:x.c.value.split("/").pop(),
        name:x.cLabel.value,url:x.web?x.web.value:x.c.value,
        description:x.cDesc?x.cDesc.value:(x.indLabel?"Doanh nghiệp "+x.indLabel.value:"Doanh nghiệp tại "+c.vi),
        oneliner:x.indLabel&&!/^Q\d+$/.test(x.indLabel.value)?x.indLabel.value:"",
        category:(x.indLabel&&!/^Q\d+$/.test(x.indLabel.value))?x.indLabel.value:"Doanh nghiệp",
        region:c.vi,logo:x.logo?x.logo.value:""}));
      ingestRows(rows); total+=rows.length; console.log(`[country] ${c.vi}: ${rows.length}`);
    }catch(e){console.error(`[country] ${c.vi} lỗi`,e.message);}
  }
  return total;
}

// Việt Nam chuyên sâu: địa phương (hành chính), đặc sản, du lịch/di tích (Wikidata, nhãn tiếng Việt)
async function ingestVN(defn){
  const q=`SELECT ?x ?xLabel ?xDesc WHERE {
    ${defn.where}
    OPTIONAL { ?x schema:description ?xDesc . FILTER(LANG(?xDesc) IN ("vi","en")) }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "vi,en". }
  } LIMIT ${defn.lim}`;
  const b=await sparql(q);
  const rows=b.filter(r=>r.xLabel&&!/^Q\d+$/.test(r.xLabel.value)).map(r=>({
    type:defn.type,source:"wikidata",ext_key:r.x.value.split("/").pop(),
    name:r.xLabel.value,url:r.x.value,description:r.xDesc?r.xDesc.value:defn.desc,
    oneliner:r.xDesc?r.xDesc.value:defn.desc,category:defn.cat,region:"Việt Nam"}));
  delType(defn.type); ingestRows(rows); console.log(`[VN] ${defn.type}: ${rows.length}`); return rows.length;
}
async function ingestVietnamRich(){
  let t=0;
  const defs=[
    {type:"dia-phuong",cat:"Địa phương",desc:"Đơn vị hành chính Việt Nam",lim:14000,where:"?x wdt:P17 wd:Q881 . ?x wdt:P31/wdt:P279* wd:Q56061 ."},
    {type:"tai-nguyen",cat:"Sông ngòi & địa lý",desc:"Sông / địa danh tự nhiên Việt Nam",lim:5000,where:"?x wdt:P17 wd:Q881 . ?x wdt:P31/wdt:P279* wd:Q4022 ."},
    {type:"nhan-vat",cat:"Nhân vật Việt Nam",desc:"Nhân vật nổi bật Việt Nam",lim:1200,where:"?x wdt:P27 wd:Q881 . ?x wdt:P31 wd:Q5 . ?x wikibase:sitelinks ?s . FILTER(?s>4) ."},
    {type:"giao-duc",cat:"Giáo dục",desc:"Trường đại học / cơ sở giáo dục Việt Nam",lim:600,where:"?x wdt:P17 wd:Q881 . ?x wdt:P31/wdt:P279* wd:Q3918 ."},
    {type:"bat-dong-san",cat:"Bất động sản",desc:"Tòa nhà / công trình / dự án BĐS Việt Nam",lim:3000,where:"?x wdt:P17 wd:Q881 . { ?x wdt:P31/wdt:P279* wd:Q41176 } UNION { ?x wdt:P31/wdt:P279* wd:Q11303 } ."},
    {type:"du-lich",cat:"Du lịch & di tích",desc:"Điểm du lịch / di tích Việt Nam",lim:800,where:"?x wdt:P17 wd:Q881 . { ?x wdt:P31/wdt:P279* wd:Q570116 } UNION { ?x wdt:P1435 ?h } ."},
    {type:"dac-san",cat:"Ẩm thực & đặc sản",desc:"Món ăn / đặc sản Việt Nam",lim:400,where:"?x wdt:P31/wdt:P279* wd:Q2095 . { ?x wdt:P495 wd:Q881 } UNION { ?x wdt:P17 wd:Q881 } ."},
  ];
  for(const d of defs){try{t+=await ingestVN(d);}catch(e){console.error(`[VN] ${d.type} lỗi`,e.message);}}
  return t;
}

// Tri thức pháp lý-kế toán-ngành Việt Nam (nguồn chính thức, biên soạn — verified core)
function seedVNKnowledge(){
  const VSIC=[["A","Nông nghiệp, lâm nghiệp và thủy sản"],["B","Khai khoáng"],["C","Công nghiệp chế biến, chế tạo"],["D","Sản xuất và phân phối điện, khí đốt, nước nóng, hơi nước"],["E","Cung cấp nước; hoạt động quản lý và xử lý rác thải, nước thải"],["F","Xây dựng"],["G","Bán buôn và bán lẻ; sửa chữa ô tô, mô tô, xe máy"],["H","Vận tải kho bãi"],["I","Dịch vụ lưu trú và ăn uống"],["J","Thông tin và truyền thông"],["K","Hoạt động tài chính, ngân hàng và bảo hiểm"],["L","Hoạt động kinh doanh bất động sản"],["M","Hoạt động chuyên môn, khoa học và công nghệ"],["N","Hoạt động hành chính và dịch vụ hỗ trợ"],["O","Hoạt động của Đảng, tổ chức chính trị - xã hội, quản lý nhà nước, an ninh quốc phòng"],["P","Giáo dục và đào tạo"],["Q","Y tế và hoạt động trợ giúp xã hội"],["R","Nghệ thuật, vui chơi và giải trí"],["S","Hoạt động dịch vụ khác"],["T","Hoạt động làm thuê trong các hộ gia đình"],["U","Hoạt động của các tổ chức và cơ quan quốc tế"]];
  const VAS=[["VAS 01","Chuẩn mực chung"],["VAS 02","Hàng tồn kho"],["VAS 03","Tài sản cố định hữu hình"],["VAS 04","Tài sản cố định vô hình"],["VAS 05","Bất động sản đầu tư"],["VAS 06","Thuê tài sản"],["VAS 07","Kế toán các khoản đầu tư vào công ty liên kết"],["VAS 08","Thông tin tài chính về các khoản góp vốn liên doanh"],["VAS 10","Ảnh hưởng của việc thay đổi tỷ giá hối đoái"],["VAS 11","Hợp nhất kinh doanh"],["VAS 14","Doanh thu và thu nhập khác"],["VAS 15","Hợp đồng xây dựng"],["VAS 16","Chi phí đi vay"],["VAS 17","Thuế thu nhập doanh nghiệp"],["VAS 18","Các khoản dự phòng, tài sản và nợ tiềm tàng"],["VAS 21","Trình bày báo cáo tài chính"],["VAS 22","Trình bày bổ sung BCTC của ngân hàng và tổ chức tài chính"],["VAS 23","Các sự kiện phát sinh sau ngày kết thúc kỳ kế toán năm"],["VAS 24","Báo cáo lưu chuyển tiền tệ"],["VAS 25","Báo cáo tài chính hợp nhất và kế toán khoản đầu tư vào công ty con"],["VAS 26","Thông tin về các bên liên quan"],["VAS 27","Báo cáo tài chính giữa niên độ"],["VAS 28","Báo cáo bộ phận"],["VAS 29","Thay đổi chính sách kế toán, ước tính kế toán và các sai sót"],["VAS 30","Lãi trên cổ phiếu"]];
  const LUAT=[["Luật Doanh nghiệp 2020","59/2020/QH14 — quy định thành lập, tổ chức quản lý, tổ chức lại, giải thể doanh nghiệp"],["Luật Đầu tư 2020","61/2020/QH14 — hoạt động đầu tư kinh doanh tại VN và từ VN ra nước ngoài"],["Luật Kế toán 2015","88/2015/QH13 — nội dung công tác kế toán, tổ chức bộ máy kế toán"],["Bộ luật Dân sự 2015","91/2015/QH13 — quan hệ dân sự, hợp đồng, sở hữu"],["Luật Thương mại 2005","36/2005/QH11 — hoạt động thương mại"],["Luật Thuế thu nhập doanh nghiệp","14/2008/QH12 (sửa đổi) — thuế TNDN"],["Luật Thuế giá trị gia tăng","13/2008/QH12 (sửa đổi) — thuế GTGT"],["Luật Thuế thu nhập cá nhân","04/2007/QH12 (sửa đổi) — thuế TNCN"],["Luật Quản lý thuế 2019","38/2019/QH14 — quản lý thuế"],["Bộ luật Lao động 2019","45/2019/QH14 — quan hệ lao động, hợp đồng lao động"],["Luật Sở hữu trí tuệ","50/2005/QH11 (sửa đổi 2022) — quyền tác giả, sở hữu công nghiệp"],["Luật Cạnh tranh 2018","23/2018/QH14 — kiểm soát cạnh tranh, độc quyền"],["Luật Bảo vệ quyền lợi người tiêu dùng","19/2023/QH15"],["Luật Giao dịch điện tử 2023","20/2023/QH15 — giao dịch điện tử, chữ ký số"],["Luật An ninh mạng 2018","24/2018/QH14"],["Nghị định 13/2023/NĐ-CP","Bảo vệ dữ liệu cá nhân"],["Luật Chứng khoán 2019","54/2019/QH14 — thị trường chứng khoán"],["Luật Các tổ chức tín dụng 2024","32/2024/QH15 — ngân hàng, tín dụng"],["Luật Hỗ trợ doanh nghiệp nhỏ và vừa","04/2017/QH14"],["Luật Phá sản 2014","51/2014/QH13"]];
  const rows=[];
  for(const[ma,ten]of VSIC)rows.push({type:"nganh-vsic",source:"vsic-2018",ext_key:"vsic-"+ma,name:`Ngành ${ma} — ${ten}`,description:`Phân ngành cấp 1 (Section ${ma}) theo Hệ thống ngành kinh tế Việt Nam VSIC 2018 (QĐ 27/2018/QĐ-TTg).`,oneliner:ten,category:"Ngành kinh tế (VSIC)",region:"Việt Nam"});
  for(const[ma,ten]of VAS)rows.push({type:"ke-toan",source:"vas",ext_key:ma.replace(/\s/g,""),name:`${ma} — ${ten}`,description:`Chuẩn mực Kế toán Việt Nam (${ma}) do Bộ Tài chính ban hành. Nội dung: ${ten}.`,oneliner:ten,category:"Chuẩn mực kế toán (VAS)",region:"Việt Nam"});
  for(const[ten,mota]of LUAT)rows.push({type:"luat",source:"vbpl",ext_key:"luat-"+ten.slice(0,40),name:ten,description:mota,oneliner:mota.split("—").pop().trim(),category:"Pháp luật kinh doanh",region:"Việt Nam"});
  delType("nganh-vsic");delType("ke-toan");delType("luat");
  ingestRows(rows); console.log(`[VN-knowledge] VSIC+VAS+Luật: ${rows.length}`); return rows.length;
}

// Công nghệ — GitHub top repositories (mã nguồn mở phổ biến)
async function ingestTech(){
  let all=[];
  const queries=["stars:>40000","topic:artificial-intelligence stars:>8000","topic:web stars:>15000","topic:devops stars:>8000"];
  for(const q of queries){
    try{const j=await fetchJson("https://api.github.com/search/repositories?sort=stars&order=desc&per_page=60&q="+encodeURIComponent(q),
      {headers:{"accept":"application/vnd.github+json"}});
      for(const r of (j.items||[])) all.push({type:"technology",source:"github",ext_key:"gh-"+r.id,
        name:r.full_name,url:r.html_url,description:r.description||"",oneliner:r.description||"",
        category:r.language||"Công nghệ",subcategory:(r.topics||[]).slice(0,3).join(", "),
        tags:(r.topics||[]).join(", "),score:r.stargazers_count||0,top:(r.stargazers_count>50000)?1:0});
    }catch(e){console.error("github lỗi",q,e.message);}
  }
  if(all.length){delType("technology");ingestRows(all);}
  return all.length;
}

// Tin tức — Hacker News (top) + dev.to (bài top)
async function ingestNews(){
  let rows=[];
  try{const ids=await fetchJson("https://hacker-news.firebaseio.com/v0/topstories.json");
    const top=ids.slice(0,80);
    const items=await Promise.all(top.map(id=>fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).catch(()=>null)));
    for(const it of items){if(!it||!it.title)continue;
      rows.push({type:"news",source:"hackernews",ext_key:"hn-"+it.id,name:it.title,
        url:it.url||("https://news.ycombinator.com/item?id="+it.id),description:it.title,oneliner:"Hacker News",
        category:"Công nghệ",score:it.score||0,published:it.time?new Date(it.time*1000).toISOString():""});}
  }catch(e){console.error("HN lỗi",e.message);}
  try{const arts=await fetchJson("https://dev.to/api/articles?per_page=60&top=1");
    for(const a of arts){rows.push({type:"news",source:"devto",ext_key:"devto-"+a.id,name:a.title,
      url:a.url,description:a.description||a.title,oneliner:(a.tag_list||[]).join(", "),
      category:"Lập trình",tags:(a.tag_list||[]).join(", "),score:a.positive_reactions_count||0,published:a.published_at||""});}
  }catch(e){console.error("devto lỗi",e.message);}
  if(rows.length){delType("news");ingestRows(rows);}
  return rows.length;
}

async function fullIngest(){
  const n=db.prepare("SELECT count(*) n FROM items").get().n;
  console.log(`[ingest] hiện có ${n} mục, bắt đầu full...`);
  for(const [name,fn] of [["VN tri thức (VSIC/VAS/Luật)",async()=>seedVNKnowledge()],["datasets",ingestDatasets],["startups YC",ingestYC],["DN theo quốc gia",ingestByCountry],["VN địa phương/đặc sản/du lịch",ingestVietnamRich],["founders/CEO",ingestFounders],["technology",ingestTech],["news",ingestNews]]){
    try{const c=await fn(); console.log(`[ingest] ${name}: ${c}`);}catch(e){console.error(`[ingest] ${name} lỗi`,e.message);}
  }
  rebuildFts();
  console.log("[ingest] full xong. Tổng:", db.prepare("SELECT count(*) n FROM items").get().n);
}
async function hourlyIngest(){ // chỉ nguồn đổi liên tục
  for(const [name,fn] of [["news",ingestNews],["technology",ingestTech]]){
    try{const c=await fn(); console.log(`[hourly] ${name}: ${c}`);}catch(e){console.error(`[hourly] ${name} lỗi`,e.message);}
  }
  rebuildFts();
}

// ---------- API ----------
const app=express();
app.use(express.json({limit:"1mb"}));
app.use(express.static(path.join(__dirname,"public")));

function ftsQuery(q){return q.trim().replace(/["']/g," ").split(/\s+/).filter(Boolean).map(w=>`"${w}"*`).join(" ");}
function runSearch({q="",type="",year="",category="",outcome="",region="",limit=60}){
  const lim=Math.min(parseInt(limit)||60,200);const where=[];const args=[];let base;
  if(q&&q.trim()){base=`SELECT i.* FROM items_fts f JOIN items i ON i.id=f.rowid WHERE items_fts MATCH ?`;args.push(ftsQuery(q));}
  else base=`SELECT i.* FROM items i WHERE 1=1`;
  if(type){where.push("i.type=?");args.push(type);}
  if(year){where.push("i.year=?");args.push(parseInt(year));}
  if(category){where.push("i.category=?");args.push(category);}
  if(outcome){where.push("i.outcome=?");args.push(outcome);}
  if(region){where.push("i.region=?");args.push(region);}
  const order=(q&&q.trim())?" ORDER BY i.top DESC, i.score DESC, rank":" ORDER BY i.top DESC, i.score DESC,(i.year IS NOT NULL) DESC,i.year DESC";
  return db.prepare(base+(where.length?" AND "+where.join(" AND "):"")+order+` LIMIT ${lim}`).all(...args);
}
app.get("/api/search",(req,res)=>{try{const r=runSearch(req.query);res.json({count:r.length,results:r});}catch(e){res.status(400).json({error:e.message});}});

// ===== SOLOCEO DATA ENGINE — phương pháp + chuẩn hóa + provenance + chất lượng =====
// (Lấy cảm hứng Scale AI Data Engine: Thu thập → Chuẩn hóa → Làm giàu → Đánh giá → Phục vụ → Lặp)
const SOURCE_META={
  yc:{ten:"Y Combinator OSS",license:"Công khai (yc-oss)",loai:"startup"},
  wikidata:{ten:"Wikidata",license:"CC0 (miền công cộng)",loai:"công ty/người"},
  github:{ten:"GitHub API",license:"Công khai (metadata)",loai:"công nghệ"},
  hackernews:{ten:"Hacker News API",license:"Công khai",loai:"tin tức"},
  devto:{ten:"dev.to API",license:"Công khai (CC-BY)",loai:"tin tức"},
  "awesome-datasets":{ten:"awesome-public-datasets",license:"MIT (danh mục)",loai:"dataset"},
  // Lớp dữ liệu Việt Nam — ghi nhận nguồn là điều kiện bắt buộc của ODbL và CC BY-SA
  "osm-vietnam":{ten:"OpenStreetMap Việt Nam (bản trích Geofabrik)",license:"ODbL 1.0 — © những người đóng góp OpenStreetMap",loai:"cơ sở kinh doanh / địa điểm / đường phố"},
  "geonames-vn":{ten:"GeoNames Việt Nam",license:"CC BY 4.0",loai:"địa danh"},
  "wikidata-vn":{ten:"Wikidata (lớp Việt Nam mở rộng)",license:"CC0 (miền công cộng)",loai:"doanh nghiệp / tổ chức / hạ tầng"},
  "wikipedia-vi":{ten:"Wikipedia tiếng Việt",license:"CC BY-SA 4.0",loai:"tri thức tiếng Việt"},
  openalex:{ten:"OpenAlex",license:"CC0 (miền công cộng)",loai:"nghiên cứu / tổ chức khoa học"},
};
const ENGINE_STAGES=[
  {ma:"thu-thap",ten:"1. Thu thập",mo_ta:"Kết nối nhiều nguồn mở. Lớp Việt Nam: OpenStreetMap (cơ sở kinh doanh, địa điểm, đường phố), GeoNames (địa danh có toạ độ), Wikidata VN (doanh nghiệp, tổ chức, hạ tầng), Wikipedia tiếng Việt (tri thức), OpenAlex (nghiên cứu và tổ chức khoa học). Lớp quốc tế: YC, GitHub, Hacker News, dev.to, DN 57 quốc gia. Cập nhật hàng giờ (tin tức/công nghệ) + full hàng ngày."},
  {ma:"chuan-hoa",ten:"2. Chuẩn hóa",mo_ta:"Đưa mọi nguồn về 1 lược đồ chung (items): loại · tên · mô tả · ngành (taxonomy) · quốc gia · năm · nguồn · khóa duy nhất. Upsert theo (type, ext_key) chống trùng; ngành dịch tiếng Việt."},
  {ma:"lam-giau",ten:"3. Làm giàu (AI)",mo_ta:"Bổ sung bằng AI/nguồn phụ: dịch tiếng Việt (LLM), README GitHub, trích Wikipedia, phân loại thành/bại startup, oneliner. Human-in-the-loop khi cần."},
  {ma:"danh-gia",ten:"4. Đánh giá chất lượng",mo_ta:"Chấm điểm mỗi bản ghi theo độ đầy đủ (có mô tả/URL/ngành/quốc gia) + độ tươi (updated_at) + độ tin cậy nguồn. Gắn provenance + giấy phép."},
  {ma:"phuc-vu",ten:"5. Phục vụ hệ điều hành",mo_ta:"API chuẩn (/api/search, /api/item, /api/ask, /api/engine) cho agent SoloCEO khai thác: phân tích thị trường, ngách, thương hiệu, đối thủ."},
  {ma:"vong-lap",ten:"6. Vòng lặp (Flywheel)",mo_ta:"Agent dùng dữ liệu → phát hiện thiếu/lỗi → ưu tiên bổ sung & làm sạch nguồn kế tiếp (active-curation). Dữ liệu tốt hơn → agent giỏi hơn → lặp lại."},
  {ma:"van-de",ten:"7. Phát hiện vấn đề (vòng lặp)",mo_ta:"Máy quét liên tục tin tức/công nghệ/ngành/địa phương VN → lập luận vấn đề theo CHUẨN QUỐC TẾ: JTBD (Jobs-To-Be-Done) + POV Statement (Design Thinking) + 5 Whys (gốc rễ) + đo tần suất × mức độ → backlog vấn đề chờ giải."},
  {ma:"co-hoi",ten:"8. Ghép cơ hội",mo_ta:"Ghép vấn đề đau nhất × KHO GIẢI PHÁP thế giới (đúc liên tục từ công nghệ/startup đã chứng minh) × mô hình KD SoloCEO (38) × MVP mẫu (101) × nền tảng (104) — thành tổ hợp cơ hội khả thi cho 1 người."},
  {ma:"duc-y-tuong",ten:"9. Đúc ý tưởng (BMC Foundry)",mo_ta:"Mỗi giờ AI đúc 1 ý tưởng khởi nghiệp ĐẦY ĐỦ: vấn đề → giải pháp → thị trường → BMC 9 khối → bước tuần đầu → stack SoloCEO. Mọi luận điểm dẫn nốt dữ liệu, không bịa số."},
  {ma:"kiem-chung",ten:"10. Kiểm chứng cộng đồng",mo_ta:"Solo CEO chấm sao 1-5 + bấm \"Tôi thực thi\". Xếp hạng theo điểm × lượng vote và số CEO thực thi — ý tưởng tốt nổi lên, phản hồi quay lại tinh chỉnh xưởng đúc (bước 7)."},
];
app.get("/api/engine",(req,res)=>{
  const g=q=>db.prepare(q).get().n;
  const total=g("SELECT count(*) n FROM items");
  const bySource=db.prepare("SELECT source,count(*) n FROM items GROUP BY source ORDER BY n DESC").all()
    .map(r=>({nguon:r.source,so_luong:r.n,...(SOURCE_META[r.source]||{ten:r.source,license:"—"})}));
  // Chất lượng: độ đầy đủ trường
  const withDesc=g("SELECT count(*) n FROM items WHERE description!=''");
  const withUrl=g("SELECT count(*) n FROM items WHERE url!=''");
  const withCat=g("SELECT count(*) n FROM items WHERE category!='' AND category!='Khác'");
  const withRegion=g("SELECT count(*) n FROM items WHERE region!=''");
  const pct=x=>total?Math.round(x/total*100):0;
  const quality={
    diem_trung_binh: total?Math.round((withDesc+withUrl+withCat+withRegion)/(total*4)*100):0,
    co_mo_ta:pct(withDesc),co_url:pct(withUrl),co_nganh:pct(withCat),co_quoc_gia:pct(withRegion),
  };
  // Độ tươi (updated_at trong DB — theo lần refresh)
  const coverage={
    quoc_gia:g("SELECT count(DISTINCT region) n FROM items WHERE type='company' AND region!=''"),
    nganh:g("SELECT count(DISTINCT category) n FROM items WHERE category!='' AND category!='Khác'"),
    loai:db.prepare("SELECT count(DISTINCT type) n FROM items").get().n,
  };
  res.json({
    ten:"SoloCEO Data Engine",
    khau_hieu:"Thu thập → Chuẩn hóa → Làm giàu → Đánh giá → Phục vụ → Lặp → Vấn đề → Cơ hội → Đúc ý tưởng → Kiểm chứng",
    phuong_phap:ENGINE_STAGES, tong_ban_ghi:total, nguon:bySource, chat_luong:quality, do_phu:coverage,
    doc_quyen:(()=>{const c=q=>{try{return db.prepare(q).get().n;}catch(e){return 0;}};
      return {van_de:c("SELECT count(*) n FROM problems"),van_de_mo:c("SELECT count(*) n FROM problems WHERE trang_thai='moi'"),
        giai_phap:c("SELECT count(*) n FROM solutions"),mo_hinh:c("SELECT count(*) n FROM biz_models"),
        san_pham:c("SELECT count(*) n FROM products"),su_kien:c("SELECT count(*) n FROM mkt_events"),
        y_tuong:c("SELECT count(*) n FROM ideas"),y_tuong_ceo:c("SELECT count(*) n FROM ideas WHERE nguon='ceo'"),
        canh_mang:c("SELECT count(*) n FROM edges")};})(),
    cap_nhat:{hang_gio:["Tin tức","Công nghệ"],hang_ngay:["Startup","Doanh nghiệp 57 quốc gia","Nhà sáng lập/CEO","Dataset"]},
    phuc_vu_os:["/api/search — tra cứu toàn văn","/api/item/:id — hồ sơ chi tiết + README/Wikipedia","/api/ask — AI phân tích ý tưởng vs startup","/api/engine — metrics pipeline"],
  });
});

// Trang chi tiết 1 item (click ra page chi tiết) — kèm README (GitHub) / trích Wikipedia + item liên quan
const detailCache=new Map();
app.get("/api/item/:id",async(req,res)=>{
  const it=db.prepare("SELECT * FROM items WHERE id=?").get(req.params.id);
  if(!it) return res.status(404).json({error:"Không tìm thấy mục này."});
  const related=db.prepare(`SELECT id,type,name,url,oneliner,description,category,region,logo,score,year,status,outcome
    FROM items WHERE type=? AND category=? AND id!=? ORDER BY top DESC,score DESC LIMIT 8`).all(it.type,it.category,it.id);
  let rich="",richType="";
  const ck="d"+it.id;
  if(detailCache.has(ck)){const c=detailCache.get(ck);rich=c.rich;richType=c.richType;}
  else{
    try{
      if(it.type==="technology"&&it.source==="github"&&/^[^/]+\/[^/]+$/.test(it.name)){
        rich=(await fetchText(`https://api.github.com/repos/${it.name}/readme`,{headers:{"accept":"application/vnd.github.raw+json"}})).slice(0,24000);richType="markdown";
      } else if((it.type==="founder"||it.type==="ceo"||it.type==="company")&&it.source==="wikidata"){
        // Trích tóm tắt Wikipedia (nếu có sitelink) theo Q-id
        const qid=it.ext_key;
        const wd=await fetchJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=sitelinks&format=json&origin=*`);
        const sl=wd.entities&&wd.entities[qid]&&wd.entities[qid].sitelinks||{};
        const title=(sl.viwiki&&sl.viwiki.title)||(sl.enwiki&&sl.enwiki.title);
        const wiki=sl.viwiki?"vi":"en";
        if(title){const sum=await fetchJson(`https://${wiki}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
          rich=(sum.extract||"");richType="text";}
      }
    }catch(e){rich="";}
    detailCache.set(ck,{rich,richType}); if(detailCache.size>500)detailCache.delete(detailCache.keys().next().value);
  }
  res.json({item:it,related,rich,richType});
});

app.get("/api/stats",(req,res)=>{
  const g=q=>db.prepare(q).get().n;
  const byType=Object.fromEntries(db.prepare(`SELECT type,count(*) n FROM items GROUP BY type`).all().map(r=>[r.type,r.n]));
  const y=db.prepare(`SELECT min(year) a,max(year) b FROM items WHERE year IS NOT NULL`).get();
  const out=Object.fromEntries(db.prepare(`SELECT outcome,count(*) n FROM items WHERE type='startup' GROUP BY outcome`).all().map(r=>[r.outcome,r.n]));
  res.json({total:g("SELECT count(*) n FROM items"),byType,
    datasets:byType.dataset||0,startups:byType.startup||0,founders:byType.founder||0,ceos:byType.ceo||0,
    technology:byType.technology||0,news:byType.news||0,companies:byType.company||0,
    yearFrom:y.a,yearTo:y.b,thanhcong:out["thanh-cong"]||0,donghoatdong:out["dang-hoat-dong"]||0,dongcua:out["dong-cua"]||0});
});
app.get("/api/facets",(req,res)=>{
  const inds=db.prepare(`SELECT DISTINCT category FROM items WHERE type='startup' AND category!='' ORDER BY category`).all().map(r=>r.category);
  const cats=db.prepare(`SELECT DISTINCT category FROM items WHERE type='dataset' AND category!='' ORDER BY category`).all().map(r=>r.category);
  const years=db.prepare(`SELECT DISTINCT year FROM items WHERE year IS NOT NULL ORDER BY year DESC`).all().map(r=>r.year);
  const types=db.prepare(`SELECT DISTINCT type FROM items ORDER BY type`).all().map(r=>r.type);
  const countries=db.prepare(`SELECT region, count(*) n FROM items WHERE type='company' AND region!='' GROUP BY region ORDER BY n DESC`).all().map(r=>r.region);
  res.json({industries:inds,categories:cats,years,types,countries});
});
app.get("/api/insights",(req,res)=>{
  const byInd=db.prepare(`SELECT category, count(*) n, sum(CASE WHEN outcome='thanh-cong' THEN 1 ELSE 0 END) win,
      sum(CASE WHEN outcome='dong-cua' THEN 1 ELSE 0 END) dead FROM items WHERE type='startup' GROUP BY category ORDER BY n DESC`).all();
  const bySub=db.prepare(`SELECT subcategory, count(*) n FROM items WHERE type='startup' AND subcategory!='' GROUP BY subcategory ORDER BY n DESC LIMIT 25`).all();
  const byYear=db.prepare(`SELECT year, count(*) n FROM items WHERE type='startup' AND year IS NOT NULL GROUP BY year ORDER BY year`).all();
  const byRegion=db.prepare(`SELECT region, count(*) n FROM items WHERE type='startup' AND region!='' GROUP BY region ORDER BY n DESC LIMIT 15`).all();
  res.json({byIndustry:byInd,bySubindustry:bySub,byYear,byRegion});
});

// Refresh có token (cron gọi)
let refreshing=false;
app.get("/api/admin/refresh",async(req,res)=>{
  if((req.query.token||"")!==REFRESH_TOKEN) return res.status(403).json({error:"token sai"});
  if(refreshing) return res.json({status:"đang chạy"});
  refreshing=true; const scope=req.query.scope||"hourly";
  res.json({status:"bắt đầu",scope});
  try{ if(scope==="full") await fullIngest(); else if(scope==="datasets") await ingestOpenDatasets(); else if(scope==="datasets2") await ingestOpenDatasets2(); else if(scope==="soloceo") await ingestSoloceo(); else await hourlyIngest(); }
  catch(e){console.error("refresh lỗi",e.message);} finally{refreshing=false;}
});

app.post("/api/ask",async(req,res)=>{
  const idea=(req.body&&req.body.idea||"").trim();
  if(idea.length<3) return res.status(400).json({error:"Nhập ý tưởng dài hơn."});
  const matches=runSearch({q:idea,type:"startup",limit:14});
  const ctx=matches.map(m=>`- ${m.name} (${m.batch||m.year||""}, ${m.category}${m.subcategory?"/"+m.subcategory:""}, ${m.status}${m.region?", "+m.region:""}): ${(m.oneliner||m.description||"").slice(0,160)}`).join("\n");
  const prompt=`Bạn là "bộ não thứ 2" của một Solo CEO. Người dùng có ý tưởng khởi nghiệp sau:\n"${idea}"\n\nDưới đây là các startup có mô hình/ngành tương tự trong cơ sở dữ liệu (${matches.length} công ty):\n${ctx||"(không tìm thấy công ty tương tự)"}\n\nHãy phân tích NGẮN GỌN bằng tiếng Việt, có cấu trúc:\n1. **Ý tưởng này đã có ai làm chưa?** — 2-4 startup giống nhất + trạng thái.\n2. **Bài học thành công & thất bại**.\n3. **Mức độ cạnh tranh & khoảng trống**.\n4. **Khuyến nghị cho Solo CEO**.\nNgắn gọn, thực chiến.`;
  if(!LLM_KEY) return res.json({answer:"(Chưa cấu hình LLM_API_KEY)",matches});
  try{const r=await fetch(`${LLM_BASE}/chat/completions`,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${LLM_KEY}`},
      body:JSON.stringify({model:LLM_MODEL,messages:[{role:"user",content:prompt}],temperature:0.5,max_tokens:900})});
    const j=await r.json();
    res.json({answer:(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||("(LLM lỗi: "+JSON.stringify(j).slice(0,200)+")"),matches});
  }catch(e){res.json({answer:"(Không gọi được AI: "+e.message+")",matches});}
});

// Dịch on-demand sang tiếng Việt (LLM) — cho mô tả/README tiếng Anh
const transCache=new Map();
app.post("/api/translate",async(req,res)=>{
  const text=((req.body&&req.body.text)||"").slice(0,6000).trim();
  if(text.length<2) return res.json({vi:text});
  const ck=text.slice(0,200)+"|"+text.length;
  if(transCache.has(ck)) return res.json({vi:transCache.get(ck)});
  if(!LLM_KEY) return res.json({vi:"(Chưa cấu hình dịch AI)"});
  try{const r=await fetch(`${LLM_BASE}/chat/completions`,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${LLM_KEY}`},
    body:JSON.stringify({model:LLM_MODEL,messages:[{role:"user",content:"Dịch đoạn sau sang tiếng Việt tự nhiên, giữ nguyên thuật ngữ/tên riêng, chỉ trả bản dịch:\n\n"+text}],temperature:0.2,max_tokens:1500})});
    const j=await r.json();const vi=(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content||text).trim();
    transCache.set(ck,vi); if(transCache.size>1000)transCache.delete(transCache.keys().next().value);
    res.json({vi});
  }catch(e){res.json({vi:"(Lỗi dịch: "+e.message+")"});}
});

// ═══════ NẠP DATASET THẬT (bản ghi, không phải link) — v6 ═══════
// Nguồn GitHub/API mở, giấy phép PD/MIT/ODbL/CC: world-cities, universities,
// S&P500, mledoze/countries (+GDP+dân số), Nobel laureates.
const VI_COUNTRY={"vietnam":"Việt Nam","viet nam":"Việt Nam","united states":"Hoa Kỳ","united states of america":"Hoa Kỳ","china":"Trung Quốc","japan":"Nhật Bản","south korea":"Hàn Quốc","korea, republic of":"Hàn Quốc","north korea":"Triều Tiên","india":"Ấn Độ","singapore":"Singapore","thailand":"Thái Lan","indonesia":"Indonesia","malaysia":"Malaysia","philippines":"Philippines","cambodia":"Campuchia","laos":"Lào","myanmar":"Myanmar","france":"Pháp","germany":"Đức","united kingdom":"Anh","italy":"Ý","spain":"Tây Ban Nha","portugal":"Bồ Đào Nha","netherlands":"Hà Lan","belgium":"Bỉ","switzerland":"Thụy Sĩ","austria":"Áo","sweden":"Thụy Điển","norway":"Na Uy","denmark":"Đan Mạch","finland":"Phần Lan","poland":"Ba Lan","russia":"Nga","russian federation":"Nga","ukraine":"Ukraina","czech republic":"Séc","czechia":"Séc","greece":"Hy Lạp","turkey":"Thổ Nhĩ Kỳ","canada":"Canada","mexico":"Mexico","brazil":"Brazil","argentina":"Argentina","chile":"Chile","colombia":"Colombia","peru":"Peru","australia":"Úc","new zealand":"New Zealand","egypt":"Ai Cập","south africa":"Nam Phi","nigeria":"Nigeria","kenya":"Kenya","israel":"Israel","saudi arabia":"Ả Rập Xê Út","united arab emirates":"UAE","qatar":"Qatar","iran":"Iran","iraq":"Iraq","pakistan":"Pakistan","bangladesh":"Bangladesh","sri lanka":"Sri Lanka","nepal":"Nepal","taiwan":"Đài Loan","hong kong":"Hồng Kông","mongolia":"Mông Cổ","kazakhstan":"Kazakhstan","hungary":"Hungary","romania":"Romania","bulgaria":"Bulgaria","croatia":"Croatia","serbia":"Serbia","slovakia":"Slovakia","slovenia":"Slovenia","ireland":"Ireland","iceland":"Iceland","luxembourg":"Luxembourg","estonia":"Estonia","latvia":"Latvia","lithuania":"Litva","belarus":"Belarus","cuba":"Cuba","venezuela":"Venezuela","ecuador":"Ecuador","uruguay":"Uruguay","bolivia":"Bolivia","paraguay":"Paraguay","morocco":"Maroc","algeria":"Algérie","tunisia":"Tunisia","ethiopia":"Ethiopia","ghana":"Ghana","tanzania":"Tanzania","uganda":"Uganda","angola":"Angola","mozambique":"Mozambique","zimbabwe":"Zimbabwe","afghanistan":"Afghanistan","syria":"Syria","jordan":"Jordan","lebanon":"Liban","kuwait":"Kuwait","oman":"Oman","bahrain":"Bahrain","yemen":"Yemen","brunei":"Brunei","east timor":"Đông Timor","timor-leste":"Đông Timor","fiji":"Fiji","papua new guinea":"Papua New Guinea"};
const viCountry=n=>{const k=normKey(n);return VI_COUNTRY[k]||String(n||"").trim();};

// CSV parser mini (quote-aware)
function parseCsv(text){
  const rows=[];let row=[],cur="",inQ=false;
  for(let i=0;i<text.length;i++){const ch=text[i];
    if(inQ){ if(ch==='"'){ if(text[i+1]==='"'){cur+='"';i++;} else inQ=false; } else cur+=ch; }
    else if(ch==='"')inQ=true;
    else if(ch===","){row.push(cur);cur="";}
    else if(ch==="\n"){row.push(cur);cur="";if(row.length>1||row[0]!=="")rows.push(row);row=[];}
    else if(ch!=="\r")cur+=ch;
  }
  if(cur!==""||row.length){row.push(cur);rows.push(row);}
  return rows;
}

async function ingestOpenDatasets(){
  let total=0;
  const log=(s,n)=>{console.log(`[datasets] ${s}: ${n}`);total+=n;};

  // 1) THÀNH PHỐ THẾ GIỚI (~26k) — datasets/world-cities (PDDL)
  try{
    const rows=parseCsv(await fetchText("https://raw.githubusercontent.com/datasets/world-cities/main/data/world-cities.csv"));
    const out=[];
    for(let i=1;i<rows.length;i++){const [city,country,sub,gid]=rows[i];
      if(!city||!gid)continue;
      out.push({type:"thanh-pho",source:"world-cities",ext_key:gid,name:city,
        url:"https://www.geonames.org/"+gid,category:"Thành phố",subcategory:sub||"",
        region:viCountry(country),oneliner:`Thành phố thuộc ${sub||viCountry(country)}`,
        description:`Thành phố ${city}, ${sub?sub+", ":""}${viCountry(country)} (GeoNames ${gid}).`});
      if(out.length>=5000){ingestRows(out);out.length=0;}
    }
    ingestRows(out);
    log("thanh-pho",db.prepare("SELECT count(*) n FROM items WHERE type='thanh-pho'").get().n);
  }catch(e){console.error("[datasets] cities lỗi",e.message);}

  // 2) ĐẠI HỌC THẾ GIỚI (~10k) — Hipo/university-domains-list (MIT)
  try{
    const arr=await fetchJson("https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json");
    const out=[];
    for(const u of arr){
      if(!u.name)continue;
      out.push({type:"giao-duc",source:"university-domains",ext_key:(u.domains&&u.domains[0])||u.name,
        name:u.name,url:(u.web_pages&&u.web_pages[0])||"",category:"Đại học",
        subcategory:u["state-province"]||"",region:viCountry(u.country),
        oneliner:`Đại học tại ${viCountry(u.country)}`,
        description:`${u.name} — cơ sở giáo dục đại học tại ${u["state-province"]?u["state-province"]+", ":""}${viCountry(u.country)}.${u.domains&&u.domains.length?" Tên miền: "+u.domains.join(", ")+".":""}`});
      if(out.length>=4000){ingestRows(out);out.length=0;}
    }
    ingestRows(out);
    log("giao-duc(đại học)",arr.length);
  }catch(e){console.error("[datasets] universities lỗi",e.message);}

  // 3) S&P 500 (~500 công ty niêm yết Mỹ) — datasets/s-and-p-500-companies (PD)
  try{
    const rows=parseCsv(await fetchText("https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv"));
    const h=rows[0].map(x=>x.toLowerCase());
    const ix=k=>h.findIndex(c=>c.includes(k));
    const iSym=ix("symbol"),iName=ix("security"),iSec=ix("sector"),iSub=ix("sub-industry"),iHq=ix("headquarters");
    const out=[];
    for(let i=1;i<rows.length;i++){const r=rows[i];if(!r[iName])continue;
      out.push({type:"company",source:"sp500",ext_key:"sp500-"+r[iSym],name:r[iName],
        url:"https://finance.yahoo.com/quote/"+r[iSym],category:viCat?viCat(r[iSec]||""):(r[iSec]||""),
        subcategory:r[iSub]||"",region:"Hoa Kỳ",batch:"S&P 500",
        oneliner:`S&P 500 · ${r[iSec]||""} · mã ${r[iSym]}`,
        description:`${r[iName]} (mã ${r[iSym]}) — công ty trong chỉ số S&P 500, ngành ${r[iSec]||""}${r[iSub]?" / "+r[iSub]:""}${iHq>=0&&r[iHq]?", trụ sở "+r[iHq]:""}.`});
    }
    ingestRows(out);log("company(S&P500)",out.length);
  }catch(e){console.error("[datasets] sp500 lỗi",e.message);}

  // 4) QUỐC GIA GIÀU THÔNG TIN (250) + GDP + DÂN SỐ — mledoze/countries (ODbL) + datasets/gdp,population (PD)
  try{
    const gdp=new Map(),pop=new Map();
    try{const g=parseCsv(await fetchText("https://raw.githubusercontent.com/datasets/gdp/main/data/gdp.csv"));
      for(let i=1;i<g.length;i++){const[cn,code,yr,v]=g[i];if(code&&v)gdp.set(code,{y:yr,v:Number(v)});}}catch(e){}
    try{const p=parseCsv(await fetchText("https://raw.githubusercontent.com/datasets/population/main/data/population.csv"));
      for(let i=1;i<p.length;i++){const[cn,code,yr,v]=p[i];if(code&&v)pop.set(code,{y:yr,v:Number(v)});}}catch(e){}
    const cs=await fetchJson("https://raw.githubusercontent.com/mledoze/countries/master/countries.json");
    const out=[];
    for(const c of cs){
      const en=c.name&&c.name.common;if(!en)continue;
      const vi=viCountry(en);
      const cap=(c.capital||[]).join(", ");
      const cur=Object.values(c.currencies||{}).map(x=>x.name).join(", ");
      const lang=Object.values(c.languages||{}).join(", ");
      const g=gdp.get(c.cca3),p=pop.get(c.cca3);
      const desc=[`${vi} (${en}) — quốc gia thuộc ${c.subregion||c.region||""}.`,
        cap?`Thủ đô: ${cap}.`:"",`Diện tích: ${(c.area||0).toLocaleString("vi")} km².`,
        p?`Dân số (${p.y}): ${p.v.toLocaleString("vi")}.`:"",
        g?`GDP (${g.y}): ${(g.v/1e9).toFixed(1)} tỷ USD.`:"",
        cur?`Tiền tệ: ${cur}.`:"",lang?`Ngôn ngữ: ${lang}.`:"",
        `Mã: ${c.cca2}/${c.cca3}.`].filter(Boolean).join(" ");
      out.push({type:"quoc-gia",source:"mledoze-countries",ext_key:normKey(vi),name:vi,
        url:"https://vi.wikipedia.org/wiki/"+encodeURIComponent(vi),category:"Quốc gia/Vùng",
        subcategory:c.subregion||c.region||"",region:c.region||"",
        oneliner:`${c.subregion||c.region||""}${cap?" · thủ đô "+cap:""}${g?" · GDP "+(g.v/1e9).toFixed(0)+" tỷ USD":""}`,
        description:desc,logo:c.flags&&(c.flags.png||c.flags.svg)||""});
    }
    ingestRows(out);log("quoc-gia(enrich)",out.length);
  }catch(e){console.error("[datasets] countries lỗi",e.message);}

  // 5) NOBEL (~1000 nhân vật) — api.nobelprize.org (CC0)
  try{
    const j=await fetchJson("https://api.nobelprize.org/v1/laureate.json");
    const CATVI={physics:"Vật lý",chemistry:"Hóa học",medicine:"Y học",peace:"Hòa bình",literature:"Văn học",economics:"Kinh tế"};
    const out=[];
    for(const l of (j.laureates||[])){
      const name=[l.firstname,l.surname].filter(Boolean).join(" ");if(!name)continue;
      const prizes=(l.prizes||[]).map(p=>`Nobel ${CATVI[p.category]||p.category} ${p.year}`).join(", ");
      out.push({type:"nhan-vat",source:"nobelprize",ext_key:"nobel-"+l.id,name,
        url:"https://www.nobelprize.org/laureate/"+l.id,category:"Nobel",
        subcategory:(l.prizes&&l.prizes[0]&&(CATVI[l.prizes[0].category]||l.prizes[0].category))||"",
        region:viCountry(l.bornCountry||""),year:Number(l.prizes&&l.prizes[0]&&l.prizes[0].year)||null,
        oneliner:prizes,description:`${name} — ${prizes}.${l.born&&l.born!=="0000-00-00"?" Sinh "+l.born+(l.bornCountry?" tại "+l.bornCountry:"")+".":""}${l.prizes&&l.prizes[0]&&l.prizes[0].motivation?" Lý do: "+l.prizes[0].motivation.replace(/"/g,""):""}`});
    }
    ingestRows(out);log("nhan-vat(Nobel)",out.length);
  }catch(e){console.error("[datasets] nobel lỗi",e.message);}

  rebuildFts();
  console.log("[datasets] XONG — thêm/ cập nhật ~"+total+" bản ghi. Tổng items:",db.prepare("SELECT count(*) n FROM items").get().n);
  return total;
}
// ═══════ HẾT NẠP DATASET THẬT ═══════

// ═══════ NẠP DATASET THẬT — ĐỢT 2 (awesome-public-datasets) ═══════
// OpenFlights sân bay (ODbL) · NASDAQ/NYSE niêm yết (PD) · tiền tệ ISO-4217 (PD)
// · World Bank chỉ số nông nghiệp/hạ tầng (CC BY-4.0, enrich quốc gia).
async function ingestOpenDatasets2(){
  let total=0;
  const log=(s,n)=>{console.log(`[datasets2] ${s}: ${n}`);total+=n;};

  // 1) SÂN BAY thế giới (~7.7k) — jpatokal/openflights
  try{
    const rows=parseCsv(await fetchText("https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat"));
    const out=[];
    for(const r of rows){
      const [oid,name,city,country,iata]=[r[0],r[1],r[2],r[3],r[4]];
      const typ=r[12]||"airport";
      if(!name||typ!=="airport")continue;
      out.push({type:"san-bay",source:"openflights",ext_key:"of-"+oid,name,
        url:"https://www.google.com/maps?q="+r[6]+","+r[7],category:"Sân bay",
        subcategory:city||"",region:viCountry(country),
        oneliner:`Sân bay tại ${city||viCountry(country)}${iata&&iata!=="\\N"?" · mã "+iata:""}`,
        description:`${name} — sân bay tại ${city?city+", ":""}${viCountry(country)}.${iata&&iata!=="\\N"?" Mã IATA: "+iata+".":""}${r[5]&&r[5]!=="\\N"?" ICAO: "+r[5]+".":""} Tọa độ: ${r[6]}, ${r[7]}.`});
      if(out.length>=4000){ingestRows(out);out.length=0;}
    }
    ingestRows(out);
    log("san-bay",db.prepare("SELECT count(*) n FROM items WHERE type='san-bay'").get().n);
  }catch(e){console.error("[datasets2] airports lỗi",e.message);}

  // 2) CÔNG TY NIÊM YẾT MỸ — NASDAQ + NYSE (datasets/*, PD). Bỏ ETF/quỹ.
  try{
    let n=0;
    for(const [src,url,batch] of [
      ["nasdaq","https://raw.githubusercontent.com/datasets/nasdaq-listings/main/data/nasdaq-listed.csv","NASDAQ"],
      ["nyse","https://raw.githubusercontent.com/datasets/nyse-other-listings/main/data/nyse-listed.csv","NYSE"]]){
      const rows=parseCsv(await fetchText(url));
      const out=[];
      for(let i=1;i<rows.length;i++){
        const sym=(rows[i][0]||"").trim(),nm=(rows[i][1]||"").trim();
        if(!sym||!nm)continue;
        if(/\bETF\b|\bFund\b|\bETN\b/i.test(nm))continue;
        out.push({type:"company",source:src,ext_key:src+"-"+sym,name:nm.replace(/ - Common Stock.*| Common Stock.*/i,""),
          url:"https://finance.yahoo.com/quote/"+encodeURIComponent(sym),category:"Niêm yết Mỹ",
          subcategory:"",region:"Hoa Kỳ",batch,
          oneliner:`${batch} · mã ${sym}`,
          description:`${nm} — công ty niêm yết sàn ${batch} (Hoa Kỳ), mã chứng khoán ${sym}.`});
        if(out.length>=3000){ingestRows(out);n+=out.length;out.length=0;}
      }
      ingestRows(out);n+=out.length;
    }
    log("company(NASDAQ+NYSE)",n);
  }catch(e){console.error("[datasets2] listings lỗi",e.message);}

  // 3) TIỀN TỆ ISO-4217 đang lưu hành — datasets/currency-codes
  try{
    const rows=parseCsv(await fetchText("https://raw.githubusercontent.com/datasets/currency-codes/main/data/codes-all.csv"));
    const h=rows[0].map(x=>x.toLowerCase());
    const iE=h.findIndex(c=>c.includes("entity")),iC=h.findIndex(c=>c.includes("currency")),
      iA=h.findIndex(c=>c.includes("alphabetic")),iW=h.findIndex(c=>c.includes("withdrawal"));
    const out=[];
    for(let i=1;i<rows.length;i++){const r=rows[i];
      if(!r[iC]||!r[iA]||(iW>=0&&r[iW]&&r[iW].trim()))continue; // bỏ tiền đã khai tử
      const ent=r[iE]||"";
      out.push({type:"tien-te",source:"iso4217",ext_key:r[iA]+"|"+normKey(ent),
        name:`${r[iC]} (${r[iA]})`,url:"https://vi.wikipedia.org/wiki/ISO_4217",
        category:"Tiền tệ",subcategory:r[iA],region:viCountry(ent.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase())),
        oneliner:`Tiền tệ của ${viCountry(ent.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()))}`,
        description:`${r[iC]} — mã ISO 4217: ${r[iA]}, lưu hành tại ${ent}.`});
    }
    ingestRows(out);log("tien-te",out.length);
  }catch(e){console.error("[datasets2] currency lỗi",e.message);}

  // 4) WORLD BANK — chỉ số nông nghiệp & hạ tầng 2022 (CC BY-4.0) → enrich quốc gia
  try{
    // map cca3 → id quốc gia (parse "Mã: XX/YYY." trong description mledoze)
    const cIdx=new Map();
    for(const r of db.prepare("SELECT id,description FROM items WHERE type='quoc-gia' AND source='mledoze-countries'").all()){
      const m=/Mã: [A-Z]{2}\/([A-Z]{3})\./.exec(r.description||"");
      if(m)cIdx.set(m[1],r.id);
    }
    const IND=[
      ["AG.PRD.CREL.MT","Sản lượng ngũ cốc",v=>`${Math.round(v/1000).toLocaleString("vi")} nghìn tấn`],
      ["AG.LND.AGRI.ZS","Đất nông nghiệp",v=>v.toFixed(1)+"% diện tích"],
      ["IT.NET.USER.ZS","Dùng Internet",v=>v.toFixed(1)+"% dân số"],
      ["SP.URB.TOTL.IN.ZS","Đô thị hóa",v=>v.toFixed(1)+"%"],
    ];
    const enrich=new Map(); // id → [chuỗi]
    for(const [code,label,fmt] of IND){
      const j=await fetchJson(`https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&date=2022&per_page=350`);
      for(const row of (j[1]||[])){
        if(row.value==null)continue;
        const id=cIdx.get(row.countryiso3code);
        if(!id)continue;
        (enrich.get(id)||enrich.set(id,[]).get(id)).push(`${label} (2022): ${fmt(Number(row.value))}`);
      }
    }
    const upd=db.prepare("UPDATE items SET description=? WHERE id=?");
    let n=0;
    const tx=db.transaction(()=>{
      for(const [id,parts] of enrich){
        const cur=db.prepare("SELECT description FROM items WHERE id=?").get(id);
        if(!cur)continue;
        let desc=cur.description||"";
        if(desc.includes("Sản lượng ngũ cốc"))continue; // idempotent
        upd.run(desc+" "+parts.join(". ")+".",id);n++;
      }
    });
    tx();
    log("quoc-gia+WorldBank",n);
  }catch(e){console.error("[datasets2] worldbank lỗi",e.message);}

  rebuildFts();
  console.log("[datasets2] XONG — ~"+total+" bản ghi. Tổng items:",db.prepare("SELECT count(*) n FROM items").get().n);
  return total;
}
// ═══════ HẾT ĐỢT 2 ═══════

// ═══════ ĐỒNG BỘ TRI THỨC SOLOCEO (v9) ═══════
// Toàn bộ hệ điều hành thành nốt chuẩn hoá: nền tảng PaaS, 100 dự án AI,
// mô hình KD, khoá học, dịch vụ hệ sinh thái — nối vào nốt gốc "SoloCEO OS".
async function ingestSoloceo(){
  let total=0;
  const log=(s,n)=>{console.log(`[soloceo] ${s}: ${n}`);total+=n;};

  // Nốt gốc hệ điều hành
  upsertMany([{type:"soloceo-dich-vu",source:"soloceo",ext_key:"soloceo-os",name:"SoloCEO OS",
    url:"https://soloceo.vn",category:"Hệ điều hành",region:"Việt Nam",top:1,
    oneliner:"Hệ điều hành cho doanh nghiệp một người — một người + Đội AI vận hành trọn doanh nghiệp",
    description:"SoloCEO OS — hệ điều hành để một Solo CEO khởi tạo, vận hành và bán lại doanh nghiệp: Đội AI làm thay việc cả công ty, đứng trên 100+ nền tảng mã nguồn mở, thanh toán đo được (PayOS/Stripe) và sàn M&A doanh thu đã xác thực."}]);

  // 1) NỀN TẢNG PaaS (catalog LIVE ~104-146)
  try{
    const j=await fetchJson("https://platform.soloceo.vn/paas-catalog.php");
    const out=(j.platforms||[]).map(p=>({
      type:"soloceo-nen-tang",source:"soloceo-paas",ext_key:p.slug||String(p.id),
      name:p.name,url:p.demoUrl||"https://platform.soloceo.vn",
      category:p.category||"Nền tảng",subcategory:p.categorySlug||"",region:"SoloCEO",
      score:Number(p.priceVnd)||0,status:p.demoUrl?"demo LIVE":"",
      oneliner:`${p.category||""}${p.priceVnd?" · "+Number(p.priceVnd).toLocaleString("vi")+"đ/tháng":""}${p.demoUrl?" · demo LIVE":""}`,
      description:p.description||p.name}));
    ingestRows(out);log("nen-tang",out.length);
  }catch(e){console.error("[soloceo] paas lỗi",e.message);}

  // 2) 100 DỰ ÁN AI VẬN HÀNH SẴN (marketplace LIVE)
  try{
    const arr=await fetchJson("https://api.soloceo.vn/v1/marketplace/project-templates");
    const out=(Array.isArray(arr)?arr:[]).map(p=>({
      type:"soloceo-du-an",source:"soloceo-marketplace",ext_key:p.slug||p.id,
      name:p.name,url:"https://soloceo.vn/workspace/marketplace",
      category:p.industry||"Dự án AI",region:"SoloCEO",
      oneliner:(p.summary||"").slice(0,150),description:p.summary||p.name}));
    ingestRows(out);log("du-an",out.length);
  }catch(e){console.error("[soloceo] marketplace lỗi",e.message);}

  rebuildFts();
  console.log("[soloceo] XONG (nguồn live) ~"+total+". Tổng:",db.prepare("SELECT count(*) n FROM items").get().n);
  return total;
}

// Import hàng loạt (mô hình KD / khoá học / tài liệu xuất từ các node khác)
app.post("/api/admin/import",express.json({limit:"25mb"}),(req,res)=>{
  if((req.query.token||"")!==REFRESH_TOKEN)return res.status(403).json({error:"token sai"});
  const arr=Array.isArray(req.body)?req.body:(req.body&&req.body.items)||[];
  if(!arr.length)return res.status(400).json({error:"Thiếu items[]"});
  let ok=0;
  for(let i=0;i<arr.length;i+=2000){ingestRows(arr.slice(i,i+2000));ok+=Math.min(2000,arr.length-i);}
  rebuildFts();
  res.json({ok:true,nhan:ok,tong:db.prepare("SELECT count(*) n FROM items").get().n});
});
// ═══════ HẾT ĐỒNG BỘ SOLOCEO ═══════

// ═══════════════ MẠNG TRI THỨC (Knowledge Graph) — v4 ═══════════════
// Mỗi sự vật/hiện tượng là một NỐT (items). Quan hệ là CẠNH (edges).
// Nguyên lý "6 bậc quan hệ": từ nốt bạn quen, lần theo cạnh để tới nốt cần gặp.
db.exec(`
CREATE TABLE IF NOT EXISTS edges (
  id INTEGER PRIMARY KEY,
  src INTEGER NOT NULL, dst INTEGER NOT NULL,
  rel TEXT NOT NULL, weight REAL DEFAULT 1,
  nguon TEXT DEFAULT '', updated_at TEXT,
  UNIQUE(src,dst,rel)
);
CREATE INDEX IF NOT EXISTS idx_edge_src ON edges(src);
CREATE INDEX IF NOT EXISTS idx_edge_dst ON edges(dst);
`);
const edgeIns=db.prepare(`INSERT OR IGNORE INTO edges(src,dst,rel,weight,nguon,updated_at) VALUES(?,?,?,?,?,?)`);
const edgeMany=db.transaction(rows=>{for(const r of rows)edgeIns.run(r[0],r[1],r[2],r[3],r[4],nowIso());});
const normKey=s=>String(s||"").toLowerCase().normalize("NFC").replace(/\s+/g," ").trim();

// Nốt trục (hub): lĩnh vực & quốc gia — cầu nối để mọi nốt cùng ngành/cùng vùng gặp nhau
function ensureHub(type,name){
  const ek=normKey(name); if(!ek) return null;
  const r0=db.prepare("SELECT id FROM items WHERE type=? AND ext_key=?").get(type,ek);
  if(r0) return r0.id; // đã có (kể cả bản enrich) — KHÔNG ghi đè
  upsertMany([{type,source:"graph-hub",ext_key:ek,name:String(name).trim(),category:type==="linh-vuc"?"Lĩnh vực":"Quốc gia/Vùng",oneliner:type==="linh-vuc"?"Nốt trục lĩnh vực — nơi các công ty cùng ngành gặp nhau":"Nốt trục vùng — nơi các thực thể cùng khu vực gặp nhau"}]);
  const r=db.prepare("SELECT id FROM items WHERE type=? AND ext_key=?").get(type,ek);
  return r?r.id:null;
}

function buildGraph(){
  const t0=Date.now();
  let n=0;
  // 1) người —[sáng lập/điều hành]→ công ty (match founder.subcategory = tên công ty)
  const compByName=new Map();
  for(const r of db.prepare("SELECT id,name FROM items WHERE type IN ('company','startup')").all())
    compByName.set(normKey(r.name),r.id);
  const batch=[];
  for(const p of db.prepare("SELECT id,type,subcategory FROM items WHERE type IN ('founder','ceo','nhan-vat') AND subcategory!=''").all()){
    const cid=compByName.get(normKey(p.subcategory));
    if(cid){batch.push([p.id,cid,p.type==="ceo"?"điều hành":"sáng lập",3,"wikidata"]);n++;}
  }
  edgeMany(batch);batch.length=0;
  // 2) công ty/startup —[hoạt động trong]→ lĩnh vực (hub)
  const hubCache=new Map();
  const hub=(t,name)=>{const k=t+"|"+normKey(name);if(!hubCache.has(k))hubCache.set(k,ensureHub(t,name));return hubCache.get(k);};
  for(const r of db.prepare("SELECT id,category FROM items WHERE type IN ('company','startup','soloceo-nen-tang','soloceo-du-an','soloceo-mo-hinh','soloceo-khoa-hoc','soloceo-dich-vu') AND category!='' AND category!='Khác'").all()){
    const h=hub("linh-vuc",r.category); if(h){batch.push([r.id,h,"hoạt động trong",1,"derived"]);n++;}
    if(batch.length>4000){edgeMany(batch);batch.length=0;}
  }
  edgeMany(batch);batch.length=0;
  // 3) mọi nốt có region —[tại]→ quốc gia/vùng (hub); nếu region trùng tên một dia-phuong → nối thẳng
  const dpByName=new Map();
  for(const r of db.prepare("SELECT id,name FROM items WHERE type='dia-phuong'").all())
    dpByName.set(normKey(r.name),r.id);
  for(const r of db.prepare("SELECT id,type,region FROM items WHERE region!='' AND type NOT IN ('linh-vuc','quoc-gia')").all()){
    const dp=dpByName.get(normKey(r.region));
    if(dp&&dp!==r.id){batch.push([r.id,dp,"thuộc vùng",2,"derived"]);n++;}
    else{const h=hub("quoc-gia",r.region); if(h&&h!==r.id){batch.push([r.id,h,"tại",0.5,"derived"]);n++;}}
    if(batch.length>4000){edgeMany(batch);batch.length=0;}
  }
  edgeMany(batch);batch.length=0;
  // 4) đặc sản/du lịch/tài nguyên VN —[gắn với]→ địa phương nhắc trong tên/mô tả
  for(const r of db.prepare("SELECT id,name,description FROM items WHERE type IN ('dac-san','du-lich','tai-nguyen')").all()){
    const hay=normKey(r.name+" "+(r.description||""));
    for(const [dn,did] of dpByName){
      if(dn.length>4&&hay.includes(dn)){batch.push([r.id,did,"gắn với",2,"derived"]);n++;break;}
    }
    if(batch.length>4000){edgeMany(batch);batch.length=0;}
  }
  edgeMany(batch);batch.length=0;
  // 5) hệ sinh thái SoloCEO — mọi nốt soloceo-* nối nốt gốc "SoloCEO OS"
  const root=db.prepare("SELECT id FROM items WHERE type='soloceo-dich-vu' AND ext_key='soloceo-os'").get();
  if(root){
    for(const r of db.prepare("SELECT id FROM items WHERE type LIKE 'soloceo-%' AND id!=?").all(root.id)){
      batch.push([r.id,root.id,"thuộc hệ sinh thái",2.5,"soloceo"]);n++;
      if(batch.length>4000){edgeMany(batch);batch.length=0;}
    }
  }
  edgeMany(batch);
  rebuildFts();
  const tot=db.prepare("SELECT count(*) n FROM edges").get().n;
  console.log(`[graph] dựng xong ${n} cạnh mới, tổng ${tot} cạnh, ${((Date.now()-t0)/1000).toFixed(1)}s`);
  return {them:n,tong:tot};
}

// Hàng xóm của 1 nốt (2 chiều), ưu tiên cạnh mạnh, chặn nốt trục quá đông
const qNb=db.prepare(`SELECT e.dst AS nid,e.rel,e.weight,0 AS rev FROM edges e WHERE e.src=?
  UNION ALL SELECT e.src,e.rel,e.weight,1 FROM edges e WHERE e.dst=? ORDER BY weight DESC LIMIT ?`);
function neighbors(id,cap){return qNb.all(id,id,cap||200);}

// BFS tìm đường ngắn nhất giữa 2 nốt (tối đa 6 bậc — "six degrees")
function findPath(from,to,maxDepth){
  maxDepth=Math.min(maxDepth||6,6);
  if(from===to)return [{id:from}];
  const prev=new Map([[from,null]]);
  let frontier=[from],visited=1;
  for(let d=0;d<maxDepth&&frontier.length;d++){
    const next=[];
    for(const cur of frontier){
      for(const nb of neighbors(cur,200)){
        if(prev.has(nb.nid))continue;
        prev.set(nb.nid,{p:cur,rel:nb.rel,rev:nb.rev});
        if(nb.nid===to){ // dựng lại đường
          const path=[];let c=to;
          while(c!=null){const m=prev.get(c);path.push({id:c,rel:m&&m.rel,rev:m&&m.rev});c=m?m.p:null;}
          return path.reverse();
        }
        next.push(nb.nid);
        if(++visited>60000)return null;
      }
    }
    frontier=next;
  }
  return null;
}
const nodeInfo=db.prepare("SELECT id,type,name,oneliner,category,region,logo FROM items WHERE id=?");

app.get("/api/graph/stats",(req,res)=>{
  const tot=db.prepare("SELECT count(*) n FROM edges").get().n;
  const byRel=db.prepare("SELECT rel,count(*) n FROM edges GROUP BY rel ORDER BY n DESC").all();
  const hubs=db.prepare("SELECT count(*) n FROM items WHERE type IN ('linh-vuc','quoc-gia')").get().n;
  res.json({canh:tot,theo_quan_he:byRel,not_truc:hubs});
});

app.get("/api/graph/node/:id",(req,res)=>{
  const it=nodeInfo.get(req.params.id);
  if(!it)return res.status(404).json({error:"Không có nốt này"});
  const groups={};
  for(const nb of neighbors(it.id,300)){
    const o=nodeInfo.get(nb.nid); if(!o)continue;
    const key=nb.rev?("← "+nb.rel):(nb.rel+" →");
    (groups[key]=groups[key]||[]).push({...o,weight:nb.weight});
  }
  for(const k of Object.keys(groups))groups[k]=groups[k].slice(0,40);
  res.json({not:it,bac:Object.values(groups).reduce((s,a)=>s+a.length,0),lien_ket:groups});
});

app.get("/api/graph/path",(req,res)=>{
  const from=Number(req.query.from),to=Number(req.query.to);
  if(!from||!to)return res.status(400).json({error:"Cần from & to (id nốt)"});
  const p=findPath(from,to,Number(req.query.depth)||6);
  if(!p)return res.json({thay:false,thong_bao:"Chưa tìm thấy đường trong ≤6 bậc — hai nốt chưa nối qua dữ liệu hiện có."});
  res.json({thay:true,so_bac:p.length-1,duong:p.map(s=>({...nodeInfo.get(s.id),rel:s.rel,rev:s.rev}))});
});

// AI LỘ TRÌNH: mục tiêu → nốt liên quan thật trong đồ thị → kế hoạch tiếp cận từng bước
app.post("/api/lo-trinh",async(req,res)=>{
  try{
    const goal=String((req.body||{}).muc_tieu||"").slice(0,400);
    if(!goal)return res.status(400).json({error:"Thiếu mục tiêu"});
    const ftq=goal.replace(/[^\p{L}\p{N} ]/gu," ").split(/\s+/).filter(w=>w.length>2).slice(0,8).join(" OR ");
    const pick=(sql,...a)=>{try{return db.prepare(sql).all(...a);}catch(e){return [];}};
    const hits=[
      ...pick(`SELECT i.id,i.type,i.name,i.oneliner,i.region FROM items_fts f JOIN items i ON i.id=f.rowid
        WHERE items_fts MATCH ? AND i.type IN ('company','startup') AND i.region='Việt Nam' LIMIT 8`,ftq),
      ...pick(`SELECT i.id,i.type,i.name,i.oneliner,i.region FROM items_fts f JOIN items i ON i.id=f.rowid
        WHERE items_fts MATCH ? AND i.type IN ('dia-phuong','dac-san','tai-nguyen','du-lich') LIMIT 8`,ftq),
      ...pick(`SELECT i.id,i.type,i.name,i.oneliner,i.region FROM items_fts f JOIN items i ON i.id=f.rowid
        WHERE items_fts MATCH ? AND i.type IN ('company','startup','founder','ceo','dataset','nganh-vsic') LIMIT 10`,ftq),
    ];
    const seen=new Set(),nodes=[];
    for(const h of hits){if(!seen.has(h.id)){seen.add(h.id);nodes.push(h);}}
    const ctx=nodes.slice(0,22).map(nd=>{
      const nb=neighbors(nd.id,6).map(x=>{const o=nodeInfo.get(x.nid);return o?`${x.rel}: ${o.name} (#${o.id}, ${o.type})`:null;}).filter(Boolean).slice(0,5);
      return `#${nd.id} [${nd.type}] ${nd.name}${nd.region?" · "+nd.region:""} — ${nd.oneliner||""}${nb.length?"\n   liên kết: "+nb.join(" | "):""}`;
    }).join("\n");
    const plan=await llmChat(
`Bạn là cố vấn chiến lược của SoloCEO, dùng MẠNG TRI THỨC (mỗi thực thể là một nốt #id, liên kết là cạnh).
MỤC TIÊU của CEO: "${goal}"
CÁC NỐT THẬT liên quan trong đồ thị:
${ctx||"(chưa có nốt khớp — trả lời theo hiểu biết chung, ghi rõ là chưa có dữ liệu nội bộ)"}

Lập KẾ HOẠCH TIẾP CẬN TỪNG BƯỚC (tối đa 7 bước, tiếng Việt, thực dụng):
1. Chọn vùng/nguồn lực tốt nhất (dẫn nốt #id nếu có), vì sao.
2. Công ty/mô hình đã làm thành công để học hỏi (dẫn nốt #id).
3. Cần quen AI — và đi qua đường quan hệ nào trong đồ thị để tới họ (nốt trung gian).
4-7. Hành động cụ thể tuần đầu → tháng đầu.
Nguyên tắc: chỉ dẫn #id có trong danh sách; không bịa số liệu; nói rõ chỗ nào cần CEO tự xác minh.`,1400);
    res.json({muc_tieu:goal,ke_hoach:plan,not_lien_quan:nodes.slice(0,22)});
  }catch(e){res.status(500).json({error:e.message});}
});

// Helper LLM dùng chung cho mạng tri thức
async function llmChat(prompt,maxTokens){
  if(!LLM_KEY)return "(Chưa cấu hình LLM_API_KEY)";
  const r=await fetch(`${LLM_BASE}/chat/completions`,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${LLM_KEY}`},
    body:JSON.stringify({model:LLM_MODEL,messages:[{role:"user",content:prompt}],temperature:0.35,max_tokens:maxTokens||1200})});
  const j=await r.json();
  return (j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||("(LLM lỗi: "+JSON.stringify(j).slice(0,160)+")");
}

// Dựng đồ thị qua endpoint có token (cron/gọi tay), + tự dựng lần đầu khi trống
let graphBuilding=false;
app.get("/api/admin/build-graph",(req,res)=>{
  if((req.query.token||"")!==REFRESH_TOKEN)return res.status(403).json({error:"token sai"});
  if(graphBuilding)return res.json({status:"đang chạy"});
  graphBuilding=true;res.json({status:"bắt đầu"});
  setImmediate(()=>{try{buildGraph();}catch(e){console.error("build-graph lỗi",e.message);}finally{graphBuilding=false;}});
});
try{
  if(db.prepare("SELECT count(*) n FROM edges").get().n===0){
    console.log("[graph] edges trống — dựng lần đầu…");
    setTimeout(()=>{try{buildGraph();}catch(e){console.error("graph boot lỗi",e.message);}},3000);
  }
}catch(e){}
// ═══════════════ HẾT MẠNG TRI THỨC ═══════════════


// ═══════ XƯỞNG Ý TƯỞNG (Idea Foundry) — v10 ═══════
// Data Engine bước 7-8-9: Phát hiện cơ hội → Đúc ý tưởng BMC → Kiểm chứng cộng đồng.
// Mỗi giờ đúc 1 ý tưởng khởi nghiệp ĐẦY ĐỦ (vấn đề → giải pháp → thị trường → BMC 9 khối)
// từ dữ liệu thật trong mạng tri thức, kèm căn cứ #id. CEO chấm sao + nhận thực thi.
db.exec(`
CREATE TABLE IF NOT EXISTS ideas (
  id INTEGER PRIMARY KEY,
  ten TEXT, nganh TEXT, tom_tat TEXT,
  van_de TEXT, giai_phap TEXT, thi_truong TEXT, vi_sao_bay_gio TEXT,
  bmc TEXT, can_cu TEXT, buoc_dau TEXT, soloceo_stack TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS idea_votes (
  id INTEGER PRIMARY KEY, idea_id INTEGER, voter TEXT, diem INTEGER, created_at TEXT,
  UNIQUE(idea_id, voter)
);
CREATE TABLE IF NOT EXISTS idea_execs (
  id INTEGER PRIMARY KEY, idea_id INTEGER, voter TEXT, ghi_chu TEXT, created_at TEXT,
  UNIQUE(idea_id, voter)
);
`);

function pickRand(sql,...a){const r=db.prepare(sql).all(...a);return r.length?r[Math.floor(Math.random()*r.length)]:null;}
function pickN(sql,n,...a){const r=db.prepare(sql).all(...a);const out=[];const used=new Set();
  while(out.length<Math.min(n,r.length)&&used.size<r.length){const i=Math.floor(Math.random()*r.length);if(!used.has(i)){used.add(i);out.push(r[i]);}}
  return out;}

// Bước 7 — PHÁT HIỆN CƠ HỘI: lấy "nguyên liệu" thật từ mạng tri thức
function mineOpportunity(){
  const linhVuc=pickRand(`SELECT i.id,i.name,(SELECT count(*) FROM edges e WHERE e.dst=i.id) deg
    FROM items i WHERE i.type='linh-vuc' ORDER BY deg DESC LIMIT 60`);
  const boiCanh=pickRand(`SELECT id,type,name,oneliner,description,region FROM items
    WHERE type IN ('dac-san','du-lich','dia-phuong','tai-nguyen','nganh-vsic','bat-dong-san') AND name!='' ORDER BY RANDOM() LIMIT 400`);
  const moHinh=pickRand(`SELECT id,name,oneliner,description FROM items WHERE type='soloceo-mo-hinh'`);
  const thanhCong=pickN(`SELECT id,name,oneliner,category,region FROM items
    WHERE type='startup' AND outcome='thanh-cong' AND oneliner!=''`,3);
  const nenTang=pickN(`SELECT id,name,oneliner,category FROM items WHERE type='soloceo-nen-tang'`,4);
  const khoaHoc=pickN(`SELECT id,name FROM items WHERE type='soloceo-khoa-hoc'`,3);
  const quocGia=db.prepare(`SELECT id,name,description FROM items WHERE type='quoc-gia' AND ext_key='việt nam'`).get();
  return {linhVuc,boiCanh,moHinh,thanhCong,nenTang,khoaHoc,quocGia};
}

// (v10 legacy — thay bằng generateIdea v11 có vòng lặp vấn đề)
async function generateIdeaLegacy(){
  const m=mineOpportunity();
  if(!m.boiCanh||!m.linhVuc)throw new Error("Thiếu nguyên liệu đồ thị");
  const nl=(x,lbl)=>x?`- ${lbl}: #${x.id} ${x.name}${x.oneliner?" — "+x.oneliner.slice(0,120):""}${x.description?" | "+String(x.description).slice(0,180):""}`:"";
  const ctx=[
    nl(m.linhVuc,"Lĩnh vực (nhiều DN hoạt động)"),
    nl(m.boiCanh,"Bối cảnh/tài nguyên Việt Nam"),
    nl(m.moHinh,"Mô hình kinh doanh SoloCEO tham khảo"),
    ...m.thanhCong.map(s=>nl(s,"Startup thành công tương tự")),
    ...m.nenTang.map(s=>nl(s,"Nền tảng SoloCEO có sẵn")),
    ...m.khoaHoc.map(s=>nl(s,"Khoá học SoloCEO")),
    m.quocGia?nl({id:m.quocGia.id,name:"Việt Nam",oneliner:"",description:m.quocGia.description},"Bối cảnh vĩ mô VN"):"",
  ].filter(Boolean).join("\n");
  const raw=await llmChat(
`Bạn là chuyên gia đúc ý tưởng khởi nghiệp cho SOLO CEO (doanh nghiệp 1 người + Đội AI) tại Việt Nam.
NGUYÊN LIỆU THẬT từ mạng tri thức (chỉ dùng cái phù hợp, không ép dùng hết; khi dùng phải dẫn #id):
${ctx}

Đúc MỘT ý tưởng kinh doanh THỰC TẾ, khả thi cho 1 người khởi đầu vốn < 100 triệu VNĐ. Trả về DUY NHẤT JSON (không markdown):
{"ten":"tên ý tưởng ngắn gọn có sức bán",
"nganh":"ngành chính",
"tom_tat":"2 câu bán ý tưởng",
"van_de":"vấn đề thị trường CỤ THỂ ai đang đau, dẫn #id căn cứ nếu có",
"giai_phap":"giải pháp + điểm khác biệt cho solo CEO",
"thi_truong":"quy mô/phân khúc mục tiêu tại VN, ước lượng thận trọng + nói rõ đây là ước lượng",
"vi_sao_bay_gio":"lý do thời điểm",
"bmc":{"phan_khuc_khach_hang":"...","gia_tri_cot_loi":"...","kenh_phan_phoi":"...","quan_he_khach_hang":"...","dong_doanh_thu":"...","nguon_luc_chinh":"...","hoat_dong_chinh":"...","doi_tac_chinh":"...","co_cau_chi_phi":"..."},
"buoc_dau":["3-5 bước tuần đầu, cụ thể"],
"soloceo_stack":["nền tảng/khoá học SoloCEO nên dùng, kèm #id"],
"can_cu":["các #id đã dùng làm căn cứ"]}
JSON hợp lệ, tiếng Việt, không bịa số liệu chính xác giả.`,2400);
  let j;
  try{j=JSON.parse(raw.replace(/^```json?\s*/i,"").replace(/```\s*$/,"").trim());}
  catch(e){throw new Error("LLM trả JSON hỏng: "+raw.slice(0,120));}
  if(!j.ten||!j.bmc)throw new Error("Thiếu ten/bmc");
  // chống trùng tên gần giống
  const dup=db.prepare("SELECT id FROM ideas WHERE lower(ten)=lower(?)").get(j.ten);
  if(dup)throw new Error("Trùng ý tưởng: "+j.ten);
  const info=db.prepare(`INSERT INTO ideas(ten,nganh,tom_tat,van_de,giai_phap,thi_truong,vi_sao_bay_gio,bmc,can_cu,buoc_dau,soloceo_stack,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    j.ten,j.nganh||"",j.tom_tat||"",j.van_de||"",j.giai_phap||"",j.thi_truong||"",j.vi_sao_bay_gio||"",
    JSON.stringify(j.bmc),JSON.stringify(j.can_cu||[]),JSON.stringify(j.buoc_dau||[]),JSON.stringify(j.soloceo_stack||[]),nowIso());
  // hoà vào mạng tri thức
  upsertMany([{type:"soloceo-y-tuong",source:"idea-foundry",ext_key:"idea-"+info.lastInsertRowid,
    name:j.ten,url:"https://bigdata.soloceo.vn/#idea-"+info.lastInsertRowid,
    category:j.nganh||"Ý tưởng",region:"SoloCEO",oneliner:(j.tom_tat||"").slice(0,150),
    description:`${j.van_de||""} Giải pháp: ${j.giai_phap||""}`}]);
  rebuildFts();
  console.log("[idea] đúc xong #"+info.lastInsertRowid+": "+j.ten);
  return {id:info.lastInsertRowid,ten:j.ten};
}

// Bước 9 — KIỂM CHỨNG CỘNG ĐỒNG: vote + nhận thực thi
function ideaStats(row){
  const v=db.prepare("SELECT count(*) n, COALESCE(AVG(diem),0) a FROM idea_votes WHERE idea_id=?").get(row.id);
  const e=db.prepare("SELECT count(*) n FROM idea_execs WHERE idea_id=?").get(row.id);
  return {...row,bmc:undefined,so_vote:v.n,diem_tb:Math.round(v.a*10)/10,so_thuc_thi:e.n};
}
function voterOf(req){
  const t=String(req.headers["x-voter"]||req.query.voter||"").slice(0,80);
  if(t)return "u:"+t;
  const ip=String(req.headers["x-forwarded-for"]||req.socket.remoteAddress||"").split(",")[0].trim();
  return "ip:"+ip;
}

// ═══════ VÒNG LẶP PHÁT HIỆN VẤN ĐỀ (Problem Discovery Loop) — v11 ═══════
// Máy liên tục quét dữ liệu (tin tức, công nghệ, ngành VSIC, địa phương, BĐS, đặc sản)
// để tìm VẤN ĐỀ thị trường/khách hàng có thật → xếp backlog theo độ đau →
// Xưởng ý tưởng đúc ý tưởng GIẢI ĐÚNG vấn đề, ghép mô hình KD + nền tảng SoloCEO.
db.exec(`
CREATE TABLE IF NOT EXISTS problems (
  id INTEGER PRIMARY KEY,
  tieu_de TEXT, mo_ta TEXT, khach_hang TEXT, nganh TEXT,
  do_dau INTEGER DEFAULT 5, can_cu TEXT,
  trang_thai TEXT DEFAULT 'moi', idea_id INTEGER,
  created_at TEXT
);
`);
try{db.exec("ALTER TABLE ideas ADD COLUMN problem_id INTEGER");}catch(e){}

let probGenBusy=false;
async function mineProblemsV11(){
  // Nguyên liệu quét: tín hiệu mới + bối cảnh VN + năng lực SoloCEO (mô hình KD & nền tảng)
  const news=pickN("SELECT id,name,oneliner FROM items WHERE type='news' ORDER BY id DESC LIMIT 40",3);
  const tech=pickN("SELECT id,name,oneliner FROM items WHERE type='technology' ORDER BY score DESC LIMIT 60",2);
  const vsic=pickN("SELECT id,name,oneliner FROM items WHERE type='nganh-vsic'",2);
  const boiCanh=pickN(`SELECT id,type,name,oneliner FROM items WHERE type IN ('dia-phuong','dac-san','bat-dong-san','du-lich','tai-nguyen') AND name!=''`,3);
  const moHinh=pickN("SELECT id,name,oneliner FROM items WHERE type='soloceo-mo-hinh'",3);
  const nenTang=pickN("SELECT id,name,oneliner,category FROM items WHERE type='soloceo-nen-tang'",5);
  const vn=db.prepare("SELECT id,description FROM items WHERE type='quoc-gia' AND ext_key='việt nam'").get();
  const L=(x,lbl)=>`- ${lbl}: #${x.id} ${x.name}${x.oneliner?" — "+String(x.oneliner).slice(0,110):""}`;
  const ctx=[
    ...news.map(x=>L(x,"Tin tức mới")),...tech.map(x=>L(x,"Công nghệ đang lên")),
    ...vsic.map(x=>L(x,"Ngành kinh tế VN")),...boiCanh.map(x=>L(x,"Bối cảnh VN ("+x.type+")")),
    ...moHinh.map(x=>L(x,"Mô hình KD SoloCEO có sẵn")),...nenTang.map(x=>L(x,"Nền tảng SoloCEO có sẵn")),
    vn?("- Vĩ mô VN: "+String(vn.description).slice(0,200)):"",
  ].filter(Boolean).join("\n");
  const raw=await llmChat(
`Bạn là máy PHÁT HIỆN VẤN ĐỀ thị trường cho Solo CEO Việt Nam (doanh nghiệp 1 người + Đội AI).
TÍN HIỆU THẬT từ mạng tri thức:
${ctx}

Từ các tín hiệu trên, suy ra 2 VẤN ĐỀ THẬT mà một nhóm khách hàng cụ thể tại VN đang đau — vấn đề mà 1 Solo CEO (vốn <100 triệu) CÓ THỂ giải bằng mô hình KD + nền tảng SoloCEO ở trên. Trả DUY NHẤT JSON (không markdown):
{"van_de":[
 {"tieu_de":"tên vấn đề ngắn, cụ thể",
  "mo_ta":"vấn đề là gì, ai đau, đau thế nào, hiện họ xoay xở ra sao — dẫn #id tín hiệu",
  "khach_hang":"phân khúc khách hàng cụ thể",
  "nganh":"ngành",
  "do_dau":7,
  "can_cu":["#id đã dùng"]},
 {...}
]}
do_dau 1-10 (10 = rất đau/cấp thiết). Không bịa số liệu. Vấn đề phải KHÁC NHAU rõ rệt.`,1600);
  let j;
  try{j=JSON.parse(raw.replace(/^```json?\s*/i,"").replace(/```\s*$/,"").trim());}
  catch(e){throw new Error("JSON hỏng: "+raw.slice(0,100));}
  const arr=Array.isArray(j)?j:(j.van_de||[]);
  let added=0;
  for(const p of arr){
    if(!p.tieu_de)continue;
    if(db.prepare("SELECT id FROM problems WHERE lower(tieu_de)=lower(?)").get(p.tieu_de))continue;
    const info=db.prepare(`INSERT INTO problems(tieu_de,mo_ta,khach_hang,nganh,do_dau,can_cu,created_at)
      VALUES(?,?,?,?,?,?,?)`).run(p.tieu_de,p.mo_ta||"",p.khach_hang||"",p.nganh||"",
      Math.max(1,Math.min(10,Number(p.do_dau)||5)),JSON.stringify(p.can_cu||[]),nowIso());
    upsertMany([{type:"soloceo-van-de",source:"problem-loop",ext_key:"vande-"+info.lastInsertRowid,
      name:p.tieu_de,url:"https://bigdata.soloceo.vn/#ytuong",
      category:p.nganh||"Vấn đề thị trường",region:"Việt Nam",score:Number(p.do_dau)||5,
      oneliner:`Độ đau ${p.do_dau||5}/10 · KH: ${(p.khach_hang||"").slice(0,90)}`,
      description:p.mo_ta||p.tieu_de}]);
    added++;
  }
  if(added)rebuildFts();
  console.log(`[problem] phát hiện ${added} vấn đề mới. Backlog mở: `+
    db.prepare("SELECT count(*) n FROM problems WHERE trang_thai='moi'").get().n);
  return added;
}

// ĐÚC Ý TƯỞNG v2 — ưu tiên GIẢI vấn đề đau nhất trong backlog; hết vấn đề → tự do như cũ
async function generateIdeaV11(){
  const prob=db.prepare("SELECT * FROM problems WHERE trang_thai='moi' ORDER BY do_dau DESC, RANDOM() LIMIT 1").get();
  const m=mineOpportunity();
  const moHinhs=pickN("SELECT id,name,oneliner FROM items WHERE type='soloceo-mo-hinh'",3);
  const nenTangs=pickN("SELECT id,name,oneliner,category FROM items WHERE type='soloceo-nen-tang'",6);
  const nl=(x,lbl)=>x?`- ${lbl}: #${x.id} ${x.name}${x.oneliner?" — "+String(x.oneliner).slice(0,110):""}`:"";
  const ctx=[
    nl(m.linhVuc,"Lĩnh vực nhiều DN"),nl(m.boiCanh,"Bối cảnh/tài nguyên VN"),
    ...m.thanhCong.map(s=>nl(s,"Startup thành công tương tự")),
    ...moHinhs.map(s=>nl(s,"Mô hình KD SoloCEO (chọn 1 phù hợp nhất)")),
    ...nenTangs.map(s=>nl(s,"Nền tảng SoloCEO (chọn stack phù hợp)")),
    ...m.khoaHoc.map(s=>nl(s,"Khoá học SoloCEO")),
  ].filter(Boolean).join("\n");
  const probBlock=prob?`
VẤN ĐỀ CẦN GIẢI (từ vòng lặp phát hiện vấn đề — Ý TƯỞNG PHẢI GIẢI ĐÚNG VẤN ĐỀ NÀY):
- Vấn đề: ${prob.tieu_de}
- Mô tả: ${prob.mo_ta}
- Khách hàng đang đau: ${prob.khach_hang} · Ngành: ${prob.nganh} · Độ đau: ${prob.do_dau}/10
`:"";
  const raw=await llmChat(
`Bạn là chuyên gia đúc ý tưởng khởi nghiệp cho SOLO CEO (1 người + Đội AI) tại Việt Nam, vốn <100 triệu.
${probBlock}
NGUYÊN LIỆU THẬT từ mạng tri thức (dùng cái phù hợp, dẫn #id):
${ctx}

Đúc MỘT ý tưởng ${prob?"GIẢI QUYẾT TRỰC TIẾP vấn đề trên":"kinh doanh thực tế"}: chọn 1 mô hình KD SoloCEO phù hợp nhất làm khung + chọn stack nền tảng SoloCEO. Trả DUY NHẤT JSON:
{"ten":"...","nganh":"...","tom_tat":"2 câu",
"van_de":"${prob?"tóm tắt lại vấn đề đang giải":"vấn đề thị trường cụ thể"}",
"giai_phap":"giải pháp + khác biệt","thi_truong":"phân khúc + ước lượng thận trọng (ghi rõ là ước lượng)",
"vi_sao_bay_gio":"...",
"bmc":{"phan_khuc_khach_hang":"...","gia_tri_cot_loi":"...","kenh_phan_phoi":"...","quan_he_khach_hang":"...","dong_doanh_thu":"...","nguon_luc_chinh":"...","hoat_dong_chinh":"...","doi_tac_chinh":"...","co_cau_chi_phi":"..."},
"buoc_dau":["3-5 bước tuần đầu"],"soloceo_stack":["mô hình KD + nền tảng + khoá học SoloCEO, kèm #id"],"can_cu":["#id"]}
JSON hợp lệ, tiếng Việt, không bịa số chính xác giả.`,2400);
  let j;
  try{j=JSON.parse(raw.replace(/^```json?\s*/i,"").replace(/```\s*$/,"").trim());}
  catch(e){throw new Error("LLM trả JSON hỏng: "+raw.slice(0,120));}
  if(!j.ten||!j.bmc)throw new Error("Thiếu ten/bmc");
  if(db.prepare("SELECT id FROM ideas WHERE lower(ten)=lower(?)").get(j.ten))throw new Error("Trùng ý tưởng: "+j.ten);
  const info=db.prepare(`INSERT INTO ideas(ten,nganh,tom_tat,van_de,giai_phap,thi_truong,vi_sao_bay_gio,bmc,can_cu,buoc_dau,soloceo_stack,problem_id,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    j.ten,j.nganh||"",j.tom_tat||"",j.van_de||"",j.giai_phap||"",j.thi_truong||"",j.vi_sao_bay_gio||"",
    JSON.stringify(j.bmc),JSON.stringify(j.can_cu||[]),JSON.stringify(j.buoc_dau||[]),
    JSON.stringify(j.soloceo_stack||[]),prob?prob.id:null,nowIso());
  const ideaExt="idea-"+info.lastInsertRowid;
  upsertMany([{type:"soloceo-y-tuong",source:"idea-foundry",ext_key:ideaExt,
    name:j.ten,url:"https://bigdata.soloceo.vn/#"+ideaExt,
    category:j.nganh||"Ý tưởng",region:"SoloCEO",oneliner:(j.tom_tat||"").slice(0,150),
    description:`${j.van_de||""} Giải pháp: ${j.giai_phap||""}`}]);
  if(prob){
    db.prepare("UPDATE problems SET trang_thai='da-co-y-tuong', idea_id=? WHERE id=?").run(info.lastInsertRowid,prob.id);
    // cạnh đồ thị: ý tưởng —giải quyết→ vấn đề
    const iN=db.prepare("SELECT id FROM items WHERE type='soloceo-y-tuong' AND ext_key=?").get(ideaExt);
    const pN=db.prepare("SELECT id FROM items WHERE type='soloceo-van-de' AND ext_key=?").get("vande-"+prob.id);
    if(iN&&pN)edgeMany([[iN.id,pN.id,"giải quyết",3,"idea-foundry"]]);
  }
  rebuildFts();
  console.log("[idea] đúc xong #"+info.lastInsertRowid+(prob?" (giải vấn đề #"+prob.id+")":" (tự do)")+": "+j.ten);
  return {id:info.lastInsertRowid,ten:j.ten,giai_van_de:prob?prob.tieu_de:null};
}

// ═══════ v12 — VẤN ĐỀ CHUẨN QUỐC TẾ + KHO GIẢI PHÁP THẾ GIỚI + LỘ TRÌNH ═══════
// Vấn đề: JTBD (Jobs-To-Be-Done) + POV Statement (Design Thinking) + 5 Whys (gốc rễ)
//         + đo tần suất × mức độ (Lean Canvas). Giải pháp: đúc liên tục các pattern
//         thế giới đã phát triển từ dữ liệu công nghệ/startup. Ý tưởng = tổng hợp:
//         Vấn đề × Giải pháp × Mô hình KD × MVP mẫu × Nền tảng → kèm lộ trình chi tiết.
try{db.exec("ALTER TABLE problems ADD COLUMN boi_canh TEXT");}catch(e){}
try{db.exec("ALTER TABLE problems ADD COLUMN cach_xoay_xo TEXT");}catch(e){}
try{db.exec("ALTER TABLE problems ADD COLUMN goc_re TEXT");}catch(e){}
try{db.exec("ALTER TABLE problems ADD COLUMN tan_suat TEXT");}catch(e){}
try{db.exec("ALTER TABLE problems ADD COLUMN pov TEXT");}catch(e){}
try{db.exec("ALTER TABLE ideas ADD COLUMN lo_trinh TEXT");}catch(e){}
db.exec(`CREATE TABLE IF NOT EXISTS solutions (
  id INTEGER PRIMARY KEY,
  ten TEXT, mo_ta TEXT, nguyen_ly TEXT, vi_du TEXT, ap_dung TEXT,
  nganh TEXT, can_cu TEXT, created_at TEXT
);`);

// ── PHÁT HIỆN VẤN ĐỀ v2 (chuẩn JTBD + POV + 5 Whys) — thay bản v11 ──
async function mineProblems(){
  const news=pickN("SELECT id,name,oneliner FROM items WHERE type='news' ORDER BY id DESC LIMIT 40",3);
  const tech=pickN("SELECT id,name,oneliner FROM items WHERE type='technology' ORDER BY score DESC LIMIT 60",2);
  const vsic=pickN("SELECT id,name,oneliner FROM items WHERE type='nganh-vsic'",2);
  const boiCanh=pickN(`SELECT id,type,name,oneliner FROM items WHERE type IN ('dia-phuong','dac-san','bat-dong-san','du-lich','tai-nguyen') AND name!=''`,3);
  const moHinh=pickN("SELECT id,name,oneliner FROM items WHERE type='soloceo-mo-hinh'",2);
  const nenTang=pickN("SELECT id,name,oneliner FROM items WHERE type='soloceo-nen-tang'",4);
  const L=(x,lbl)=>`- ${lbl}: #${x.id} ${x.name}${x.oneliner?" — "+String(x.oneliner).slice(0,110):""}`;
  const ctx=[...news.map(x=>L(x,"Tin tức")),...tech.map(x=>L(x,"Công nghệ")),...vsic.map(x=>L(x,"Ngành VN")),
    ...boiCanh.map(x=>L(x,"Bối cảnh VN")),...moHinh.map(x=>L(x,"Mô hình KD SoloCEO")),...nenTang.map(x=>L(x,"Nền tảng SoloCEO"))].join("\n");
  const raw=await llmChat(
`Bạn là máy PHÁT HIỆN VẤN ĐỀ theo chuẩn quốc tế: JTBD (Jobs-To-Be-Done), POV Statement (Design Thinking) và 5 Whys.
TÍN HIỆU THẬT:
${ctx}

Suy ra 2 VẤN ĐỀ THẬT tại Việt Nam mà 1 Solo CEO (vốn <100 triệu) có thể giải. Trả DUY NHẤT JSON:
{"van_de":[{
 "tieu_de":"tên vấn đề ngắn cụ thể",
 "khach_hang":"phân khúc KH cụ thể (ai, ở đâu, quy mô)",
 "boi_canh":"JTBD: Khi [tình huống], họ muốn [động lực], để [kết quả mong đợi]",
 "mo_ta":"nỗi đau hiện tại — biểu hiện cụ thể, hậu quả (tiền/thời gian), dẫn #id tín hiệu",
 "cach_xoay_xo":"hiện họ đang xoay xở bằng gì (alternatives) và vì sao chưa ổn",
 "goc_re":"5 Whys → nguyên nhân gốc rễ (chuỗi vì sao ngắn gọn)",
 "pov":"POV: [Khách hàng] cần một cách để [nhu cầu] bởi vì [insight bất ngờ]",
 "tan_suat":"hằng ngày|hằng tuần|hằng tháng|theo mùa",
 "do_dau":8,
 "nganh":"ngành",
 "can_cu":["#id"]},{...}]}
do_dau = tần suất × mức nghiêm trọng, thang 1-10. Hai vấn đề phải KHÁC nhau rõ. Không bịa số liệu.`,2000);
  let j;try{j=JSON.parse(raw.replace(/^\`\`\`json?\s*/i,"").replace(/\`\`\`\s*$/,"").trim());}
  catch(e){throw new Error("JSON hỏng: "+raw.slice(0,100));}
  const arr=Array.isArray(j)?j:(j.van_de||[]);let added=0;
  for(const p of arr){
    if(!p.tieu_de)continue;
    if(db.prepare("SELECT id FROM problems WHERE lower(tieu_de)=lower(?)").get(p.tieu_de))continue;
    const info=db.prepare(`INSERT INTO problems(tieu_de,mo_ta,khach_hang,nganh,do_dau,can_cu,boi_canh,cach_xoay_xo,goc_re,tan_suat,pov,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(p.tieu_de,p.mo_ta||"",p.khach_hang||"",p.nganh||"",
      Math.max(1,Math.min(10,Number(p.do_dau)||5)),JSON.stringify(p.can_cu||[]),
      p.boi_canh||"",p.cach_xoay_xo||"",p.goc_re||"",p.tan_suat||"",p.pov||"",nowIso());
    upsertMany([{type:"soloceo-van-de",source:"problem-loop",ext_key:"vande-"+info.lastInsertRowid,
      name:p.tieu_de,url:"https://bigdata.soloceo.vn/#vande",category:p.nganh||"Vấn đề thị trường",
      region:"Việt Nam",score:Number(p.do_dau)||5,
      oneliner:`Độ đau ${p.do_dau||5}/10 · ${p.tan_suat||""} · KH: ${(p.khach_hang||"").slice(0,80)}`,
      description:(p.pov||"")+" "+(p.mo_ta||"")}]);
    added++;
  }
  if(added)rebuildFts();
  console.log(`[problem] +${added} vấn đề (chuẩn JTBD). Backlog mở: `+db.prepare("SELECT count(*) n FROM problems WHERE trang_thai='moi'").get().n);
  return added;
}

// ── KHO GIẢI PHÁP THẾ GIỚI — đúc liên tục pattern từ công nghệ/startup ──
let solGenBusy=false;
async function mineSolutionsV12(){
  const tech=pickN("SELECT id,name,oneliner,description FROM items WHERE type='technology' ORDER BY score DESC LIMIT 80",3);
  const sc=pickN("SELECT id,name,oneliner,category FROM items WHERE type='startup' AND outcome='thanh-cong' AND oneliner!=''",3);
  const duAn=pickN("SELECT id,name,oneliner FROM items WHERE type='soloceo-du-an'",2);
  const openProbs=db.prepare("SELECT tieu_de FROM problems WHERE trang_thai='moi' ORDER BY do_dau DESC LIMIT 3").all().map(p=>p.tieu_de);
  const L=(x,lbl)=>`- ${lbl}: #${x.id} ${x.name}${x.oneliner?" — "+String(x.oneliner).slice(0,110):""}`;
  const ctx=[...tech.map(x=>L(x,"Công nghệ")),...sc.map(x=>L(x,"Startup thành công")),...duAn.map(x=>L(x,"MVP mẫu SoloCEO"))].join("\n");
  const raw=await llmChat(
`Bạn là máy ĐÚC GIẢI PHÁP: tổng hợp các cách thế giới ĐÃ phát triển để giải quyết vấn đề (solution patterns).
NGUYÊN LIỆU THẬT:
${ctx}
${openProbs.length?"VẤN ĐỀ ĐANG MỞ tại VN (ưu tiên pattern giúp giải): "+openProbs.join(" · "):""}

Đúc 2 GIẢI PHÁP/PATTERN mà thế giới đã chứng minh, mô tả để Solo CEO VN áp dụng được. Trả DUY NHẤT JSON:
{"giai_phap":[{
 "ten":"tên pattern ngắn (vd: Tự động hoá quy trình bằng AI agent)",
 "mo_ta":"pattern này giải loại vấn đề gì, đã chứng minh ở đâu",
 "nguyen_ly":"cách hoạt động cốt lõi (3-4 câu)",
 "vi_du":"các công ty/sản phẩm thế giới đã dùng — dẫn #id nếu có trong nguyên liệu",
 "ap_dung":"cách 1 Solo CEO VN vốn <100tr áp dụng cụ thể",
 "nganh":"ngành phù hợp nhất",
 "can_cu":["#id"]},{...}]}
Hai pattern KHÁC nhau. Không bịa tên công ty không có thật.`,1800);
  let j;try{j=JSON.parse(raw.replace(/^\`\`\`json?\s*/i,"").replace(/\`\`\`\s*$/,"").trim());}
  catch(e){throw new Error("JSON hỏng: "+raw.slice(0,100));}
  const arr=Array.isArray(j)?j:(j.giai_phap||[]);let added=0;
  for(const g of arr){
    if(!g.ten)continue;
    if(db.prepare("SELECT id FROM solutions WHERE lower(ten)=lower(?)").get(g.ten))continue;
    const info=db.prepare(`INSERT INTO solutions(ten,mo_ta,nguyen_ly,vi_du,ap_dung,nganh,can_cu,created_at)
      VALUES(?,?,?,?,?,?,?,?)`).run(g.ten,g.mo_ta||"",g.nguyen_ly||"",g.vi_du||"",g.ap_dung||"",g.nganh||"",JSON.stringify(g.can_cu||[]),nowIso());
    upsertMany([{type:"soloceo-giai-phap",source:"solution-foundry",ext_key:"gp-"+info.lastInsertRowid,
      name:g.ten,url:"https://bigdata.soloceo.vn/#giaiphap",category:g.nganh||"Giải pháp",
      region:"SoloCEO",oneliner:(g.mo_ta||"").slice(0,150),description:(g.nguyen_ly||"")+" Áp dụng: "+(g.ap_dung||"")}]);
    added++;
  }
  if(added)rebuildFts();
  console.log(`[solution] +${added} giải pháp. Kho: `+db.prepare("SELECT count(*) n FROM solutions").get().n);
  return added;
}
// ═══════ v13 — ĐÚC LẠI TỪ DỮ LIỆU THẬT + KHỞI TẠO Ý TƯỞNG CỦA CEO ═══════
// Nguyên tắc mới: các kho KHÔNG sáng tác — chúng ĐÚC LẠI (chuẩn hoá) dữ liệu đã có:
//  Giải pháp  = đúc lại 1 công nghệ/startup THẬT trong kho dữ liệu
//  Mô hình KD = đúc lại mô hình của 1 startup THÀNH CÔNG thật
//  Sản phẩm   = đúc lại hồ sơ sản phẩm của 1 startup thật
//  Sự kiện    = đúc lại tin tức thật thành sự kiện thị trường có cấu trúc
// Thành phẩm: CEO gõ Ý TƯỞNG → chạy qua toàn bộ engine (đối chiếu 5 kho) → BMC riêng → lưu & chia sẻ.
try{db.exec("ALTER TABLE solutions ADD COLUMN nguon_id INTEGER");}catch(e){}
try{db.exec("ALTER TABLE ideas ADD COLUMN tac_gia TEXT");}catch(e){}
try{db.exec("ALTER TABLE ideas ADD COLUMN nguon TEXT DEFAULT 'foundry'");}catch(e){}
db.exec(`
CREATE TABLE IF NOT EXISTS biz_models (
  id INTEGER PRIMARY KEY, ten TEXT, cong_ty TEXT, nguon_id INTEGER,
  mo_ta TEXT, cach_kiem_tien TEXT, phan_khuc TEXT, kenh TEXT, chi_phi_chinh TEXT,
  bai_hoc TEXT, nganh TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY, ten TEXT, cong_ty TEXT, nguon_id INTEGER,
  lam_gi TEXT, cho_ai TEXT, cach_ban TEXT, diem_hay TEXT, nganh TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS mkt_events (
  id INTEGER PRIMARY KEY, tieu_de TEXT, loai TEXT, mo_ta TEXT,
  tac_dong TEXT, nguon_id INTEGER, nganh TEXT, created_at TEXT
);
`);
const jparse=r=>JSON.parse(r.replace(/^\s*\`\`\`json?\s*/i,"").replace(/\`\`\`\s*$/,"").trim());

// ── ĐÚC LẠI GIẢI PHÁP từ 1 nốt công nghệ/startup THẬT chưa đúc ──
async function distillSolution(){
  const src=pickRand(`SELECT i.id,i.type,i.name,i.oneliner,i.description,i.category FROM items i
    WHERE i.type IN ('technology','startup') AND i.oneliner!=''
    AND i.id NOT IN (SELECT COALESCE(nguon_id,0) FROM solutions) ORDER BY RANDOM() LIMIT 300`);
  if(!src)return 0;
  const raw=await llmChat(
`ĐÚC LẠI (chuẩn hoá, KHÔNG sáng tác thêm) giải pháp ĐÃ TỒN TẠI sau từ kho dữ liệu, thành hồ sơ giải pháp chuẩn tiếng Việt cho Solo CEO:
NGUỒN THẬT: #${src.id} [${src.type}] ${src.name} — ${src.oneliner||""}. ${String(src.description||"").slice(0,500)}
Trả DUY NHẤT JSON:
{"ten":"tên giải pháp (giữ tên gốc + mô tả ngắn)","mo_ta":"giải pháp này giải loại vấn đề gì (từ mô tả gốc)","nguyen_ly":"cách hoạt động cốt lõi theo dữ liệu gốc","vi_du":"${src.name} (#${src.id})","ap_dung":"1 Solo CEO VN vốn <100tr có thể dùng/học gì từ giải pháp này","nganh":"ngành"}
Chỉ dựa trên dữ liệu nguồn, không bịa tính năng.`,900);
  const j=jparse(raw);
  if(!j.ten)return 0;
  if(db.prepare("SELECT id FROM solutions WHERE lower(ten)=lower(?)").get(j.ten))return 0;
  const info=db.prepare(`INSERT INTO solutions(ten,mo_ta,nguyen_ly,vi_du,ap_dung,nganh,can_cu,nguon_id,created_at)
    VALUES(?,?,?,?,?,?,?,?,?)`).run(j.ten,j.mo_ta||"",j.nguyen_ly||"",j.vi_du||"",j.ap_dung||"",j.nganh||src.category||"",
    JSON.stringify(["#"+src.id]),src.id,nowIso());
  upsertMany([{type:"soloceo-giai-phap",source:"distill",ext_key:"gp-"+info.lastInsertRowid,
    name:j.ten,url:"https://bigdata.soloceo.vn/#giaiphap",category:j.nganh||"Giải pháp",region:"SoloCEO",
    oneliner:(j.mo_ta||"").slice(0,150),description:(j.nguyen_ly||"")+" Áp dụng: "+(j.ap_dung||"")}]);
  console.log("[distill] giải pháp ← #"+src.id+" "+src.name);
  return 1;
}

// ── ĐÚC LẠI MÔ HÌNH KD từ 1 startup THÀNH CÔNG thật ──
async function distillBizModel(){
  const src=pickRand(`SELECT i.id,i.name,i.oneliner,i.description,i.category,i.region FROM items i
    WHERE i.type='startup' AND i.outcome='thanh-cong' AND i.oneliner!=''
    AND i.id NOT IN (SELECT COALESCE(nguon_id,0) FROM biz_models) ORDER BY RANDOM() LIMIT 300`);
  if(!src)return 0;
  const raw=await llmChat(
`ĐÚC LẠI mô hình kinh doanh THẬT của công ty thành công sau (chuẩn hoá từ dữ liệu, không bịa):
NGUỒN: #${src.id} ${src.name} — ${src.oneliner||""} · ngành ${src.category||""}. ${String(src.description||"").slice(0,500)}
Trả DUY NHẤT JSON:
{"ten":"tên mô hình (vd: Marketplace 2 chiều kiểu ${src.name})","mo_ta":"mô hình vận hành thế nào","cach_kiem_tien":"các dòng doanh thu của họ","phan_khuc":"khách hàng của họ","kenh":"kênh tiếp cận chính","chi_phi_chinh":"cơ cấu chi phí chính","bai_hoc":"Solo CEO VN học được gì / áp dụng thu nhỏ thế nào","nganh":"ngành"}
Chỗ nào dữ liệu gốc không nói rõ thì suy luận THẬN TRỌNG theo mô hình phổ biến của ngành và ghi "(suy luận)".`,1100);
  const j=jparse(raw);
  if(!j.ten)return 0;
  if(db.prepare("SELECT id FROM biz_models WHERE lower(ten)=lower(?)").get(j.ten))return 0;
  const info=db.prepare(`INSERT INTO biz_models(ten,cong_ty,nguon_id,mo_ta,cach_kiem_tien,phan_khuc,kenh,chi_phi_chinh,bai_hoc,nganh,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(j.ten,src.name,src.id,j.mo_ta||"",j.cach_kiem_tien||"",j.phan_khuc||"",j.kenh||"",j.chi_phi_chinh||"",j.bai_hoc||"",j.nganh||src.category||"",nowIso());
  upsertMany([{type:"soloceo-mo-hinh-data",source:"distill",ext_key:"bm-"+info.lastInsertRowid,
    name:j.ten,url:"https://bigdata.soloceo.vn/#mohinh",category:j.nganh||"Mô hình KD",region:"SoloCEO",
    oneliner:("Từ "+src.name+" · "+(j.cach_kiem_tien||"")).slice(0,150),description:(j.mo_ta||"")+" Bài học: "+(j.bai_hoc||"")}]);
  console.log("[distill] mô hình KD ← #"+src.id+" "+src.name);
  return 1;
}

// ── ĐÚC LẠI HỒ SƠ SẢN PHẨM từ 1 startup thật ──
async function distillProduct(){
  const src=pickRand(`SELECT i.id,i.name,i.oneliner,i.description,i.category,i.url FROM items i
    WHERE i.type='startup' AND i.oneliner!='' AND i.outcome IN ('thanh-cong','dang-hoat-dong')
    AND i.id NOT IN (SELECT COALESCE(nguon_id,0) FROM products) ORDER BY RANDOM() LIMIT 300`);
  if(!src)return 0;
  const raw=await llmChat(
`ĐÚC LẠI hồ sơ SẢN PHẨM THẬT sau thành chuẩn tiếng Việt (từ dữ liệu, không bịa tính năng):
NGUỒN: #${src.id} ${src.name} — ${src.oneliner||""}. ${String(src.description||"").slice(0,500)}
Trả DUY NHẤT JSON:
{"ten":"${src.name}","lam_gi":"sản phẩm làm gì","cho_ai":"cho ai dùng","cach_ban":"cách họ bán/định giá (nếu gốc không nói, ghi mô hình phổ biến + '(suy luận)')","diem_hay":"điểm đáng học nhất cho Solo CEO muốn làm sản phẩm tương tự tại VN","nganh":"ngành"}`,900);
  const j=jparse(raw);
  if(!j.ten)return 0;
  if(db.prepare("SELECT id FROM products WHERE nguon_id=?").get(src.id))return 0;
  const info=db.prepare(`INSERT INTO products(ten,cong_ty,nguon_id,lam_gi,cho_ai,cach_ban,diem_hay,nganh,created_at)
    VALUES(?,?,?,?,?,?,?,?,?)`).run(j.ten,src.name,src.id,j.lam_gi||"",j.cho_ai||"",j.cach_ban||"",j.diem_hay||"",j.nganh||src.category||"",nowIso());
  upsertMany([{type:"soloceo-san-pham",source:"distill",ext_key:"sp-"+info.lastInsertRowid,
    name:j.ten,url:src.url||"https://bigdata.soloceo.vn/#sanpham",category:j.nganh||"Sản phẩm",region:"SoloCEO",
    oneliner:(j.lam_gi||"").slice(0,150),description:(j.lam_gi||"")+" Cho: "+(j.cho_ai||"")+" Điểm hay: "+(j.diem_hay||"")}]);
  console.log("[distill] sản phẩm ← #"+src.id+" "+src.name);
  return 1;
}

// ── ĐÚC LẠI SỰ KIỆN thị trường từ tin tức thật ──
async function distillEvent(){
  const srcs=pickN(`SELECT i.id,i.name,i.oneliner FROM items i WHERE i.type='news'
    AND i.id NOT IN (SELECT COALESCE(nguon_id,0) FROM mkt_events) ORDER BY i.id DESC LIMIT 30`,3);
  if(!srcs.length)return 0;
  const raw=await llmChat(
`ĐÚC LẠI các tin tức THẬT sau thành SỰ KIỆN thị trường có cấu trúc (không bịa):
${srcs.map(s=>`- #${s.id} ${s.name} — ${s.oneliner||""}`).join("\n")}
Trả DUY NHẤT JSON:
{"su_kien":[{"nguon_id":${srcs[0].id},"tieu_de":"sự kiện gì đang diễn ra","loai":"cong-nghe|gọi-vốn|ra-mắt|xu-hướng|chính-sách","mo_ta":"tóm tắt","tac_dong":"tác động/ cơ hội cho Solo CEO VN","nganh":"ngành"},...]}
Mỗi tin 1 sự kiện, dùng đúng nguon_id của tin đó.`,1200);
  const j=jparse(raw);
  let n=0;
  for(const e of (j.su_kien||[])){
    if(!e.tieu_de)continue;
    if(db.prepare("SELECT id FROM mkt_events WHERE lower(tieu_de)=lower(?)").get(e.tieu_de))continue;
    db.prepare(`INSERT INTO mkt_events(tieu_de,loai,mo_ta,tac_dong,nguon_id,nganh,created_at)
      VALUES(?,?,?,?,?,?,?)`).run(e.tieu_de,e.loai||"xu-hướng",e.mo_ta||"",e.tac_dong||"",Number(e.nguon_id)||null,e.nganh||"",nowIso());
    n++;
  }
  if(n)console.log("[distill] +"+n+" sự kiện");
  return n;
}

let distillBusy=false;
app.get("/api/admin/gen-distill",async(req,res)=>{
  if((req.query.token||"")!==REFRESH_TOKEN)return res.status(403).json({error:"token sai"});
  if(distillBusy)return res.json({status:"đang đúc"});
  distillBusy=true;res.json({status:"bắt đầu"});
  setImmediate(async()=>{
    const out={};
    for(const [k,fn] of [["giai_phap",distillSolution],["mo_hinh",distillBizModel],["san_pham",distillProduct],["su_kien",distillEvent]]){
      try{out[k]=await fn();}catch(e){out[k]="lỗi: "+e.message;}
    }
    rebuildFts();
    console.log("[distill] chu kỳ xong",JSON.stringify(out));
    distillBusy=false;
  });
});
// ── ĐÚC HÀNG LOẠT: chạy nhiều vòng distill song song (4 kho/vòng) ──
let bulkBusy=false, bulkState={dang_chay:false,vong:0,tong_vong:0,ket_qua:{giai_phap:0,mo_hinh:0,san_pham:0,su_kien:0},loi:0};
app.get("/api/admin/bulk-distill",(req,res)=>{
  if((req.query.token||"")!==REFRESH_TOKEN)return res.status(403).json({error:"token sai"});
  if(bulkBusy)return res.json({status:"đang chạy",...bulkState});
  const n=Math.max(1,Math.min(80,Number(req.query.n)||30));
  bulkBusy=true;bulkState={dang_chay:true,vong:0,tong_vong:n,ket_qua:{giai_phap:0,mo_hinh:0,san_pham:0,su_kien:0},loi:0};
  res.json({status:"bắt đầu",tong_vong:n});
  setImmediate(async()=>{
    for(let i=1;i<=n;i++){
      bulkState.vong=i;
      const rs=await Promise.allSettled([distillSolution(),distillBizModel(),distillProduct(),distillEvent()]);
      const keys=["giai_phap","mo_hinh","san_pham","su_kien"];
      rs.forEach((r,k)=>{ if(r.status==="fulfilled")bulkState.ket_qua[keys[k]]+=Number(r.value)||0; else bulkState.loi++; });
      if(i%5===0){rebuildFts();console.log(`[bulk] vòng ${i}/${n}`,JSON.stringify(bulkState.ket_qua));}
    }
    rebuildFts();
    bulkState.dang_chay=false;bulkBusy=false;
    console.log("[bulk] XONG",JSON.stringify(bulkState.ket_qua),"lỗi:",bulkState.loi);
  });
});
app.get("/api/admin/bulk-status",(req,res)=>res.json(bulkState));

app.get("/api/mo-hinh-kd",(req,res)=>res.json({count:db.prepare("SELECT count(*) n FROM biz_models").get().n,
  mo_hinh:db.prepare("SELECT * FROM biz_models ORDER BY id DESC LIMIT ?").all(Number(req.query.limit)||40)}));
app.get("/api/san-pham",(req,res)=>res.json({count:db.prepare("SELECT count(*) n FROM products").get().n,
  san_pham:db.prepare("SELECT * FROM products ORDER BY id DESC LIMIT ?").all(Number(req.query.limit)||40)}));
app.get("/api/su-kien",(req,res)=>res.json({count:db.prepare("SELECT count(*) n FROM mkt_events").get().n,
  su_kien:db.prepare("SELECT * FROM mkt_events ORDER BY id DESC LIMIT ?").all(Number(req.query.limit)||60)}));


// Tìm mục LIÊN QUAN trong kho đúc theo từ khoá ý tưởng (LIKE nhiều cột) + bù mục mới nhất
function khopKho(bang,cols,tuKhoa,nLienQuan,nMoi){
  const kws=String(tuKhoa||"").toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N} ]/gu," ").split(/\s+/)
    .filter(w=>w.length>3).slice(0,6);
  let lienQuan=[];
  if(kws.length){
    const cond=kws.map(()=>"("+cols.map(c=>`lower(${c}) LIKE ?`).join(" OR ")+")").join(" OR ");
    const args=[];kws.forEach(w=>cols.forEach(()=>args.push("%"+w+"%")));
    try{lienQuan=db.prepare(`SELECT * FROM ${bang} WHERE ${cond} ORDER BY id DESC LIMIT ?`).all(...args,nLienQuan);}catch(e){}
  }
  const ids=new Set(lienQuan.map(r=>r.id));
  let moi=[];
  try{moi=db.prepare(`SELECT * FROM ${bang} ORDER BY id DESC LIMIT ?`).all(nLienQuan+nMoi).filter(r=>!ids.has(r.id)).slice(0,nMoi);}catch(e){}
  return {lienQuan,tatCa:lienQuan.concat(moi)};
}

// ── ⭐ KHỞI TẠO Ý TƯỞNG CỦA CEO — chạy qua TOÀN BỘ Data Engine ──
let khoiTaoBusy=false;
app.post("/api/khoi-tao",async(req,res)=>{
  const yt=String((req.body||{}).y_tuong||"").trim().slice(0,400);
  const tacGia=String((req.body||{}).tac_gia||"").trim().slice(0,60)||"Solo CEO ẩn danh";
  if(yt.length<8)return res.status(400).json({error:"Mô tả ý tưởng dài hơn chút (≥8 ký tự)."});
  if(khoiTaoBusy)return res.status(429).json({error:"Engine đang đúc ý tưởng khác — thử lại sau ~1 phút."});
  khoiTaoBusy=true;
  try{
    const ftq=yt.replace(/[^\p{L}\p{N} ]/gu," ").split(/\s+/).filter(w=>w.length>2).slice(0,8).join(" OR ");
    const like="%"+yt.split(/\s+/).slice(0,3).join("%")+"%";
    const pickT=(sql,...a)=>{try{return db.prepare(sql).all(...a);}catch(e){return [];}};
    // Đối chiếu 5 kho ĐÃ ĐÚC + dữ liệu gốc
    const kP=khopKho("problems",["tieu_de","mo_ta","khach_hang","nganh"],yt,5,3);
    const kS=khopKho("solutions",["ten","mo_ta","nguyen_ly","ap_dung","nganh"],yt,5,3);
    const kB=khopKho("biz_models",["ten","cong_ty","mo_ta","cach_kiem_tien","phan_khuc","nganh"],yt,4,3);
    const kR=khopKho("products",["ten","cong_ty","lam_gi","cho_ai","nganh"],yt,4,3);
    const kE=khopKho("mkt_events",["tieu_de","mo_ta","tac_dong","nganh"],yt,4,3);
    const probs=kP.tatCa, sols=kS.tatCa, bms=kB.tatCa, prods=kR.tatCa, evs=kE.tatCa;
    const soKhop={van_de:kP.lienQuan.length,giai_phap:kS.lienQuan.length,mo_hinh:kB.lienQuan.length,san_pham:kR.lienQuan.length,su_kien:kE.lienQuan.length};
    const simStartups=pickT(`SELECT i.id,i.name,i.oneliner,i.outcome FROM items_fts f JOIN items i ON i.id=f.rowid
      WHERE items_fts MATCH ? AND i.type='startup' LIMIT 6`,ftq);
    const nenTang=pickN("SELECT id,name,oneliner FROM items WHERE type='soloceo-nen-tang'",5);
    const moHinhSol=pickN("SELECT id,name,oneliner FROM items WHERE type='soloceo-mo-hinh'",2);
    const ctx=[
      "── KHO VẤN ĐỀ ĐÃ PHÁT HIỆN ──",...probs.map(p=>`[VD${p.id}]${kP.lienQuan.includes(p)?" ★LIÊN QUAN":""} ${p.tieu_de} · KH: ${p.khach_hang} · đau ${p.do_dau}/10`),
      "── KHO GIẢI PHÁP ĐÃ ĐÚC (từ dữ liệu thật) ──",...sols.map(s=>`[GP${s.id}]${kS.lienQuan.includes(s)?" ★LIÊN QUAN":""} ${s.ten} — ${String(s.nguyen_ly||"").slice(0,90)}`),
      "── KHO MÔ HÌNH KD ĐÃ ĐÚC (từ startup thành công thật) ──",...bms.map(b=>`[MH${b.id}]${kB.lienQuan.includes(b)?" ★LIÊN QUAN":""} ${b.ten} (từ ${b.cong_ty}) — ${String(b.cach_kiem_tien||"").slice(0,90)}`),
      "── KHO SẢN PHẨM ĐÃ ĐÚC ──",...prods.map(p=>`[SP${p.id}]${kR.lienQuan.includes(p)?" ★LIÊN QUAN":""} ${p.ten} — ${String(p.lam_gi||"").slice(0,90)}`),
      "── SỰ KIỆN THỊ TRƯỜNG ──",...evs.map(e=>`[SK${e.id}]${kE.lienQuan.includes(e)?" ★LIÊN QUAN":""} (${e.loai}) ${e.tieu_de} — ${String(e.tac_dong||"").slice(0,90)}`),
      "── STARTUP TƯƠNG TỰ (dữ liệu gốc) ──",...simStartups.map(s=>`#${s.id} ${s.name} (${s.outcome||"?"}) — ${String(s.oneliner||"").slice(0,90)}`),
      "── NỀN TẢNG & KHUNG SOLOCEO ──",...nenTang.map(s=>`#${s.id} ${s.name}`),...moHinhSol.map(s=>`#${s.id} ${s.name}`),
    ].join("\n");
    const raw=await llmChat(
`Solo CEO "${tacGia}" gõ Ý TƯỞNG: "${yt}"
Chạy ý tưởng qua TOÀN BỘ Data Engine — đối chiếu với các kho ĐÃ ĐÚC TỪ DỮ LIỆU THẬT:
${ctx}

Trả DUY NHẤT JSON (tham chiếu [VDx]/[GPx]/[MHx]/[SPx]/[SKx]/#id THẬT ở trên; kho nào KHÔNG có gì khớp thì nói thẳng "chưa có trong kho"):
{"ten":"tên thương mại cho ý tưởng này","nganh":"...","tom_tat":"2 câu",
"doi_chieu":{"van_de":"vấn đề nào trong kho khớp ý tưởng? có thật sự đau không?","giai_phap":"giải pháp nào ĐÃ CÓ dùng được?","mo_hinh":"mô hình KD nào ĐÃ CÓ phù hợp?","san_pham":"sản phẩm nào ĐÃ TỒN TẠI tương tự — cạnh tranh hay học hỏi?","su_kien":"sự kiện nào ủng hộ/cản trở thời điểm này?"},
"van_de":"vấn đề ý tưởng giải","giai_phap":"giải pháp + khác biệt so với sản phẩm đã có","thi_truong":"phân khúc + ước lượng thận trọng (ghi rõ ước lượng)","vi_sao_bay_gio":"...",
"bmc":{"phan_khuc_khach_hang":"...","gia_tri_cot_loi":"...","kenh_phan_phoi":"...","quan_he_khach_hang":"...","dong_doanh_thu":"...","nguon_luc_chinh":"...","hoat_dong_chinh":"...","doi_tac_chinh":"...","co_cau_chi_phi":"..."},
"lo_trinh":[{"giai_doan":"Tuần 1-2","viec":["..."],"muc_tieu":"đo được"},{"giai_doan":"Tháng 1","viec":["..."],"muc_tieu":"..."},{"giai_doan":"Tháng 2-3","viec":["..."],"muc_tieu":"..."}],
"soloceo_stack":["nền tảng/khung SoloCEO kèm #id"],"can_cu":["#id"]}`,3000);
    const j=jparse(raw);
    if(!j.ten||!j.bmc)throw new Error("Engine trả thiếu ten/bmc — thử lại.");
    const info=db.prepare(`INSERT INTO ideas(ten,nganh,tom_tat,van_de,giai_phap,thi_truong,vi_sao_bay_gio,bmc,can_cu,buoc_dau,soloceo_stack,lo_trinh,tac_gia,nguon,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      j.ten,j.nganh||"",j.tom_tat||"",j.van_de||"",j.giai_phap||"",j.thi_truong||"",j.vi_sao_bay_gio||"",
      JSON.stringify(j.bmc),JSON.stringify(j.can_cu||[]),JSON.stringify([]),
      JSON.stringify(j.soloceo_stack||[]),JSON.stringify(j.lo_trinh||[]),tacGia,"ceo",nowIso());
    const ideaExt="idea-"+info.lastInsertRowid;
    upsertMany([{type:"soloceo-y-tuong",source:"ceo-created",ext_key:ideaExt,
      name:j.ten,url:"https://bigdata.soloceo.vn/#"+ideaExt,category:j.nganh||"Ý tưởng",
      region:"SoloCEO",oneliner:("Bởi "+tacGia+" · "+(j.tom_tat||"")).slice(0,150),
      description:(j.van_de||"")+" Giải pháp: "+(j.giai_phap||"")}]);
    rebuildFts();
    console.log("[khoi-tao] CEO '"+tacGia+"' tạo ý tưởng #"+info.lastInsertRowid+": "+j.ten);
    res.json({ok:true,id:info.lastInsertRowid,ten:j.ten,doi_chieu:j.doi_chieu||{},so_khop:soKhop,bmc:j.bmc,
      lo_trinh:j.lo_trinh||[],soloceo_stack:j.soloceo_stack||[],tom_tat:j.tom_tat||"",
      thi_truong:j.thi_truong||"",giai_phap:j.giai_phap||"",van_de:j.van_de||"",
      luu:"Đã lưu vào kho ý tưởng — hiển thị cho mọi Solo CEO trong workspace tham khảo."});
  }catch(e){res.status(500).json({error:e.message});}
  finally{khoiTaoBusy=false;}
});
// ═══════ HẾT v13 ═══════

app.get("/api/giai-phap",(req,res)=>{
  const rows=db.prepare("SELECT * FROM solutions ORDER BY id DESC LIMIT ?").all(Number(req.query.limit)||40);
  res.json({count:db.prepare("SELECT count(*) n FROM solutions").get().n,giai_phap:rows});
});
app.get("/api/admin/gen-solution",async(req,res)=>{
  if((req.query.token||"")!==REFRESH_TOKEN)return res.status(403).json({error:"token sai"});
  if(solGenBusy)return res.json({status:"đang đúc"});
  solGenBusy=true;
  try{res.json({status:"ok",them:await distillSolution()});}
  catch(e){res.json({status:"lỗi",error:e.message});}
  finally{solGenBusy=false;}
});

// ── ĐÚC Ý TƯỞNG v3 — TỔNG HỢP: Vấn đề × Giải pháp × Mô hình KD × MVP mẫu × Nền tảng + LỘ TRÌNH ──
async function generateIdea(){
  const prob=db.prepare("SELECT * FROM problems WHERE trang_thai='moi' ORDER BY do_dau DESC, RANDOM() LIMIT 1").get();
  const sols=db.prepare("SELECT id,ten,nguyen_ly,ap_dung FROM solutions ORDER BY RANDOM() LIMIT 3").all();
  const m=mineOpportunity();
  const moHinhs=pickN("SELECT id,name,oneliner FROM items WHERE type='soloceo-mo-hinh'",3);
  const nenTangs=pickN("SELECT id,name,oneliner,category FROM items WHERE type='soloceo-nen-tang'",6);
  const mvps=pickN("SELECT id,name,oneliner FROM items WHERE type='soloceo-du-an'",3);
  const nl=(x,lbl)=>x?`- ${lbl}: #${x.id} ${x.name}${x.oneliner?" — "+String(x.oneliner).slice(0,110):""}`:"";
  const ctx=[
    ...sols.map(s=>`- Giải pháp thế giới (kho): [GP${s.id}] ${s.ten} — ${String(s.nguyen_ly||"").slice(0,120)}`),
    ...moHinhs.map(s=>nl(s,"Mô hình KD SoloCEO (chọn 1)")),
    ...mvps.map(s=>nl(s,"MVP mẫu SoloCEO (tham chiếu)")),
    ...nenTangs.map(s=>nl(s,"Nền tảng SoloCEO (chọn stack)")),
    nl(m.linhVuc,"Lĩnh vực nhiều DN"),nl(m.boiCanh,"Bối cảnh VN"),
    ...m.thanhCong.map(s=>nl(s,"Startup thành công tương tự")),
  ].filter(Boolean).join("\n");
  const probBlock=prob?`
VẤN ĐỀ CẦN GIẢI (chuẩn JTBD — Ý TƯỞNG PHẢI GIẢI ĐÚNG VẤN ĐỀ NÀY):
- ${prob.tieu_de} · KH: ${prob.khach_hang} · đau ${prob.do_dau}/10 (${prob.tan_suat||""})
- JTBD: ${prob.boi_canh||prob.mo_ta}
- POV: ${prob.pov||""}
- Gốc rễ: ${prob.goc_re||""}
- Đang xoay xở: ${prob.cach_xoay_xo||""}
`:"";
  const raw=await llmChat(
`Bạn là chuyên gia đúc ý tưởng khởi nghiệp cho SOLO CEO (1 người + Đội AI) tại Việt Nam, vốn <100 triệu.
${probBlock}
NGUYÊN LIỆU TỔNG HỢP (vấn đề × giải pháp thế giới × mô hình KD × MVP mẫu × nền tảng — dẫn #id/[GPx] khi dùng):
${ctx}

Đúc MỘT ý tưởng ${prob?"GIẢI TRỰC TIẾP vấn đề trên":"thực tế"}: ghép 1 giải pháp thế giới phù hợp + 1 mô hình KD + stack nền tảng, tham chiếu MVP mẫu gần nhất. Trả DUY NHẤT JSON:
{"ten":"...","nganh":"...","tom_tat":"2 câu",
"van_de":"tóm tắt vấn đề","giai_phap":"giải pháp + pattern thế giới đã dùng [GPx] + khác biệt",
"thi_truong":"phân khúc + ước lượng thận trọng (ghi rõ ước lượng)","vi_sao_bay_gio":"...",
"bmc":{"phan_khuc_khach_hang":"...","gia_tri_cot_loi":"...","kenh_phan_phoi":"...","quan_he_khach_hang":"...","dong_doanh_thu":"...","nguon_luc_chinh":"...","hoat_dong_chinh":"...","doi_tac_chinh":"...","co_cau_chi_phi":"..."},
"lo_trinh":[{"giai_doan":"Tuần 1-2","viec":["việc cụ thể"],"muc_tieu":"mốc đo được"},{"giai_doan":"Tháng 1","viec":["..."],"muc_tieu":"..."},{"giai_doan":"Tháng 2-3","viec":["..."],"muc_tieu":"..."},{"giai_doan":"Tháng 4-6","viec":["..."],"muc_tieu":"..."}],
"buoc_dau":["3-5 việc tuần đầu"],"soloceo_stack":["mô hình + nền tảng + MVP mẫu + khoá học, kèm #id"],"can_cu":["#id"]}
JSON hợp lệ, tiếng Việt, lộ trình phải CỤ THỂ đo được, không bịa số.`,3000);
  let j;try{j=JSON.parse(raw.replace(/^\`\`\`json?\s*/i,"").replace(/\`\`\`\s*$/,"").trim());}
  catch(e){throw new Error("LLM trả JSON hỏng: "+raw.slice(0,120));}
  if(!j.ten||!j.bmc)throw new Error("Thiếu ten/bmc");
  if(db.prepare("SELECT id FROM ideas WHERE lower(ten)=lower(?)").get(j.ten))throw new Error("Trùng ý tưởng: "+j.ten);
  const info=db.prepare(`INSERT INTO ideas(ten,nganh,tom_tat,van_de,giai_phap,thi_truong,vi_sao_bay_gio,bmc,can_cu,buoc_dau,soloceo_stack,problem_id,lo_trinh,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    j.ten,j.nganh||"",j.tom_tat||"",j.van_de||"",j.giai_phap||"",j.thi_truong||"",j.vi_sao_bay_gio||"",
    JSON.stringify(j.bmc),JSON.stringify(j.can_cu||[]),JSON.stringify(j.buoc_dau||[]),
    JSON.stringify(j.soloceo_stack||[]),prob?prob.id:null,JSON.stringify(j.lo_trinh||[]),nowIso());
  const ideaExt="idea-"+info.lastInsertRowid;
  upsertMany([{type:"soloceo-y-tuong",source:"idea-foundry",ext_key:ideaExt,
    name:j.ten,url:"https://bigdata.soloceo.vn/#"+ideaExt,category:j.nganh||"Ý tưởng",
    region:"SoloCEO",oneliner:(j.tom_tat||"").slice(0,150),
    description:`${j.van_de||""} Giải pháp: ${j.giai_phap||""}`}]);
  if(prob){
    db.prepare("UPDATE problems SET trang_thai='da-co-y-tuong', idea_id=? WHERE id=?").run(info.lastInsertRowid,prob.id);
    const iN=db.prepare("SELECT id FROM items WHERE type='soloceo-y-tuong' AND ext_key=?").get(ideaExt);
    const pN=db.prepare("SELECT id FROM items WHERE type='soloceo-van-de' AND ext_key=?").get("vande-"+prob.id);
    if(iN&&pN)edgeMany([[iN.id,pN.id,"giải quyết",3,"idea-foundry"]]);
  }
  rebuildFts();
  console.log("[idea] v3 đúc #"+info.lastInsertRowid+(prob?" (giải vấn đề #"+prob.id+")":"")+": "+j.ten);
  return {id:info.lastInsertRowid,ten:j.ten,giai_van_de:prob?prob.tieu_de:null};
}
// ═══════ HẾT v12 ═══════

app.get("/api/van-de",(req,res)=>{
  const st=req.query.status||"all";
  let rows=db.prepare(`SELECT p.*, i.ten AS y_tuong FROM problems p LEFT JOIN ideas i ON i.id=p.idea_id ORDER BY p.trang_thai='moi' DESC, p.do_dau DESC, p.id DESC`).all();
  if(st==="moi")rows=rows.filter(r=>r.trang_thai==="moi");
  res.json({count:rows.length,mo:rows.filter(r=>r.trang_thai==="moi").length,van_de:rows.slice(0,Number(req.query.limit)||40)});
});
app.get("/api/admin/gen-problem",async(req,res)=>{
  if((req.query.token||"")!==REFRESH_TOKEN)return res.status(403).json({error:"token sai"});
  if(probGenBusy)return res.json({status:"đang quét"});
  probGenBusy=true;
  try{res.json({status:"ok",them:await mineProblems()});}
  catch(e){res.json({status:"lỗi",error:e.message});}
  finally{probGenBusy=false;}
});
// ═══════ HẾT VÒNG LẶP VẤN ĐỀ ═══════

app.get("/api/ideas",(req,res)=>{
  const sort=req.query.sort||"new";
  const rows=db.prepare("SELECT id,ten,nganh,tom_tat,van_de,thi_truong,created_at,tac_gia,nguon FROM ideas").all().map(ideaStats);
  if(sort==="top")rows.sort((a,b)=>(b.diem_tb*Math.log(b.so_vote+1))-(a.diem_tb*Math.log(a.so_vote+1))||b.id-a.id);
  else if(sort==="thuc-thi")rows.sort((a,b)=>b.so_thuc_thi-a.so_thuc_thi||b.id-a.id);
  else rows.sort((a,b)=>b.id-a.id);
  res.json({count:rows.length,ideas:rows.slice(0,Number(req.query.limit)||40)});
});
app.get("/api/ideas/:id",(req,res)=>{
  const r=db.prepare("SELECT * FROM ideas WHERE id=?").get(req.params.id);
  if(!r)return res.status(404).json({error:"Không có ý tưởng này"});
  const out=ideaStats(r);
  out.bmc=JSON.parse(r.bmc||"{}");out.can_cu=JSON.parse(r.can_cu||"[]");
  out.buoc_dau=JSON.parse(r.buoc_dau||"[]");out.soloceo_stack=JSON.parse(r.soloceo_stack||"[]");
  try{out.lo_trinh=JSON.parse(r.lo_trinh||"[]");}catch(e){out.lo_trinh=[];}
  // nốt căn cứ chi tiết
  out.not_can_cu=out.can_cu.map(c=>{const id=Number(String(c).replace(/[^0-9]/g,""));const n=id?nodeInfo.get(id):null;
    return n?{id:n.id,type:n.type,name:n.name,oneliner:n.oneliner}:null;}).filter(Boolean);
  res.json(out);
});
app.post("/api/ideas/:id/vote",(req,res)=>{
  const diem=Math.max(1,Math.min(5,Number((req.body||{}).diem)||0));
  if(!diem)return res.status(400).json({error:"diem 1-5"});
  if(!db.prepare("SELECT id FROM ideas WHERE id=?").get(req.params.id))return res.status(404).json({error:"Không có ý tưởng"});
  db.prepare(`INSERT INTO idea_votes(idea_id,voter,diem,created_at) VALUES(?,?,?,?)
    ON CONFLICT(idea_id,voter) DO UPDATE SET diem=excluded.diem`).run(req.params.id,voterOf(req),diem,nowIso());
  const v=db.prepare("SELECT count(*) n, AVG(diem) a FROM idea_votes WHERE idea_id=?").get(req.params.id);
  res.json({ok:true,so_vote:v.n,diem_tb:Math.round(v.a*10)/10});
});
app.post("/api/ideas/:id/thuc-thi",(req,res)=>{
  if(!db.prepare("SELECT id FROM ideas WHERE id=?").get(req.params.id))return res.status(404).json({error:"Không có ý tưởng"});
  db.prepare(`INSERT OR IGNORE INTO idea_execs(idea_id,voter,ghi_chu,created_at) VALUES(?,?,?,?)`)
    .run(req.params.id,voterOf(req),String((req.body||{}).ghi_chu||"").slice(0,200),nowIso());
  const e=db.prepare("SELECT count(*) n FROM idea_execs WHERE idea_id=?").get(req.params.id);
  res.json({ok:true,so_thuc_thi:e.n});
});
let ideaGenBusy=false;
app.get("/api/admin/gen-idea",async(req,res)=>{
  if((req.query.token||"")!==REFRESH_TOKEN)return res.status(403).json({error:"token sai"});
  if(ideaGenBusy)return res.json({status:"đang đúc"});
  ideaGenBusy=true;
  try{res.json({status:"ok",idea:await generateIdea()});}
  catch(e){res.json({status:"lỗi",error:e.message});}
  finally{ideaGenBusy=false;}
});
// ═══════ HẾT XƯỞNG Ý TƯỞNG ═══════

const PORT=process.env.PORT||8080;
function boot(){app.listen(PORT,"0.0.0.0",()=>console.log(`bigdata v3 nghe cổng ${PORT}`));}
(async()=>{
  const n=db.prepare("SELECT count(*) n FROM items").get().n;
  boot();
  // Bổ sung nguồn mới nếu chưa có (founder/news/technology) hoặc DB rỗng — chạy nền, không chặn server
  const hasNew=db.prepare("SELECT count(*) n FROM items WHERE type IN ('founder','ceo','technology','news')").get().n;
  if(n===0 || hasNew===0){ console.log("[boot] chạy full ingest nền..."); fullIngest().catch(e=>console.error(e)); }
})();
