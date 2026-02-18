const SPIN_STYLE = `
@keyframes chartgpu-spin {
  to { transform: rotate(360deg); }
}
`

interface ChartLoaderProps {
  width: number
  height: number
}

export function ChartLoader({ width, height }: ChartLoaderProps) {
  return (
    <>
      <style>{SPIN_STYLE}</style>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#080c1c',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '3px solid #1a2540',
            borderTopColor: '#3b82f6',
            animation: 'chartgpu-spin 0.7s linear infinite',
          }}
        />
      </div>
    </>
  )
}
