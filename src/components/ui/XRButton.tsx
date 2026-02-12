import { useState } from 'react'

interface XRButtonProps {
  xrStore: any
  isMobile: boolean
}

export function XRButton({ xrStore, isMobile }: XRButtonProps) {
  const [isSupported, setIsSupported] = useState(true)

  const enterVR = async () => {
    try {
      await xrStore.enterVR()
    } catch (error) {
      console.error('Failed to enter VR:', error)
      setIsSupported(false)
    }
  }

  if (!isSupported) {
    return null // Hide button if VR is not supported
  }

  const buttonStyle = {
    padding: isMobile ? '8px 12px' : '10px 16px',
    fontSize: isMobile ? '12px' : '14px',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 'env(safe-area-inset-top, 16px)',
        right: '16px',
        zIndex: 10001,
      }}
    >
      <button
        onClick={enterVR}
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)'
        }}
        title="Enter Virtual Reality mode - optimized for Meta Quest"
      >
        {isMobile ? 'VR' : 'Enter VR'}
      </button>
    </div>
  )
}
