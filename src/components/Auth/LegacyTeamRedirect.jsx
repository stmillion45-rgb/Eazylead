import { Navigate, useSearchParams } from 'react-router-dom'

/** Reindirizza i vecchi link /register?team=… verso /join-team?token=… */
export function LegacyTeamRedirect({ children }) {
  const [searchParams] = useSearchParams()
  const legacy = searchParams.get('team')
  if (legacy && !searchParams.get('token')) {
    return <Navigate to={`/join-team?token=${encodeURIComponent(legacy)}`} replace />
  }
  return children
}
