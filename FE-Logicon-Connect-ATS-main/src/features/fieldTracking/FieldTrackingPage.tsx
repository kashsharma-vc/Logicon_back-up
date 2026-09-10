import { useAuthStore } from '@/features/auth/authStore'
import { useParams } from 'react-router-dom'
import { useEffect, useRef, useState, useMemo } from 'react'

export function FieldTrackingPage() {
  const token = useAuthStore((state) => state.accessToken)
  const rawFieldSensesUrl = import.meta.env.VITE_FIELD_SENSES_URL || 'http://localhost:8080'

  const params = useParams()
  const rawSubPath = params['*'] || ''
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [theme, setTheme] = useState(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const newTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      setTheme(newTheme);
      iframeRef.current?.contentWindow?.postMessage({ type: 'THEME_CHANGE', theme: newTheme }, '*');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const iframeSrc = useMemo(() => {
    const baseUrl = rawFieldSensesUrl.replace(/\/+$/, '')
    const cleanSubPath = rawSubPath.replace(/^\/+/, '')
    const targetPath = cleanSubPath ? `/${cleanSubPath}` : ''
    const queryParams = new URLSearchParams()
    if (token) {
      queryParams.set('token', token)
    }
    queryParams.set('embedded', 'true')
    queryParams.set('theme', theme)
    return `${baseUrl}${targetPath}?${queryParams.toString()}`
  }, [rawFieldSensesUrl, rawSubPath, token, theme])

  return (
    <div className="-m-4 lg:-m-6 h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] overflow-hidden bg-app-bg">
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        className="h-full w-full border-0"
        title="Field Senses Dashboard"
        allow="geolocation; camera; microphone"
      />
    </div>
  )
}
