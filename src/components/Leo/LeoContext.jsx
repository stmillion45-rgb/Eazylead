import { createContext, useContext, useState, useCallback } from 'react'

const LeoContext = createContext(null)

export function LeoProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(null)

  const openLeo = useCallback((request = null) => {
    setPending(request)
    setOpen(true)
  }, [])

  const closeLeo = useCallback(() => {
    setOpen(false)
    setPending(null)
  }, [])

  return (
    <LeoContext.Provider value={{
      open,
      openLeo,
      closeLeo,
      pending,
      clearPending: () => setPending(null),
    }}>
      {children}
    </LeoContext.Provider>
  )
}

export function useLeoContext() {
  const ctx = useContext(LeoContext)
  if (!ctx) throw new Error('useLeoContext must be used within LeoProvider')
  return ctx
}
