import * as XLSX from 'xlsx'
import { resolvePaymentStatus } from './receiptPayment'

export function downloadReceiptsCsv(ricevute, filename = 'ricevute_export.csv') {
  const rows = ricevute.map(r => ({
    Cliente:    r.leads?.nome ?? '',
    Email:      r.leads?.email ?? '',
    Data:       r.created_at
      ? new Date(r.created_at).toLocaleDateString('it-IT')
      : '',
    Imponibile: r.imponibile ?? '',
    IVA:        r.iva ?? '',
    Totale:     r.totale ?? '',
    Pagamento:  resolvePaymentStatus(r),
    Scadenza:   r.due_date
      ? new Date(r.due_date).toLocaleDateString('it-IT')
      : '',
  }))

  const sheet = XLSX.utils.json_to_sheet(rows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Ricevute')
  XLSX.writeFile(book, filename, { bookType: 'csv' })
}
