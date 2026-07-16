import { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { sendAttendanceEmailReport } from '@/api/attendance'

export function EmailReportDrawer({
  open,
  onClose,
  dateStart,
  dateEnd,
}: {
  open: boolean
  onClose: () => void
  dateStart: string
  dateEnd: string
}) {
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState(`Field Attendance Report - ${dateStart} to ${dateEnd}`)
  const [body, setBody] = useState('Please find attached the field attendance report for the selected dates.')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    setSending(true)
    setError('')
    try {
      await sendAttendanceEmailReport({
        dateStart,
        dateEnd,
        subject,
        body,
        cc,
        to: to || undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send email.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Send Attendance Report"
      description={`Emailing the Excel report for ${dateStart} to ${dateEnd}.`}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button 
            className="bg-[#1e58a2] hover:bg-[#16427d] text-white" 
            onClick={handleSend} 
            disabled={sending}
          >
            {sending ? 'Sending...' : 'Send Email'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">To</label>
          <Input 
            label=""
            placeholder="Defaults to Logicon Admin if empty" 
            value={to} 
            onChange={(e) => setTo(e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">CC</label>
          <Input 
            label=""
            placeholder="manager@example.com, hr@example.com" 
            value={cc} 
            onChange={(e) => setCc(e.target.value)} 
          />
          <p className="text-xs text-slate-500">Separate multiple emails with commas.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Subject</label>
          <Input 
            label=""
            value={subject} 
            onChange={(e) => setSubject(e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Message Body</label>
          <textarea
            className="flex min-h-[120px] w-full rounded-md border border-app-border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-app-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-app-primary disabled:cursor-not-allowed disabled:opacity-50"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
      </div>
    </Drawer>
  )
}
