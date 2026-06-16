import * as XLSX from 'xlsx'

// ===================================================
// MODULO — excelParser.js
// Parsing client-side di file Excel/CSV con SheetJS.
// Mappa automaticamente le intestazioni del file
// ai campi del database tramite fuzzy matching.
// ===================================================

// Mappa fuzzy: campo DB → varianti accettate (case-insensitive, match parziale)
const HEADER_MAP = {
  nome:     ['nome', 'nominativo', 'ragione sociale', 'cliente', 'contatto', 'intestatario'],
  email:    ['email', 'mail', 'e-mail', 'posta', 'indirizzo email'],
  telefono: ['tel', 'telefono', 'cellulare', 'mobile', 'cell', 'phone'],
  servizio: ['servizio', 'prestazione', 'descrizione', 'prodotto', 'lavoro'],
  prezzo:   ['prezzo', 'importo', 'valore', 'totale', 'costo', 'tariffa', 'fee'],
}

// Normalizza un'intestazione per il confronto (lowercase, spazi ridotti, no punteggiatura)
function normalizeHeader(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // rimuove caratteri speciali
    .replace(/\s+/g, ' ')
}

// Restituisce il campo DB corrispondente all'intestazione, o null se non trovato
function matchHeader(rawHeader) {
  const h = normalizeHeader(rawHeader)
  for (const [field, variants] of Object.entries(HEADER_MAP)) {
    for (const variant of variants) {
      // Match esatto o match parziale (l'intestazione contiene la variante)
      if (h === variant || h.includes(variant) || variant.includes(h)) {
        return field
      }
    }
  }
  return null
}

// Pulisce e converte un valore prezzo in numero
// Gestisce formati tipo: "€ 1.200,50", "$1200.50", "1.500", ecc.
export function parsePrezzo(val) {
  if (!val && val !== 0) return 0.00
  return parseFloat(
    String(val)
      .replace(/[€$£\s]/g, '')   // rimuove simboli valuta e spazi
      .replace(/\./g, '')         // rimuove separatori migliaia (formato italiano)
      .replace(',', '.')          // converte separatore decimale
  ) || 0.00
}

// ===================================================
// FUNZIONE PRINCIPALE — parseExcelFile
// Accetta un oggetto File, restituisce una Promise
// che risolve con { records, warnings } oppure
// rigetta con un Error descrittivo.
//
// records: array di oggetti pronti per insert Supabase
//   { nome, email, telefono, servizio, prezzo }
//
// warnings: array di stringhe con righe saltate/problematiche
// ===================================================
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Impossibile leggere il file. Potrebbe essere corrotto.'))

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)

        // SheetJS: legge il workbook dal buffer
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })

        // Usa il primo foglio
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
          reject(new Error('Il file non contiene fogli dati validi.'))
          return
        }

        const sheet = workbook.Sheets[sheetName]

        // Converte il foglio in array di array (righe × colonne)
        const rows = XLSX.utils.sheet_to_json(sheet, {
          header: 1,          // prima riga = array di valori grezzi
          defval: '',         // celle vuote → stringa vuota
          blankrows: false,   // salta righe completamente vuote
        })

        if (rows.length < 2) {
          reject(new Error('Il file sembra vuoto o privo di dati sotto l\'intestazione.'))
          return
        }

        // Prima riga = intestazioni
        const rawHeaders = rows[0]
        const dataRows   = rows.slice(1)

        // Costruisce mappa: indice colonna → campo DB
        const colMap = {}
        rawHeaders.forEach((h, idx) => {
          const field = matchHeader(h)
          if (field && !(field in Object.values(colMap))) {
            colMap[idx] = field
          }
        })

        // Verifica che almeno il campo "nome" sia stato trovato (obbligatorio)
        const mappedFields = Object.values(colMap)
        if (!mappedFields.includes('nome')) {
          reject(new Error(
            'Colonna "nome" non trovata nel file. ' +
            'Assicurati che il file contenga una colonna con intestazione ' +
            '"Nome", "Nominativo", "Cliente" o simili.'
          ))
          return
        }

        // Verifica che anche "servizio" sia presente (obbligatorio per il DB)
        if (!mappedFields.includes('servizio')) {
          reject(new Error(
            'Colonna "servizio" non trovata nel file. ' +
            'Assicurati che il file contenga una colonna con intestazione ' +
            '"Servizio", "Prestazione", "Prodotto" o simili.'
          ))
          return
        }

        const records  = []
        const warnings = []

        // Processa ogni riga dati
        dataRows.forEach((row, rowIdx) => {
          const record = {}

          Object.entries(colMap).forEach(([colIdx, field]) => {
            const rawValue = row[parseInt(colIdx)]
            if (field === 'prezzo') {
              record[field] = parsePrezzo(rawValue)
            } else {
              record[field] = rawValue ? String(rawValue).trim() : ''
            }
          })

          // Salta righe senza nome (campo obbligatorio)
          if (!record.nome) {
            warnings.push(`Riga ${rowIdx + 2}: saltata perché il campo "nome" è vuoto.`)
            return
          }

          // Assicura che servizio non sia vuoto (constraint DB)
          if (!record.servizio) {
            record.servizio = 'N/D'
            warnings.push(`Riga ${rowIdx + 2} (${record.nome}): servizio non trovato, impostato a "N/D".`)
          }

          records.push(record)
        })

        if (records.length === 0) {
          reject(new Error('Nessuna riga valida trovata nel file. Controlla che i dati siano presenti sotto l\'intestazione.'))
          return
        }

        const ALL_FIELDS = ['nome', 'email', 'telefono', 'servizio', 'prezzo']
        const mappedColumns = Object.fromEntries(
          ALL_FIELDS.map(f => [f, mappedFields.includes(f)]),
        )

        resolve({ records, warnings, mappedColumns })

      } catch (err) {
        reject(new Error(`Errore nel parsing del file: ${err.message}`))
      }
    }

    // Legge il file come ArrayBuffer (richiesto da SheetJS)
    reader.readAsArrayBuffer(file)
  })
}
