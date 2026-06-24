import { load } from "cheerio";

interface InlineEmailAttachment {
  filename: string;
  content: string;
  content_type?: string;
  content_id?: string;
}

const QUILL_CLASS_STYLES: Record<string, string> = {
  "ql-align-center": "text-align:center;",
  "ql-align-right": "text-align:right;",
  "ql-align-justify": "text-align:justify;",
  "ql-size-small": "font-size:0.75em;",
  "ql-size-large": "font-size:1.5em;",
  "ql-size-huge": "font-size:2.5em;",
  "ql-font-serif": "font-family:Georgia, 'Times New Roman', serif;",
  "ql-font-monospace": "font-family:Monaco, 'Courier New', monospace;",
  "ql-direction-rtl": "direction:rtl;",
  "ql-bg-black": "background-color:#000000;",
  "ql-bg-red": "background-color:#e60000;",
  "ql-bg-orange": "background-color:#ff9900;",
  "ql-bg-yellow": "background-color:#ffff00;",
  "ql-bg-green": "background-color:#008a00;",
  "ql-bg-blue": "background-color:#0066cc;",
  "ql-bg-purple": "background-color:#9933ff;",
  "ql-color-white": "color:#ffffff;",
  "ql-color-red": "color:#e60000;",
  "ql-color-orange": "color:#ff9900;",
  "ql-color-yellow": "color:#ffff00;",
  "ql-color-green": "color:#008a00;",
  "ql-color-blue": "color:#0066cc;",
  "ql-color-purple": "color:#9933ff;",
};

function mergeStyles(currentStyle: string | undefined, extraStyles: string[]) {
  const current = (currentStyle || "").trim();
  return [current, ...extraStyles.map((style) => style.trim()).filter(Boolean)]
    .filter(Boolean)
    .join(current ? " " : "");
}

function inlineQuillStyles(rawHtml: string) {
  const $ = load(`<div id="email-root">${rawHtml}</div>`);

  $("#email-root")
    .find("*")
    .each((_, element) => {
      const node = $(element);
      const classAttr = node.attr("class") || "";
      const classNames = classAttr.split(/\s+/).filter(Boolean);
      const styles: string[] = [];

      for (const className of classNames) {
        const mappedStyle = QUILL_CLASS_STYLES[className];
        if (mappedStyle) styles.push(mappedStyle);

        const indentMatch = className.match(/^ql-indent-(\d+)$/);
        if (indentMatch) {
          const level = Number(indentMatch[1]);
          if (!Number.isNaN(level) && level > 0) {
            styles.push(`padding-left:${level * 3}em;`);
          }
        }
      }

      if (styles.length > 0) {
        node.attr("style", mergeStyles(node.attr("style"), styles));
      }

      if (classNames.length > 0) {
        node.removeAttr("class");
      }

      if (node.is("p")) {
        node.attr("style", mergeStyles(node.attr("style"), ["margin:0 0 16px 0;"]));
      }

      if (node.is("h1")) {
        node.attr("style", mergeStyles(node.attr("style"), ["margin:0 0 16px 0;", "font-size:2em;", "line-height:1.25;"]));
      }

      if (node.is("h2")) {
        node.attr("style", mergeStyles(node.attr("style"), ["margin:0 0 16px 0;", "font-size:1.5em;", "line-height:1.3;"]));
      }

      if (node.is("h3")) {
        node.attr("style", mergeStyles(node.attr("style"), ["margin:0 0 16px 0;", "font-size:1.17em;", "line-height:1.35;"]));
      }

      if (node.is("ul, ol")) {
        node.attr("style", mergeStyles(node.attr("style"), ["margin:0 0 16px 0;", "padding-left:24px;"]));
      }

      if (node.is("li")) {
        node.attr("style", mergeStyles(node.attr("style"), ["margin:0 0 8px 0;"]));
      }

      if (node.is("a")) {
        node.attr("style", mergeStyles(node.attr("style"), ["text-decoration:underline;", "font-weight:600;"]));
      }

      if (node.is("img")) {
        node.attr("style", mergeStyles(node.attr("style"), ["max-width:100%;", "height:auto;", "display:block;"]));
      }
    });

  return $("#email-root").html() || rawHtml;
}

export function buildPremiumEmailTemplate(subject: string, rawContent: string, unsubscribeUrl?: string): string {
  // Check if content is already HTML (from Quill editor) or plain text (from Extractor modal)
  const isHtml = /<[a-z][\s\S]*>/i.test(rawContent);
  
  // Format content neatly
  let contentBody = rawContent;
  if (!isHtml) {
    // Convert plain text breaks into proper HTML spacing
    contentBody = rawContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<p style="margin: 0 0 16px 0;">${line}</p>`)
      .join('');
  } else {
     // Ensure Quill's generated HTML looks perfect by injecting some CSS resets at the root
     contentBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; color: #334155; line-height: 1.7;">${rawContent}</div>`;
  }

  // The absolute URL is REQUIRED for images in emails. 
  // It falls back to your domain if the env var isn't set.
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.getverixa.com";
  const LOGO_URL = `${BASE_URL}/Brand/Vertixa3.png`;

  return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${subject}</title>
      <style type="text/css">
        /* Client-specific Resets */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; max-width: 100%; }
        
        /* Links & Generics */
        a { text-decoration: none !important; color: #2FA4A9; font-weight: 600; }
        a:hover { text-decoration: underline !important; }
        
        /* Body Setup */
        body { 
          margin: 0 !important; 
          padding: 0 !important; 
          width: 100% !important; 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif; 
          background-color: #F8FAFC; /* Slate 50 */
          -webkit-font-smoothing: antialiased; 
        }
        
        /* Typography overrides for injected content */
        .content-block h1, .content-block h2, .content-block h3 {
          color: #0F172A; /* Slate 900 */
          margin-top: 0;
          margin-bottom: 16px;
          line-height: 1.3;
        }
        .content-block p {
          margin: 0 0 16px 0;
        }
        .content-block ul, .content-block ol {
          margin-top: 0;
          margin-bottom: 16px;
          padding-left: 24px;
        }
        .content-block li {
          margin-bottom: 8px;
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8FAFC;">
      <!-- Main Wrapper Setup -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; padding: 40px 20px;">
        <tr>
          <td align="center">
            
            <!-- Structural Container -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.05); border: 1px solid #E2E8F0;">
              
              <!-- Premium Header (Dark Executive Mode) -->
              <tr>
                <td align="center" style="background-color: #0F172A; border-top: 4px solid #2FA4A9; padding: 40px 20px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center">
                        <img src="${LOGO_URL}" alt="Verixa Network" width="180" style="display: block; max-width: 100%; height: auto; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;" />
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Primary Body Area -->
              <tr>
                <td align="left" class="content-block" style="padding: 48px 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.7; color: #334155;">
                  
                  <!-- Injected Quill HTML / Processed Text -->
                  ${contentBody}
                  
                </td>
              </tr>
              
              <!-- Clean Divider -->
              <tr>
                <td align="center" style="padding: 0 40px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #F1F5F9;">
                    <tr><td style="font-size: 1px; line-height: 1px;">&nbsp;</td></tr>
                  </table>
                </td>
              </tr>
              
              <!-- Context / Utility Bar -->
              <tr>
                 <td align="center" style="padding: 32px 40px 16px 40px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border-radius: 12px; padding: 24px; border: 1px solid #F1F5F9;">
                       <tr>
                          <td align="center" style="font-family: -apple-system, sans-serif; font-size: 13px; color: #64748B; line-height: 1.6;">
                             Sent securely via the <strong>Verixa Pipeline</strong>.<br/>
                             You are receiving this communication due to your registration with the CICC registry or our platform.
                          </td>
                       </tr>
                    </table>
                 </td>
              </tr>
              
              <!-- Minimalist Legal Footer -->
              <tr>
                <td align="center" style="padding: 16px 40px 40px 40px; background-color: #FFFFFF;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center" style="font-family: -apple-system, sans-serif; font-size: 12px; color: #94A3B8; line-height: 1.5;">
                        <span style="font-weight: 700; color: #475569; letter-spacing: 0.5px;">VERIXA INC.</span> <br/>
                        123 Tech Quarter, Executive Suite<br/>
                        Toronto, ON M5V 3J2, Canada
                        <br/><br/>
                        <a href="${BASE_URL}" style="color: #94A3B8; text-decoration: underline !important;">Preferences</a> &nbsp;&bull;&nbsp;
                        <a href="${unsubscribeUrl || `${BASE_URL}/unsubscribe`}" style="color: #94A3B8; text-decoration: underline !important;">Unsubscribe safely</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
            </table>
            <!-- End Main Content Wrapper -->
            
            <!-- Tiny Out-of-box copyright -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
              <tr>
                <td align="center" style="padding: 24px 0; font-family: -apple-system, sans-serif; font-size: 11px; color: #CBD5E1;">
                  &copy; ${new Date().getFullYear()} Verixa Network. All rights reserved.
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
      
    </body>
    </html>
  `;
}

export function buildPlainTextEmail(rawContent: string, unsubscribeUrl?: string): string {
  const textContent = rawContent
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  const footer = unsubscribeUrl ? `\n\nUnsubscribe: ${unsubscribeUrl}` : "";
  return `${textContent}${footer}`.trim();
}

export async function prepareEmailHtmlContent(rawContent: string): Promise<string> {
  return rawContent;
}

export async function buildExactEmailPayload(rawContent: string): Promise<{
  html: string;
  attachments: InlineEmailAttachment[];
}> {
  const preparedHtmlContent = await prepareEmailHtmlContent(rawContent);
  const isHtml = /<[a-z][\s\S]*>/i.test(preparedHtmlContent);

  let html = preparedHtmlContent;
  if (!isHtml) {
    html = preparedHtmlContent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => `<p>${line}</p>`)
      .join("");
  }

  html = inlineQuillStyles(html);

  const attachments: InlineEmailAttachment[] = [];
  let imageIndex = 0;

  html = html.replace(
    /<img([^>]*?)src=(["'])(data:(image\/[a-zA-Z0-9.+-]+);base64,([^"']+))\2([^>]*?)>/gi,
    (_match, beforeSrc, quote, _fullDataUri, mimeType, base64Content, afterSrc) => {
      imageIndex += 1;
      const extension = mimeType.split("/")[1]?.split("+")[0] || "png";
      const contentId = `broadcast-image-${imageIndex}@getverixa.com`;

      attachments.push({
        filename: `broadcast-image-${imageIndex}.${extension}`,
        content: base64Content,
        content_type: mimeType,
        content_id: contentId,
      });

      return `<img${beforeSrc}src=${quote}cid:${contentId}${quote}${afterSrc}>`;
    }
  );

  return { html, attachments };
}
