import { type FC, useCallback, useState } from 'react'

interface FileDropzoneProps {
  onFile: (file: File) => void
  accept?: string
  parsing?: boolean
  error?: string | null
}

export const FileDropzone: FC<FileDropzoneProps> = ({
  onFile,
  accept = '.pdf,.jpg,.jpeg,.png',
  parsing = false,
  error = null,
}) => {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          onFile(file)
          return
        }
        onFile(file)
      }
    },
    [onFile]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFile(file)
    },
    [onFile]
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
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      {parsing ? (
        <div style={{ color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          <div>Parsing document...</div>
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
            Drop invoice PDF or image here
          </div>
          <div style={{ fontSize: 14 }}>or click to browse</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>PDF, JPG, PNG up to 10MB</div>
        </div>
      )}
    </div>
  )
}