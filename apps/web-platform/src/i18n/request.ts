import { getRequestConfig } from "next-intl/server";

// Tiếng Việt mặc định; i18n sẵn sàng cho tiếng Anh (CLAUDE.md Phần 0).
export const DEFAULT_LOCALE = "vi";

export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
