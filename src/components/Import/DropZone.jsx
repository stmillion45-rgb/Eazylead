import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, X } from 'lucide-react'

// Formati accettati (per l'attributo accept e per la validazione)
const ACCEPTED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel',                                           // .xls
  'text/csv',                                                            // .csv
  'text/comma-separated-values',
]
const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv']

// ===================================================
// COMPONENTE — DropZone
// Area drag-and-drop per selezione file Excel/CSV.
//
// Props:
//   onFile    {fn}      — callback con oggetto File selezionato
//   disabled  {boolean} — disabilita interazioni durante import
// ===================================================
export default function DropZone({ onFile, disabled }) {
  const [dragging, setDragging]     = useState(false)
  const [fileError, setFileError]   = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const inputRef = useRef(null)

  // Valida il file per tipo e restituisce un messaggio d'errore o null
  function validateFile(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    const validExt  = ACCEPTED_EXTENSIONS.includes(ext)
    const validType = ACCEPTED_TYPES.includes(file.type) || file.type === ''

    if (!validExt && !validType) {
      return `Formato non supportato: ${file.name}. Usa .xlsx, .xls o .csv`
    }
    if (file.size > 10 * 1024 * 1024) { // limite 10 MB
      return 'Il file supera i 10 MB. Riduci la dimensione del file.'
    }
    return null
  }

  function processFile(file) {
    setFileError(null)
    const err = validateFile(file)
    if (err) {
      setFileError(err)
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
    onFile(file)
  }

  // --- Drag events ---
  function handleDragOver(e) {
    e.preventDefault()
    if (!disabled) setDragging(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    setDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  // --- Click sull'area o sul bottone ---
  function handleClick() {
    if (!disabled) inputRef.current?.click()
  }

  function handleInputChange(e) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reset input per permettere di selezionare lo stesso file di nuovo
    e.target.value = ''
  }

  function clearFile(e) {
    e.stopPropagation()
    setSelectedFile(null)
    setFileError(null)
  }

  // Formatta dimensione file
  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div>
      {/* Input nascosto */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(',')}
        onChange={handleInputChange}
        className="hidden"
        aria-label="Seleziona file Excel o CSV"
      />

      {/* Area drop */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center
          border-2 border-dashed rounded-xl
          p-8 text-center
          transition-all duration-200 cursor-pointer
          min-h-[180px]
          ${disabled
            ? 'opacity-50 cursor-not-allowed border-slate-700 bg-slate-900/30'
            : dragging
              ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01]'
              : selectedFile
                ? 'border-emerald-700 bg-emerald-950/20 hover:border-emerald-600'
                : 'border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900'
          }
        `}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={e => e.key === 'Enter' && handleClick()}
        aria-disabled={disabled}
      >
        {selectedFile ? (
          /* File selezionato — mostra anteprima */
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-emerald-950 border border-emerald-800 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-slate-200 font-medium text-sm">{selectedFile.name}</p>
              <p className="text-slate-500 text-xs mt-0.5">{formatSize(selectedFile.size)}</p>
            </div>
            {!disabled && (
              <button
                onClick={clearFile}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-xs transition-colors mt-1"
              >
                <X className="w-3 h-3" />
                Cambia file
              </button>
            )}
          </div>
        ) : (
          /* Nessun file — mostra istruzioni */
          <div className="flex flex-col items-center gap-3">
            <div className={`
              w-12 h-12 rounded-xl border flex items-center justify-center
              transition-colors duration-200
              ${dragging
                ? 'bg-cyan-950 border-cyan-700'
                : 'bg-slate-800 border-slate-700'
              }
            `}>
              <Upload className={`w-6 h-6 ${dragging ? 'text-cyan-400' : 'text-slate-500'}`} />
            </div>
            <div>
              <p className="text-slate-300 font-medium text-sm">
                {dragging ? 'Rilascia il file qui' : 'Trascina il file qui'}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                oppure{' '}
                <span className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                  seleziona dal computer
                </span>
              </p>
            </div>
            <p className="text-slate-600 text-xs">
              Formati supportati: .xlsx · .xls · .csv · max 10 MB
            </p>
          </div>
        )}
      </div>

      {/* Messaggio errore file */}
      {fileError && (
        <div className="mt-2 flex items-start gap-2 bg-red-950 border border-red-900 rounded-lg px-3 py-2.5">
          <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{fileError}</p>
        </div>
      )}
    </div>
  )
}
