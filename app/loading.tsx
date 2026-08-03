export default function Loading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0A0A0F',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '3px solid rgba(200,242,60,0.15)',
          borderTopColor: '#C8F23C',
          animation: 'vtx-spin 0.8s linear infinite',
        }}
      />
      <style>{`
        @keyframes vtx-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
