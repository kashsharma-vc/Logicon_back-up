export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      className="shrink-0 border-t border-app-border bg-app-surface px-4 py-3 md:px-6"
      role="contentinfo"
    >
      <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-2 text-xs text-app-subtle sm:flex-row sm:gap-4">
        <p>
          (c) {year}{' '}
          <span className="font-medium text-app-secondary">Logicon</span>
          <span className="text-app-subtle"> - Logicon ATS - Enterprise</span>
        </p>
        <p className="text-center sm:text-right">For authorized users only. Contact your administrator for access.</p>
      </div>
    </footer>
  )
}



