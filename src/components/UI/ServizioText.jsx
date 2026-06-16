import { formatServizioDisplay } from '../../utils/displayText'

export default function ServizioText({ servizio, as: Tag = 'span', className = '' }) {
  const { text, title } = formatServizioDisplay(servizio)
  return (
    <Tag className={className} title={title}>
      {text}
    </Tag>
  )
}
