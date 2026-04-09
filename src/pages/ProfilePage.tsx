import { useState, useEffect } from 'react'
import { useProfile } from '../hooks/useProfile'

export function ProfilePage() {
  const { profile, loading, error, updateProfile } = useProfile()

  const [nif, setNif] = useState('')
  const [homeOfficePct, setHomeOfficePct] = useState(20)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [nifError, setNifError] = useState<string | null>(null)

  // Sync form with profile data when it loads
  useEffect(() => {
    if (profile) {
      setNif(profile.nif ?? '')
      setHomeOfficePct(profile.home_office_pct ?? 20)
    }
  }, [profile])

  // Clear success message after 3 seconds
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [saveSuccess])

  function validateNif(value: string): boolean {
    // Basic NIF validation: 8 digits + 1 letter (or empty)
    if (!value) return true // Empty is valid (optional field)
    const nifPattern = /^[0-9]{8}[A-Z]$/i
    return nifPattern.test(value)
  }

  async function handleSave() {
    // Validate NIF format
    if (!validateNif(nif)) {
      setNifError('El NIF debe tener 8 dígitos seguidos de una letra (ej: 12345678A)')
      return
    }
    setNifError(null)

    setSaving(true)
    setSaveError(null)
    try {
      await updateProfile({
        nif: nif || null,
        home_office_pct: homeOfficePct,
      })
      setSaveSuccess(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-muted)' }}>
        Cargando...
      </div>
    )
  }

  return (
    <div>
      <h2 style={{
        fontFamily: 'var(--font-sans)',
        fontWeight: 600,
        fontSize: '1.25rem',
        marginBottom: 'var(--space-lg)',
        color: 'var(--color-primary)',
      }}>
        Mi Perfil
      </h2>

      <div className="card" style={{ maxWidth: 480 }}>
        {/* Success banner */}
        {saveSuccess && (
          <div className="banner banner-success" style={{ marginBottom: 'var(--space-md)' }}>
            Cambios guardados
          </div>
        )}

        {/* Error banner */}
        {(error || saveError) && (
          <div className="banner banner-error" style={{ marginBottom: 'var(--space-md)' }}>
            {saveError ?? error}
          </div>
        )}

        {/* NIF field */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label style={{
            display: 'block',
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            fontSize: '0.875rem',
            color: 'var(--color-primary)',
            marginBottom: 'var(--space-xs)',
          }}>
            NIF (Número de Identificación Fiscal)
          </label>
          <input
            type="text"
            className={`input${nifError ? ' error' : ''}`}
            value={nif}
            onChange={(e) => {
              setNif(e.target.value.toUpperCase())
              setNifError(null)
            }}
            placeholder="12345678A"
            maxLength={20}
            style={{
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
            }}
          />
          {nifError && (
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.75rem',
              color: 'var(--color-debt)',
              marginTop: 'var(--space-xs)',
            }}>
              {nifError}
            </p>
          )}
        </div>

        {/* Home Office % field */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <label style={{
            display: 'block',
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            fontSize: '0.875rem',
            color: 'var(--color-primary)',
            marginBottom: 'var(--space-xs)',
          }}>
            Porcentaje de Trabajo en Casa
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="number"
              className="input input-mono"
              value={homeOfficePct}
              onChange={(e) => setHomeOfficePct(Number(e.target.value))}
              min={0}
              max={100}
              step={1}
              style={{
                paddingRight: 'var(--space-xl)',
                fontFamily: 'var(--font-mono)',
                textAlign: 'right',
              }}
            />
            <span style={{
              position: 'absolute',
              right: 'var(--space-md)',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-muted)',
              pointerEvents: 'none',
            }}>
              %
            </span>
          </div>
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.75rem',
            color: 'var(--color-muted)',
            marginTop: 'var(--space-xs)',
          }}>
            Porcentaje del tiempo que trabajas desde casa (affecta deducciones de alquiler, electricidad, agua)
          </p>
        </div>

        {/* Save button */}
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  )
}
