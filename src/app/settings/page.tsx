"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"

const settingsSchema = z.object({
  server: z.string().min(1, "Server is required"),
  database: z.string().min(1, "Database name is required"),
  user: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  port: z.coerce.number().int().min(1).max(65535),
  encrypt: z.boolean(),
  trustServerCertificate: z.boolean(),
})

type SettingsForm = z.infer<typeof settingsSchema>

export default function SettingsPage() {
  const [isTesting, setIsTesting] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown')
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string | null>(null)
  const navigate = useNavigate()
  const { toast } = useToast()

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      server: "",
      database: "",
      user: "",
      password: "",
      port: 1433,
      encrypt: true,
      trustServerCertificate: false,
    },
  })

  // Fetch settings and connection status on load
  useEffect(() => {
    const fetchSettings = async () => {
      if (window.electronAPI && (window.electronAPI as any).invoke) {
        try {
          const settings = await (window.electronAPI as any).invoke('mssql:get-settings')
          if (settings) {
            form.reset(settings)
            // Test connection with saved settings
            try {
              const testResult = await (window.electronAPI as any).invoke('mssql:test-connection', settings)
              setConnectionStatus(testResult.success ? 'success' : 'error')
            } catch (error) {
              console.error("Error testing connection:", error)
              setConnectionStatus('error')
            }
          }
        } catch (error) {
          console.error("Error fetching settings:", error)
          toast({ variant: "destructive", title: "Error", description: "Could not load MSSQL settings." })
        }
      } else {
        console.warn("Electron API or invoke method not available.")
        toast({ variant: "default", title: "Setup", description: "Electron API not available. Cannot load settings." })
      }
    }
    fetchSettings()
  }, [form, toast])

  // Fetch sync status
  useEffect(() => {
    const fetchSyncStatus = async () => {
      if (window.electronAPI && (window.electronAPI as any).invoke) {
        try {
          const syncStatus = await (window.electronAPI as any).invoke('sync:get-status')
          if (syncStatus && syncStatus.status === 'Success' && syncStatus.timestamp) {
            setLastSyncTimestamp(syncStatus.timestamp)
            setSyncStatusMessage(syncStatus.message || null)
          }
        } catch (error) {
          console.error("Error fetching sync status:", error)
        }
      }
    }
    fetchSyncStatus()
  }, [])

  const testAndSaveConnection = async (data: SettingsForm) => {
    setIsTesting(true)
    if (!window.electronAPI || !(window.electronAPI as any).invoke) {
      toast({ variant: "destructive", title: "Error", description: "Electron API is not available." })
      setIsTesting(false)
      return
    }
    try {
      const testResult: { success: boolean; error?: string } = await (window.electronAPI as any).invoke('mssql:test-connection', data)
      setConnectionStatus(testResult.success ? 'success' : 'error')

      if (testResult.success) {
        const saveResult: { success: boolean; error?: string } = await (window.electronAPI as any).invoke('mssql:save-settings', data)
        if (saveResult.success) {
          toast({ title: "Success", description: "Connection successful and settings saved." })
          navigate({ to: '/customers' })
        } else {
          toast({ variant: "destructive", title: "Save Failed", description: saveResult.error || "Could not save settings." })
        }
      } else {
        toast({ variant: "destructive", title: "Connection Failed", description: testResult.error || "Could not connect to MSSQL server." })
      }
    } catch (error: any) {
      console.error("Error testing/saving connection:", error)
      toast({ variant: "destructive", title: "Error", description: error.message || "An unexpected error occurred." })
      setConnectionStatus('error')
    } finally {
      setIsTesting(false)
    }
  }

  const onSubmit = async (data: SettingsForm) => {
    await testAndSaveConnection(data)
  }

  const handleTestConnection = async () => {
    setIsConnecting(true)
    const formData = form.getValues()
    if (!window.electronAPI || !(window.electronAPI as any).invoke) {
      toast({ variant: "destructive", title: "Error", description: "Electron API is not available." })
      setIsConnecting(false)
      return
    }
    try {
      const testResult: { success: boolean; error?: string } = await (window.electronAPI as any).invoke('mssql:test-connection', formData)
      setConnectionStatus(testResult.success ? 'success' : 'error')
      if (testResult.success) {
        toast({ title: "Success", description: "Connection successful." })
      } else {
        toast({ variant: "destructive", title: "Connection Failed", description: testResult.error || "Could not connect to MSSQL server." })
      }
    } catch (error: any) {
      console.error("Error testing connection:", error)
      toast({ variant: "destructive", title: "Error", description: error.message || "An unexpected error occurred." })
      setConnectionStatus('error')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncStatusMessage("Starting synchronization...")
    if (!window.electronAPI || !(window.electronAPI as any).invoke) {
      toast({ variant: "destructive", title: "Error", description: "Electron API is not available." })
      setSyncStatusMessage("Error: Electron API not available.")
      setIsSyncing(false)
      return
    }
    try {
      const result: { success: boolean; message: string; details?: { found?: number; synced?: number } } = 
        await (window.electronAPI as any).invoke('sync:run')
      
      if (result.success) {
        let feedback = result.message || "Sync successful.";
        if (result.details) {
            feedback += ` Found: ${result.details.found ?? 'N/A'}. Synced: ${result.details.synced ?? 'N/A'}.`;
        }
        toast({ title: "Sync Complete", description: feedback })
        setSyncStatusMessage(feedback)
        
        // Fetch updated sync status to get the new timestamp
        try {
          const syncStatus = await (window.electronAPI as any).invoke('sync:get-status')
          if (syncStatus && syncStatus.timestamp) {
            setLastSyncTimestamp(syncStatus.timestamp)
          }
        } catch (error) {
          console.error("Error fetching updated sync status:", error)
        }
      } else {
        const errorMsg = result.message || "Sync failed."
        toast({ variant: "destructive", title: "Sync Failed", description: errorMsg })
        setSyncStatusMessage(`Error: ${errorMsg}`)
      }
    } catch (error: any) {
      console.error("Error running sync:", error)
      const errorMsg = error.message || "An unexpected error occurred during sync."
      toast({ variant: "destructive", title: "Sync Error", description: errorMsg })
      setSyncStatusMessage(`Error: ${errorMsg}`)
    } finally {
      setIsSyncing(false)
    }
  }

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString()
    } catch (error) {
      return timestamp
    }
  }

  return (
    <main className="flex-1">
      <div className="container mx-auto max-w-2xl py-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Einstellungen zur Verbindung mit MSSQL-Server</CardTitle>
            <CardDescription>
              Konfigurieren Sie Ihre Verbindung zum MSSQL-Server.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="server"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Server</FormLabel>
                        <FormControl>
                          <Input placeholder="localhost" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Port</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="database"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Datenbank</FormLabel>
                        <FormControl>
                          <Input placeholder="ihre_datenbank" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="user"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Benutzername</FormLabel>
                        <FormControl>
                          <Input placeholder="sa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passwort</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="encrypt"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0">
                          <FormLabel className="text-sm">Verbindung verschlüsseln</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trustServerCertificate"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0">
                          <FormLabel className="text-sm">Serverzertifikat akzeptieren</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center space-x-4 pt-2">
                  <Button type="submit" disabled={isTesting || isConnecting || isSyncing}>
                    {isTesting ? "Speichern..." : "Einstellungen speichern"}
                  </Button>
                  <div className="flex items-center space-x-2">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={isTesting || isConnecting || isSyncing}
                      className="flex items-center space-x-2"
                    >
                      {isConnecting ? "Teste..." : "Verbindung testen"}
                    </Button>
                    <div className="flex items-center justify-center">
                      {getConnectionStatusIcon()}
                    </div>
                  </div>
                  <Button 
                    type="button"
                    variant="secondary"
                    onClick={handleSync}
                    disabled={isTesting || isConnecting || isSyncing}
                  >
                    {isSyncing ? "Synchronisiere..." : "Synchronisation starten"}
                  </Button>
                </div>
                
                {(syncStatusMessage || lastSyncTimestamp) && (
                  <div className="pt-4 space-y-2">
                    {lastSyncTimestamp && (
                      <div className="text-sm font-medium">
                        Letzte erfolgreiche Synchronisation: {formatTimestamp(lastSyncTimestamp)}
                      </div>
                    )}
                    {syncStatusMessage && (
                      <div className="text-sm text-muted-foreground">
                        {syncStatusMessage}
                      </div>
                    )}
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
