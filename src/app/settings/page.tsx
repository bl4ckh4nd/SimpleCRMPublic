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
  password: z.string().optional(), // Made optional, will not require min(1) if empty
  port: z.coerce.number().int().min(1).max(65535),
  encrypt: z.boolean(),
  trustServerCertificate: z.boolean(),
  // JTL specific settings
  kBenutzer: z.coerce.number({ invalid_type_error: "kBenutzer must be a number" }).int("kBenutzer must be an integer").optional(),
  kShop: z.coerce.number({ invalid_type_error: "kShop must be a number" }).int("kShop must be an integer").optional(),
  kPlattform: z.coerce.number({ invalid_type_error: "kPlattform must be a number" }).int("kPlattform must be an integer").optional(),
  kSprache: z.coerce.number({ invalid_type_error: "kSprache must be a number" }).int("kSprache must be an integer").optional(),
  cWaehrung: z.string().optional(),
  fWaehrungFaktor: z.coerce.number({ invalid_type_error: "fWaehrungFaktor must be a number" }).optional(),
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
      password: "", // Default to empty, placeholder will indicate optional
      port: 1433,
      encrypt: true,
      trustServerCertificate: false,
      // JTL specific defaults
      kBenutzer: undefined, // Use undefined for optional numbers to avoid sending 0 if not set
      kShop: undefined,
      kPlattform: undefined,
      kSprache: undefined,
      cWaehrung: "EUR",
      fWaehrungFaktor: 1.0,
    },
  })

  // Fetch settings and connection status on load
  useEffect(() => {
    const fetchSettings = async () => {
      if (window.electronAPI && (window.electronAPI as any).invoke) {
        try {
          const settingsFromIPC = await (window.electronAPI as any).invoke('mssql:get-settings');
          if (settingsFromIPC) {
            // For form reset, ensure password field is an empty string if password is undefined
            const formValues = { ...settingsFromIPC, password: settingsFromIPC.password || "" };
            form.reset(formValues);

            // Test connection with settings as obtained from IPC.
            // If settingsFromIPC.password is undefined, testConnectionWithKeytar will try to use the stored password.
            try {
              const testResult = await (window.electronAPI as any).invoke('mssql:test-connection', settingsFromIPC);
              setConnectionStatus(testResult.success ? 'success' : 'error');
            } catch (error) {
              console.error("Error testing connection on load:", error);
              setConnectionStatus('error');
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

  const testAndSaveConnection = async (dataForTest: SettingsForm, dataForSave: Partial<SettingsForm>) => {
    console.log('[SettingsPage] testAndSaveConnection initiated')
    console.log('[SettingsPage] dataForTest (before API check):', JSON.stringify(dataForTest, null, 2))
    console.log('[SettingsPage] dataForSave (before API check):', JSON.stringify(dataForSave, null, 2))
    setIsTesting(true)

    console.log('[SettingsPage] Checking if window.electronAPI and invoke are available...');
    if (!window.electronAPI || !(window.electronAPI as any).invoke) {
      console.error('[SettingsPage] Electron API or invoke method is NOT available.');
      toast({ variant: "destructive", title: "Error", description: "Electron API is not available." })
      setIsTesting(false)
      return
    }
    console.log('[SettingsPage] Electron API and invoke method ARE available. Proceeding to test connection.');

    try {
      // Use dataForTest for the connection test
      console.log('[SettingsPage] Attempting to invoke mssql:test-connection with dataForTest:', dataForTest);
      const testResult: { success: boolean; error?: string } = await (window.electronAPI as any).invoke('mssql:test-connection', dataForTest)
      console.log('[SettingsPage] mssql:test-connection IPC call returned:', testResult);
      setConnectionStatus(testResult.success ? 'success' : 'error')
 
      if (testResult.success) {
        console.log('[SettingsPage] Connection test successful. Proceeding to save settings with dataForSave:', dataForSave);
        // Use dataForSave for saving settings
        const saveResult: { success: boolean; error?: string } = await (window.electronAPI as any).invoke('mssql:save-settings', dataForSave)
        console.log('[SettingsPage] mssql:save-settings IPC call returned:', saveResult);

        if (saveResult.success) {
          toast({ title: "Success", description: "Connection successful and settings saved." })
          console.log('[SettingsPage] Settings saved successfully. Fetching updated settings...');
          // Optionally, re-fetch settings to update form with potentially cleaned/stored values
          // and confirm sync status or navigate
          const newSettings = await (window.electronAPI as any).invoke('mssql:get-settings');
          console.log('[SettingsPage] Fetched new settings after save:', newSettings);
          if (newSettings) {
            form.reset({ ...newSettings, password: newSettings.password || "" });
          }
          navigate({ to: '/customers' })
        } else {
          console.error('[SettingsPage] Save settings failed. IPC Result:', saveResult);
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

  const onSubmit = async (formData: SettingsForm) => {
    // formData contains the current values from the form fields
    const dataToSave: Partial<SettingsForm> = { ...formData };
    const dataToTest: SettingsForm = { ...formData }; // Start with all form data for testing

    if (formData.password === "") {
      // For saving: if password field is empty, it means "don't change existing password".
      // So, we delete the password property from the object to be sent for saving.
      delete dataToSave.password;

      // For testing: if password field is empty, it means "use stored password".
      // The backend 'mssql:test-connection' (testConnectionWithKeytar) will handle
      // 'password: undefined' by trying to fetch from keytar.
      dataToTest.password = undefined; // Explicitly set to undefined for test
    }
    // If formData.password is a non-empty string, it's used for both testing (in dataToTest)
    // and saving (in dataToSave).

    await testAndSaveConnection(dataToTest, dataToSave);
  }

  const handleTestConnection = async () => {
    setIsConnecting(true)
    const formData = form.getValues()
    const dataToTest = { ...formData };
    if (dataToTest.password === "") {
        delete dataToTest.password; // Don't send empty password for testing if not changed
    }

    if (!window.electronAPI || !(window.electronAPI as any).invoke) {
      toast({ variant: "destructive", title: "Error", description: "Electron API is not available." })
      setIsConnecting(false)
      return
    }
    try {
      const testResult: { success: boolean; error?: string } = await (window.electronAPI as any).invoke('mssql:test-connection', dataToTest)
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
        // Further check if details exist and have the expected properties
        if (result.details && typeof result.details.found === 'number' && typeof result.details.synced === 'number') {
            feedback += ` Found: ${result.details.found}. Synced: ${result.details.synced}.`;
        } else if (result.details) {
            // Fallback if details structure is not as expected but exists
            feedback += ` (Details: ${JSON.stringify(result.details)})`;
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
            <CardTitle>Einstellungen zur Verbindung mit MSSQL-Server & JTL</CardTitle>
            <CardDescription>
              Konfigurieren Sie Ihre Verbindung zum MSSQL-Server und JTL-spezifische Standardwerte.
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
                        <Input type="password" {...field} placeholder="Leer lassen, um nicht zu ändern" />
                      </FormControl>
                      <FormDescription>
                        Wenn Sie das Passwort nicht ändern möchten, lassen Sie dieses Feld leer.
                      </FormDescription>
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

                <CardTitle className="text-lg pt-4 border-t mt-4">JTL Standardwerte für Aufträge</CardTitle>
                
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="kBenutzer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>kBenutzer</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="JTL Benutzer ID" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || undefined)} />
                        </FormControl>
                        <FormDescription>Interne JTL Benutzer-ID.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="kShop"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>kShop</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="JTL Shop ID" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || undefined)} />
                        </FormControl>
                        <FormDescription>Interne JTL Shop-ID.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="kPlattform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>kPlattform</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="JTL Plattform ID" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || undefined)} />
                        </FormControl>
                        <FormDescription>Interne JTL Plattform-ID.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="kSprache"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>kSprache</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="JTL Sprache ID" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || undefined)} />
                        </FormControl>
                        <FormDescription>Interne JTL Sprach-ID.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="cWaehrung"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Währung</FormLabel>
                        <FormControl>
                          <Input placeholder="EUR" {...field} />
                        </FormControl>
                        <FormDescription>Standardwährung (z.B. EUR).</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fWaehrungFaktor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Währungsfaktor</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="1.0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                        </FormControl>
                        <FormDescription>Faktor für die Standardwährung.</FormDescription>
                        <FormMessage />
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
