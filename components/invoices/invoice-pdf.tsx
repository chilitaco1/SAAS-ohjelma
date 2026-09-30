import path from "node:path";

import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { InvoicePdfModel } from "@/lib/invoices/pdf-model";

const fontDir = path.join(process.cwd(), "lib/invoices/fonts");

Font.register({
  family: "Source Sans 3",
  fonts: [
    { src: path.join(fontDir, "SourceSans3-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "SourceSans3-Semibold.ttf"), fontWeight: 600 },
  ],
});

Font.registerHyphenationCallback((word) => [word]);

const green = "#1f6b4a";
const ink = "#1c1917";
const muted = "#57534e";
const line = "#e7e5e4";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Source Sans 3",
    fontSize: 10,
    color: ink,
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  brand: {
    fontSize: 18,
    fontWeight: 600,
    color: green,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
  },
  block: {
    width: "48%",
  },
  label: {
    color: muted,
    marginBottom: 2,
  },
  strong: {
    fontWeight: 600,
  },
  sectionTitle: {
    fontWeight: 600,
    marginBottom: 4,
  },
  meta: {
    marginTop: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  table: {
    marginTop: 22,
  },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: green,
    paddingBottom: 4,
    color: muted,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: line,
    paddingVertical: 5,
  },
  colDesc: { width: "32%" },
  colQty: { width: "10%", textAlign: "right" },
  colUnit: { width: "10%", textAlign: "right" },
  colPrice: { width: "18%", textAlign: "right" },
  colVat: { width: "12%", textAlign: "right" },
  colTotal: { width: "18%", textAlign: "right" },
  summary: {
    marginTop: 12,
    marginLeft: "auto",
    width: "46%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: green,
    fontWeight: 600,
    fontSize: 12,
  },
  pay: {
    marginTop: 28,
    padding: 12,
    borderWidth: 1,
    borderColor: green,
    borderRadius: 4,
  },
  payTitle: {
    fontWeight: 600,
    color: green,
    marginBottom: 6,
  },
  payRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  cancelled: {
    marginTop: 8,
    color: "#b91c1c",
    fontSize: 18,
    fontWeight: 600,
  },
});

function Lines({ lines }: { lines: string[] }) {
  return (
    <View>
      {lines.map((line) => (
        <Text key={line}>{line}</Text>
      ))}
    </View>
  );
}

/** Printed Finnish invoice. The parent has already formatted the stored values. */
export function InvoicePdf({ model }: { model: InvoicePdfModel }) {
  return (
    <Document title={model.invoiceNumber} author={model.sellerName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.block}>
            <Text style={styles.brand}>{model.sellerName}</Text>
            <View style={{ marginTop: 6 }}>
              <Lines lines={model.sellerLines} />
            </View>
            {model.vatRegistered ? <Text style={{ marginTop: 4 }}>ALV-velvollinen</Text> : null}
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>Lasku</Text>
            <Text style={[styles.strong, { fontSize: 16 }]}>{model.invoiceNumber}</Text>
            {model.cancelled ? <Text style={styles.cancelled}>PERUTTU</Text> : null}
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Asiakas</Text>
            <Lines lines={model.customerLines} />
          </View>
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Laskun tiedot</Text>
            <Text>Laskun päivä: {model.issueDate}</Text>
            <Text>Eräpäivä: {model.dueDate}</Text>
            <Text>Maksuehto: {model.paymentTerms}</Text>
            {model.deliveryDate ? <Text>Toimituspäivä: {model.deliveryDate}</Text> : null}
            <Text>Viitenumero: {model.referenceNumber}</Text>
            {model.interestRate ? <Text>Viivästyskorko: {model.interestRate}</Text> : null}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={styles.colDesc}>Kuvaus</Text>
            <Text style={styles.colQty}>Määrä</Text>
            <Text style={styles.colUnit}>Yksikkö</Text>
            <Text style={styles.colPrice}>Á-hinta veroton</Text>
            <Text style={styles.colVat}>ALV</Text>
            <Text style={styles.colTotal}>Yhteensä</Text>
          </View>
          {model.lines.map((row) => (
            <View key={`${row.description}-${row.total}-${row.quantity}`} style={styles.tableRow}>
              <Text style={styles.colDesc}>{row.description}</Text>
              <Text style={styles.colQty}>{row.quantity}</Text>
              <Text style={styles.colUnit}>{row.unit}</Text>
              <Text style={styles.colPrice}>{row.unitPrice}</Text>
              <Text style={styles.colVat}>{row.vat}</Text>
              <Text style={styles.colTotal}>{row.total}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text>Veroton välisumma</Text>
            <Text>{model.subtotal}</Text>
          </View>
          {model.vatRows.map((row) => (
            <View key={row.label} style={styles.summaryRow}>
              <Text>{row.label}</Text>
              <Text>{row.amount}</Text>
            </View>
          ))}
          <View style={styles.grand}>
            <Text>Laskun loppusumma</Text>
            <Text>{model.total}</Text>
          </View>
        </View>

        <View style={styles.pay}>
          <Text style={styles.payTitle}>Maksutiedot</Text>
          <View style={styles.payRow}>
            <Text>Saaja</Text>
            <Text>{model.sellerName}</Text>
          </View>
          <View style={styles.payRow}>
            <Text>IBAN</Text>
            <Text>{model.iban ?? "—"}</Text>
          </View>
          {model.bic ? (
            <View style={styles.payRow}>
              <Text>BIC</Text>
              <Text>{model.bic}</Text>
            </View>
          ) : null}
          <View style={styles.payRow}>
            <Text>Viitenumero</Text>
            <Text>{model.referenceNumber}</Text>
          </View>
          <View style={styles.payRow}>
            <Text>Eräpäivä</Text>
            <Text>{model.dueDate}</Text>
          </View>
          <View style={styles.payRow}>
            <Text style={styles.strong}>Maksettava</Text>
            <Text style={styles.strong}>{model.total}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
