// ✅ Clean HTML for Telegram
export const sanitizeHTMLForTelegram = (html = "") => {
  return html
    .replace(/<(\/?)h[1-6]>/g, "")
    .replace(/<p>/g, "")
    .replace(/<\/p>/g, "\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<strong[^>]*>/g, "<b>")
    .replace(/<\/strong>/g, "</b>")
    .replace(/<em>/g, "<i>")
    .replace(/<\/em>/g, "</i>")
    .replace(/<\/?span.*?>/g, "")
    .replace(/<\/?div.*?>/g, "")
    .replace(/\sstyle=["'][^"']*["']/g, "");
};