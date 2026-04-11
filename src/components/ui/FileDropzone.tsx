import { type FC, useCallback, useState } from 'react'

interface FileDropzoneProps {
  onFiles: (files: File[]) => void
  accept?: string
  parsing?: boolean
  error?: string | null
}

export const FileDropzone: FC<FileDropzoneProps> = ({
  onFiles,
  accept = '.pdf,.jpg,.jpeg,.png',
  parsing = false,
  error = null,
}) => {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) onFiles(files)
    },
    [onFiles]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (files.length > 0) onFiles(files)
      e.target.value = ''
    },
    [onFiles]
  )

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${error ? 'var(--color-danger)' : dragging ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 12,
        padding: 'var(--space-xl)',
        textAlign: 'center',
        cursor: 'pointer',
        position: 'relative',
        background: dragging ? 'rgba(245,158,11,0.05)' : 'transparent',
        transition: 'all 200ms ease',
      }}
      onClick={() => !parsing && document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept={accept}
        multiple
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      {parsing ? (
        <div style={{ color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          <div>Parsing document(s)...</div>
        </div>
      ) : error ? (
        <div style={{ color: 'var(--color-danger)' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚠</div>
          <div>{error}</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Click to try again or enter manually</div>
        </div>
      ) : (
        <div style={{ color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
          <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
            Drop invoices or receipts here
          </div>
          <div style={{ fontSize: 14 }}>or click to browse — multiple files supported</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>PDF, JPG, PNG up to 10MB each</div>
        </div>
      )}
    </div>
  )
}
