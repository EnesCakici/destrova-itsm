package com.ticket.backend.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

/**
 * Manager Reports ekrani icin tam veri paketi.
 * GET /api/manager/reports?startDate=&endDate=
 */
@Data
@Builder
@AllArgsConstructor
public class ReportsDto {

    /** Toplam olusturulan ve cozulen ticket sayilari. */
    private int totalCreated;
    private int totalResolved;

    /** Ortalama cozum suresi (saat). */
    private double avgResolutionHours;

    /** SLA uyum yuzdesi — kapanan ticketlar uzerinden. */
    private double slaCompliancePercent;

    /** Haftalik / periyodik acilan vs kapanan akis. */
    private List<WeeklyFlowDto> volumeSeries;

    /** Urun bazli performans satirlari. */
    private List<ProductReportRow> products;

    /** Agent bazli performans satirlari. */
    private List<AgentReportRow> agents;

    /** Ortalama cozum suresi trend (hafta bazli). */
    private List<ResolutionTrendPoint> resolutionTrend;

    /* ── Nested row types ─────────────────────────────── */

    @Data
    @Builder
    @AllArgsConstructor
    public static class ProductReportRow {
        private String name;
        private int tickets;
        /** "Xh Ym" formati */
        private String avgResolution;
        /** 0-100 */
        private int slaMet;
        /** Onceki periyoda gore degisim yuzdesi (pozitif = artis) */
        private int deltaPct;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class AgentReportRow {
        private String name;
        private String role;
        private int resolved;
        private String avgResolution;
        private int slaMet;
        /** CSAT skoru henuz toplanmadigi icin simdilik null; alan rezerve. */
        private Double csat;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class ResolutionTrendPoint {
        /** Etiket: "W1", "W2" vb. */
        private String label;
        /** Ortalama cozum suresi (saat). */
        private double avgHours;
    }
}
