import * as XLSX from 'xlsx'

// Esporta lead filtrati in CSV tramite SheetJS (già in progetto)
export function downloadLeadsCsv(leads, filename = 'leads_export.csv') {
  const rows = leads.map(l => ({
    'Nome/Azienda': l.nome ?? '',
    Email:          l.email ?? '',
    Telefono:       l.telefono ?? '',
    Servizio:       l.servizio ?? '',
    Prezzo:         l.prezzo ?? '',
    Stato:          l.stato ?? '',
    Data:           l.created_at
      ? new Date(l.created_at).toLocaleDateString('it-IT')
      : '',
  }))

  const sheet = XLSX.utils.json_to_sheet(rows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Lead')
  XLSX.writeFile(book, filename, { bookType: 'csv' })
}
