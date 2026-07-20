"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { IPC } from "@shared/ipc/channels"
import type { EndpointResult } from "@shared/ipc/types"
import { invoke } from "@/lib/ipc"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type SmtpSettings = {
  enabled: boolean
  host: string
  port: number
  secure: boolean
  user: string
  password?: string | null
  from_address: string
  notify_to: string
  hasPassword?: boolean
}

type NotificationLogEntry = EndpointResult<typeof IPC.Notifications.GetLog>[number]
type NotificationStatus = EndpointResult<typeof IPC.Notifications.GetStatus>

const initialSmtp: SmtpSettings = {
  enabled: false,
  host: "",
  port: 587,
  secure: false,
  user: "",
  password: "",
  from_address: "",
  notify_to: "",
}

export default function NotificationsPage() {
  const [smtp, setSmtp] = useState(initialSmtp)
  const [digest, setDigest] = useState({ hour: 8, deals_days_ahead: 7 })
  const [status, setStatus] = useState<NotificationStatus | null>(null)
  const [log, setLog] = useState<NotificationLogEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const refresh = useCallback(async () => {
    const [nextStatus, nextLog] = await Promise.all([
      invoke(IPC.Notifications.GetStatus),
      invoke(IPC.Notifications.GetLog, { limit: 10 }),
    ])
    setStatus(nextStatus)
    setLog(nextLog)
  }, [])

  useEffect(() => {
    void invoke(IPC.Notifications.GetSettings).then((settings) => {
      setSmtp({ ...settings.smtp, password: "" })
      setDigest(settings.digest)
      return refresh()
    }).catch((error) => {
      console.error("Error loading notification settings:", error)
      toast.error("Benachrichtigungseinstellungen konnten nicht geladen werden")
    })
  }, [refresh])

  const validate = () => {
    if (!smtp.enabled) return null
    if (!smtp.host.trim()) return "Bitte geben Sie einen SMTP-Server an."
    if (smtp.port < 1 || smtp.port > 65535) return "Der SMTP-Port muss zwischen 1 und 65535 liegen."
    if (!smtp.from_address.includes("@") || !smtp.notify_to.includes("@")) return "Bitte prüfen Sie Absender und Empfänger."
    if (digest.hour < 0 || digest.hour > 23) return "Die Versandstunde muss zwischen 0 und 23 liegen."
    return null
  }

  const save = async () => {
    const error = validate()
    if (error) return toast.error("Eingaben prüfen", { description: error })
    setSaving(true)
    try {
      const result = await invoke(IPC.Notifications.SaveSettings, {
        smtp: { ...smtp, password: smtp.password || undefined },
        digest,
      })
      if (result.success) toast.success("E-Mail-Einstellungen gespeichert")
      else toast.error("Speichern fehlgeschlagen", { description: result.error })
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  const sendTest = async () => {
    setTesting(true)
    try {
      const result = await invoke(IPC.Notifications.SendTest)
      if (result.success) toast.success("Test-E-Mail gesendet")
      else toast.error("Test-E-Mail fehlgeschlagen", { description: result.error })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="E-Mail-Benachrichtigungen"
        subtitle="Tägliche Zusammenfassungen für fällige Aufgaben und Deals konfigurieren."
        actions={<Button onClick={save} disabled={saving}>{saving ? "Speichert …" : "Einstellungen speichern"}</Button>}
      />

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Versand</CardTitle>
              <CardDescription>SimpleCRM sendet einmal täglich, solange die Anwendung läuft. Verpasste Läufe werden beim nächsten Öffnen nachgeholt.</CardDescription>
            </div>
            <Switch aria-label="Benachrichtigungen aktivieren" checked={smtp.enabled} onCheckedChange={(enabled) => setSmtp((value) => ({ ...value, enabled }))} />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="smtp-host" label="SMTP-Server"><Input id="smtp-host" value={smtp.host} onChange={(event) => setSmtp((value) => ({ ...value, host: event.target.value }))} /></Field>
            <Field id="smtp-port" label="Port"><Input id="smtp-port" type="number" min={1} max={65535} value={smtp.port} onChange={(event) => setSmtp((value) => ({ ...value, port: Number(event.target.value) }))} /></Field>
            <Field id="smtp-user" label="Benutzername"><Input id="smtp-user" value={smtp.user} onChange={(event) => setSmtp((value) => ({ ...value, user: event.target.value }))} /></Field>
            <Field id="smtp-password" label="Passwort"><Input id="smtp-password" type="password" placeholder={smtp.hasPassword ? "Gespeichert – leer lassen zum Beibehalten" : "Passwort"} value={smtp.password ?? ""} onChange={(event) => setSmtp((value) => ({ ...value, password: event.target.value }))} /></Field>
            <Field id="smtp-from" label="Absender"><Input id="smtp-from" value={smtp.from_address} onChange={(event) => setSmtp((value) => ({ ...value, from_address: event.target.value }))} /></Field>
            <Field id="smtp-to" label="Empfänger"><Input id="smtp-to" value={smtp.notify_to} onChange={(event) => setSmtp((value) => ({ ...value, notify_to: event.target.value }))} /></Field>
            <Field id="digest-hour" label="Tägliche Versandstunde"><Input id="digest-hour" type="number" min={0} max={23} value={digest.hour} onChange={(event) => setDigest((value) => ({ ...value, hour: Number(event.target.value) }))} /></Field>
            <Field id="deals-days" label="Deals: Tage im Voraus"><Input id="deals-days" type="number" min={0} max={365} value={digest.deals_days_ahead} onChange={(event) => setDigest((value) => ({ ...value, deals_days_ahead: Number(event.target.value) }))} /></Field>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="smtp-secure" checked={smtp.secure} onCheckedChange={(secure) => setSmtp((value) => ({ ...value, secure }))} />
            <Label htmlFor="smtp-secure">Direktes TLS verwenden (typisch Port 465)</Label>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <Button variant="secondary" onClick={sendTest} disabled={testing}>{testing ? "Sendet …" : "Test-E-Mail senden"}</Button>
            <Button variant="outline" onClick={() => void refresh()}><RefreshCw /> Status aktualisieren</Button>
            {status?.nextRunAt && <span className="ml-auto text-sm text-muted-foreground">Nächster Lauf: {new Date(status.nextRunAt).toLocaleString("de-DE")}</span>}
          </div>
        </CardContent>
      </Card>

      {log.length > 0 && <Card className="mt-6">
        <CardHeader><CardTitle>Letzte Benachrichtigungen</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {log.map((entry) => <div key={entry.id} className="grid grid-cols-[1fr_auto] gap-4 border-b py-2 last:border-0">
            <span>{entry.sent_date} · {entry.task_count} Aufgaben · {entry.deal_count} Deals{entry.error_message ? ` · ${entry.error_message}` : ""}</span>
            <span className="text-muted-foreground">{entry.status}</span>
          </div>)}
        </CardContent>
      </Card>}
    </div>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{children}</div>
}
