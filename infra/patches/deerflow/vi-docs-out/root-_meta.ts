import type { MetaRecord } from "nextra";

// LƯU Ý: _meta của vi CHỈ được chứa key có trang thật dưới content/vi/
// (key thừa như "posts" → build fail "refers to a page that cannot be found").
const meta: MetaRecord = {
  index: {
    title: "Tổng quan",
  },
  introduction: {
    title: "Giới thiệu",
  },
};

export default meta;
