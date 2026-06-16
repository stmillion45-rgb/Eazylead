import { useState, useCallback } from 'react'
import { invokeEdgeFunction } from '../utils/invokeFunction'

export function useLeo(onUsageUpdate) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState(null)
  const [lastUsage, setLastUsage] = useState(null)

  const ask = useCallback(async (action, payload) => {
    setLoading(true)
    setError(null)
    setResult('')

    const { data, error: msg, code } = await invokeEdgeFunction('ai-copilot', { action, payload })

    setLoading(false)

    if (msg) {
      setError(msg)
      onUsageUpdate?.()
      return { text: null, error: msg, code: code ?? null }
    }

    const text = data?.text ?? ''
    setResult(text)
    if (data?.usage) setLastUsage(data.usage)
    onUsageUpdate?.()
    return { text, error: null, code: null, usage: data?.usage }
  }, [onUsageUpdate])

  const reset = useCallback(() => {
    setResult('')
    setError(null)
  }, [])

  return { ask, loading, result, error, reset, lastUsage }
}
