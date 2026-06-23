package com.ticket.backend.service;

import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

/**
 * Branded HTML wrapper for transactional notification emails.
 * Plain-text body from callers is preserved as the multipart/alternative fallback.
 */
@Service
public class EmailTemplateService {

    private static final Logger log = LoggerFactory.getLogger(EmailTemplateService.class);
    private static final String LOGO_CLASSPATH = "email/destrova-logo.png";

    private final String logoDataUri;
    private final String productName;

    public EmailTemplateService(
            @Value("${destrova.mail.product-name:DESTROVA}") String productName) {
        this.productName = productName == null || productName.isBlank() ? "DESTROVA" : productName.trim();
        this.logoDataUri = loadLogoDataUri();
    }

    public String render(String subject, String plainBody, String actionUrl) {
        String safeSubject = escape(subject);
        String safeBody = formatBody(plainBody);
        String ctaBlock = buildCtaBlock(actionUrl);
        String headerBrand = buildHeaderBrand();

        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>%s</title>
                </head>
                <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0f172a;">
                  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;">
                    <tr>
                      <td align="center" style="padding:32px 16px;">
                        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%%;max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                          <tr>
                            <td align="center" style="padding:24px 32px;background-color:#0f172a;">
                              %s
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:32px 32px 24px 32px;">
                              <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">%s ITSM</p>
                              <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.35;font-weight:700;color:#0f172a;">%s</h1>
                              %s
                              %s
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:20px 32px 28px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748b;">
                                This is an automated message from %s. Please do not reply to this email.
                              </p>
                              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                                &copy; %s &middot; IT Service Management
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """
                .formatted(
                        safeSubject,
                        headerBrand,
                        escape(productName),
                        safeSubject,
                        safeBody,
                        ctaBlock,
                        escape(productName),
                        escape(productName));
    }

    private String buildHeaderBrand() {
        if (logoDataUri == null || logoDataUri.isBlank()) {
            return "<span style=\"font-size:20px;font-weight:700;letter-spacing:0.08em;color:#ffffff;\">"
                    + escape(productName)
                    + "</span>";
        }
        return "<img src=\""
                + logoDataUri
                + "\" alt=\""
                + escape(productName)
                + "\" height=\"36\" style=\"display:block;height:36px;width:auto;border:0;outline:none;text-decoration:none;margin:0 auto;\">";
    }

    private String buildCtaBlock(String actionUrl) {
        if (actionUrl == null || actionUrl.isBlank()) {
            return "";
        }
        String safeUrl = escape(actionUrl.trim());
        return """
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;">
                  <tr>
                    <td align="left" style="border-radius:8px;background-color:#2563eb;">
                      <a href="%s" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:8px;">
                        Open in %s
                      </a>
                    </td>
                  </tr>
                </table>
                """
                .formatted(safeUrl, escape(productName));
    }

    private static String formatBody(String plainBody) {
        if (plainBody == null || plainBody.isBlank()) {
            return "<p style=\"margin:0;font-size:15px;line-height:1.65;color:#334155;\">&mdash;</p>";
        }
        String[] paragraphs = plainBody.trim().split("\\R\\R+");
        StringBuilder html = new StringBuilder();
        for (String paragraph : paragraphs) {
            String trimmed = paragraph.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            html.append("<p style=\"margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#334155;\">")
                    .append(escape(trimmed).replace("\n", "<br>"))
                    .append("</p>");
        }
        if (html.isEmpty()) {
            html.append("<p style=\"margin:0;font-size:15px;line-height:1.65;color:#334155;\">")
                    .append(escape(plainBody.trim()).replace("\n", "<br>"))
                    .append("</p>");
        }
        return html.toString();
    }

    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        return HtmlUtils.htmlEscape(value);
    }

    private static String loadLogoDataUri() {
        try (InputStream in = new ClassPathResource(LOGO_CLASSPATH).getInputStream()) {
            byte[] bytes = in.readAllBytes();
            String encoded = Base64.getEncoder().encodeToString(bytes);
            return "data:image/png;base64," + encoded;
        } catch (IOException e) {
            log.warn("Email logo not found at {} — emails will render without logo", LOGO_CLASSPATH);
            return "";
        }
    }
}
