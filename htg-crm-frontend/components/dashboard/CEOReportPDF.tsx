import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const TEAL = "#0A9599";
const TEAL_LIGHT = "#74E3E7";
const DARK_NAVY = "#1A2332";
const DARK = "#111315";
const GREY_BG = "#F4F6F9";
const GREY_BORDER = "#DDE2EA";
const GREY_TEXT = "#6B7280";
const RED = "#EF4444";

const countryBarColors: Record<string, string> = {
  Kenya: TEAL,
  Ethiopia: "#0C7A7D",
  Somalia: TEAL_LIGHT,
  Djibouti: "#A5EDEF",
};

export type CEOReportPDFProps = {
  totalARR: number;
  q3Target: number;
  q3Achieved: number;
  pipeline: number;
  wonThisMonth: number;
  forecast: number;
  activeCount: number;
  atRiskCount: number;
  countries: Array<{ name: string; arr: number; target: number; tenants: number; atRisk: number }>;
  atRiskTenants: Array<{ name: string; country: string; sector: string; riskScore: number; arr: number }>;
  insights: Array<{ title: string; body: string }>;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function percent(value: number, total: number) {
  if (total <= 0) return "0.0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

function shortMoney(value: number) {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${Math.round(value / 1000)}K`;
  return money(value);
}

export function CEOReportPDF({
  totalARR,
  q3Target,
  q3Achieved,
  pipeline,
  wonThisMonth,
  forecast,
  activeCount,
  atRiskCount,
  countries,
  atRiskTenants,
  insights,
}: CEOReportPDFProps) {
  const generated = new Date().toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const revenueGap = Math.max(q3Target - q3Achieved, 0);
  const maxARR = Math.max(...countries.map((country) => country.arr), 1);
  const insightRows = insights.length > 0 ? insights.slice(0, 3) : [
    {
      title: "Pipeline focus",
      body: "Prioritize the largest qualified deals and clear blockers with country managers this week.",
    },
    {
      title: "Retention discipline",
      body: "Review all at-risk tenants and assign an executive owner for each renewal or health issue.",
    },
    {
      title: "Country execution",
      body: "Keep target reviews tied to country ARR contribution and Q3 revenue gap closure.",
    },
  ];

  const kpis = [
    { label: "Total ARR", value: money(totalARR), sub: `${activeCount} active tenants` },
    { label: "Q3 Target", value: money(q3Target), sub: "Company target" },
    { label: "Q3 Achieved", value: money(q3Achieved), sub: `${percent(q3Achieved, q3Target)} of target` },
    { label: "Pipeline Value", value: money(pipeline), sub: "Open and closed pipeline" },
    { label: "Won This Month", value: money(wonThisMonth), sub: "Closed won value" },
    { label: "Forecast", value: money(forecast), sub: "AI adjusted forecast" },
    { label: "At-Risk Tenants", value: atRiskCount.toLocaleString("en-US"), sub: "Risk score or status flagged" },
    { label: "Revenue Gap", value: money(revenueGap), sub: "Target minus achieved" },
  ];

  return (
    <Document title="HTG CEO Summary Report">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerAccent} />
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src="/htg-logo-white.svg" style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>CEO Executive Summary Report</Text>
            <Text style={styles.headerSubTitle}>{"Q3 2026 \u00B7 Generated "}{generated}</Text>
            <Text style={styles.confidential}>{"CONFIDENTIAL \u2014 EXECUTIVE USE ONLY"}</Text>
          </View>
        </View>

        <SectionTitle title="Executive KPIs" />
        <View style={styles.kpiGrid}>
          {kpis.map((kpi) => (
            <View key={kpi.label} style={styles.kpiCard}>
              <View style={styles.kpiAccent} />
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <Text style={styles.kpiSub}>{kpi.sub}</Text>
            </View>
          ))}
        </View>

        <SectionTitle title="Country Performance" />
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.countryHeader]}>
            {["Country", "ARR", "Q3 Target", "Achievement %", "Revenue Gap", "Tenants", "At-Risk"].map((header) => (
              <Text key={header} style={styles.countryHeaderCell}>{header}</Text>
            ))}
          </View>
          {countries.map((country, index) => {
            const gap = Math.max(country.target - country.arr, 0);
            return (
              <View key={country.name} style={[styles.tableRow, index % 2 === 1 ? styles.altRow : styles.whiteRow]}>
                <Text style={styles.tableCell}>{country.name}</Text>
                <Text style={styles.tableCell}>{shortMoney(country.arr)}</Text>
                <Text style={styles.tableCell}>{shortMoney(country.target)}</Text>
                <Text style={styles.tableCell}>{percent(country.arr, country.target)}</Text>
                <Text style={styles.tableCell}>{shortMoney(gap)}</Text>
                <Text style={styles.tableCell}>{country.tenants}</Text>
                <Text style={styles.tableCell}>{country.atRisk}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.tealRule} />

        <View style={styles.barChart}>
          {countries.map((country) => (
            <View key={country.name} style={styles.barRow}>
              <Text style={styles.barLabel}>{country.name}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: countryBarColors[country.name] ?? TEAL,
                      width: `${Math.max(4, (country.arr / maxARR) * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barValue}>{shortMoney(country.arr)}</Text>
            </View>
          ))}
          <Text style={styles.legend}>Bars = Current ARR | Sorted by ARR descending</Text>
        </View>

        <SectionTitle title="At-Risk Tenants" />
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.riskHeader]}>
            {["Tenant", "Country", "Sector", "Risk Score", "ARR Exposed"].map((header) => (
              <Text key={header} style={styles.riskHeaderCell}>{header}</Text>
            ))}
          </View>
          {(atRiskTenants.length > 0 ? atRiskTenants : [{ name: "No at-risk tenants", country: "-", sector: "-", riskScore: 0, arr: 0 }]).map((tenant) => (
            <View key={`${tenant.name}-${tenant.country}`} style={[styles.tableRow, styles.riskRow]}>
              <Text style={styles.riskCell}>{tenant.name}</Text>
              <Text style={styles.riskCell}>{tenant.country}</Text>
              <Text style={styles.riskCell}>{tenant.sector}</Text>
              <Text style={[styles.riskCell, styles.riskScore]}>{tenant.riskScore}</Text>
              <Text style={styles.riskCell}>{shortMoney(tenant.arr)}</Text>
            </View>
          ))}
        </View>

        <SectionTitle title="AI Insights" />
        <View style={styles.insightGrid}>
          {insightRows.map((insight, index) => (
            <View key={insight.title} style={styles.insightCard}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{index + 1}</Text>
              </View>
              <View style={styles.insightText}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightBody}>{insight.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text>HTG Clouds | Commercial Revenue Platform | Confidential</Text>
          <Text>Generated {generated}</Text>
        </View>
      </Page>
    </Document>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  altRow: {
    backgroundColor: GREY_BG,
  },
  badge: {
    alignItems: "center",
    backgroundColor: TEAL,
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    marginRight: 8,
    width: 24,
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: 700,
  },
  barChart: {
    marginBottom: 14,
    marginTop: 8,
  },
  barFill: {
    borderRadius: 3,
    height: 8,
  },
  barLabel: {
    color: DARK,
    fontSize: 9,
    width: 58,
  },
  barRow: {
    alignItems: "center",
    display: "flex",
    flexDirection: "row",
    marginBottom: 6,
  },
  barTrack: {
    backgroundColor: GREY_BORDER,
    borderRadius: 3,
    flex: 1,
    height: 8,
    marginHorizontal: 8,
  },
  barValue: {
    color: DARK,
    fontSize: 9,
    textAlign: "right",
    width: 42,
  },
  confidential: {
    color: "#B7C0CC",
    fontSize: 7,
    marginTop: 18,
    textAlign: "right",
  },
  countryHeader: {
    backgroundColor: DARK_NAVY,
    borderBottomColor: TEAL,
    borderBottomWidth: 2,
  },
  countryHeaderCell: {
    color: "white",
    flex: 1,
    fontSize: 8,
    fontWeight: 700,
    padding: 6,
  },
  footer: {
    borderTopColor: GREY_BORDER,
    borderTopWidth: 1,
    bottom: 18,
    color: GREY_TEXT,
    display: "flex",
    flexDirection: "row",
    fontSize: 8,
    justifyContent: "space-between",
    left: 32,
    paddingTop: 8,
    position: "absolute",
    right: 32,
  },
  greyText: {
    color: GREY_TEXT,
  },
  header: {
    backgroundColor: DARK_NAVY,
    display: "flex",
    flexDirection: "row",
    marginBottom: 14,
    minHeight: 82,
    padding: 18,
    position: "relative",
  },
  headerAccent: {
    backgroundColor: TEAL,
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: 4,
  },
  headerSubTitle: {
    color: TEAL_LIGHT,
    fontSize: 10,
    marginTop: 5,
    textAlign: "right",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: 700,
    textAlign: "right",
  },
  insightBody: {
    color: DARK,
    fontSize: 8,
    lineHeight: 1.35,
  },
  insightCard: {
    backgroundColor: "#F0FAFA",
    borderColor: TEAL,
    borderRadius: 4,
    borderWidth: 1,
    display: "flex",
    flex: 1,
    flexDirection: "row",
    marginRight: 6,
    padding: 8,
  },
  insightGrid: {
    display: "flex",
    flexDirection: "row",
    marginBottom: 22,
  },
  insightText: {
    flex: 1,
  },
  insightTitle: {
    color: DARK,
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 3,
  },
  kpiAccent: {
    backgroundColor: TEAL,
    height: 3,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  kpiCard: {
    backgroundColor: "white",
    borderColor: GREY_BORDER,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 8,
    marginRight: 8,
    padding: 8,
    paddingTop: 10,
    position: "relative",
    width: "23.5%",
  },
  kpiGrid: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  kpiLabel: {
    color: GREY_TEXT,
    fontSize: 7,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  kpiSub: {
    color: GREY_TEXT,
    fontSize: 7,
    marginTop: 3,
  },
  kpiValue: {
    color: DARK,
    fontSize: 13,
    fontWeight: 700,
    marginTop: 4,
  },
  legend: {
    color: GREY_TEXT,
    fontSize: 8,
    marginTop: 3,
  },
  logo: {
    height: 40,
    objectFit: "contain",
    width: 116,
  },
  page: {
    backgroundColor: "white",
    color: DARK,
    fontFamily: "Helvetica",
    fontSize: 9,
    padding: 32,
    paddingBottom: 48,
  },
  riskCell: {
    color: DARK,
    flex: 1,
    fontSize: 8,
    padding: 6,
  },
  riskHeader: {
    backgroundColor: "#7F1D1D",
  },
  riskHeaderCell: {
    color: "white",
    flex: 1,
    fontSize: 8,
    fontWeight: 700,
    padding: 6,
  },
  riskRow: {
    backgroundColor: "#FEF2F2",
  },
  riskScore: {
    color: RED,
    fontWeight: 700,
  },
  sectionTitle: {
    color: DARK_NAVY,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  sectionTitleWrap: {
    marginBottom: 7,
    marginTop: 4,
  },
  table: {
    borderColor: GREY_BORDER,
    borderWidth: 1,
  },
  tableCell: {
    color: DARK,
    flex: 1,
    fontSize: 8,
    padding: 6,
  },
  tableRow: {
    display: "flex",
    flexDirection: "row",
  },
  tealRule: {
    backgroundColor: TEAL,
    height: 1,
    marginBottom: 7,
  },
  whiteRow: {
    backgroundColor: "white",
  },
});
