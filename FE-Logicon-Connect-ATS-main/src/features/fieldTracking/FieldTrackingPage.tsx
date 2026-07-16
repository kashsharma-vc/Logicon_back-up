import { useAuthStore } from '@/features/auth/authStore'
import { useParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

export function FieldTrackingPage() {
  const token = useAuthStore((state) => state.accessToken)
  const fieldSensesUrl = import.meta.env.VITE_FIELD_SENSES_URL || 'http://localhost:8080'

  const params = useParams()
  const subPath = params['*'] || ''
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

  return (
    <div className="-m-4 lg:-m-6 h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] overflow-hidden bg-app-bg">
      <iframe
        ref={iframeRef}
        src={`${fieldSensesUrl}/${subPath}?token=${token}&embedded=true&theme=${theme}`}
        className="h-full w-full border-0"
        title="Field Senses Dashboard"
        allow="geolocation; camera; microphone"
      />
    </div>
  )
}
