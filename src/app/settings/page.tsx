// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"

const settingsSchema = z.object({
  server: z.string().min(1, "Server ist erforderlich"),
  database: z.string().min(1, "Datenbankname ist erforderlich"),
  user: z.string().min(1, "Benutzername ist erforderlich"),
  password: z.string().optional(), // Made optional, will not require min(1) if empty
  port: z.coerce.number().int().min(1).max(65535),
  encrypt: z.boolean(),
  trustServerCertificate: z.boolean(),
  forcePort: z.boolean().optional(), // <-- New flag
  // JTL specific settings
  kBenutzer: z.coerce.number({ invalid_type_error: "kBenutzer muss eine Zahl sein" }).int("kBenutzer muss eine ganze Zahl sein").optional(),
  kShop: z.coerce.number({ invalid_type_error: "kShop muss eine Zahl sein" }).int("kShop muss eine ganze Zahl sein").optional(),
  kPlattform: z.coerce.number({ invalid_type_error: "kPlattform muss eine Zahl sein" }).int("kPlattform muss eine ganze Zahl sein").optional(),
  kSprache: z.coerce.number({ invalid_type_error: "kSprache muss eine Zahl sein" }).int("kSprache muss eine ganze Zahl sein").optional(),
  cWaehrung: z.string().optional(),
  fWaehrungFaktor: z.coerce.number({ invalid_type_error: "fWaehrungFaktor muss eine Zahl sein" }).optional(),
})

type SettingsForm = z.infer<typeof settingsSchema>

export default function SettingsPage() {
  const [isTesting, setIsTesting] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isClearingPassword, setIsClearingPassword] = useState(false); // New state for clearing password
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown')
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string | null>(null)

  
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
      forcePort: false, // <-- Default value for new flag
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
            // and provide a default for forcePort if it's not in stored settings (for backward compatibility)
            const formValues = { 
              ...settingsFromIPC, 
              password: settingsFromIPC.password || "",
              forcePort: settingsFromIPC.forcePort || false 
            };
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
          toast.error("Fehler", { description: "Konnte die MSSQL-Einstellungen nicht laden." })
        }
      } else {
        console.warn("Electron API or invoke method not available.")
        toast("Einrichtung", { description: "Electron API nicht verfügbar. Kann Einstellungen nicht laden." })
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
    setIsTesting(true)

    if (!window.electronAPI || !(window.electronAPI as any).invoke) {
      toast.error("Fehler", { description: "Electron API ist nicht verfügbar." })
      setIsTesting(false)
      return
    }

    try {
      const testResult: { success: boolean; error?: string; errorDetails?: any } = await (window.electronAPI as any).invoke('mssql:test-connection', dataForTest)
      setConnectionStatus(testResult.success ? 'success' : 'error')

      if (testResult.success) {
        const saveResult: { success: boolean; error?: string } = await (window.electronAPI as any).invoke('mssql:save-settings', dataForSave)

        if (saveResult.success) {
          toast.success("Einstellungen gespeichert", { description: "Verbindung erfolgreich und Einstellungen gespeichert." })
          const newSettings = await (window.electronAPI as any).invoke('mssql:get-settings');
          if (newSettings) {
            form.reset({ ...newSettings, password: newSettings.password || "" });
          }
        } else {
          toast.error("Speichern fehlgeschlagen", { description: saveResult.error || "Konnte die Einstellungen nicht speichern." })
        }
      } else {
        const errorMessage = testResult.error || "Konnte keine Verbindung zum MSSQL-Server herstellen.";
        const errorDetails = testResult.errorDetails;
        const description = errorDetails?.suggestion
          ? `${errorMessage}\n\nLösungsvorschlag: ${errorDetails.suggestion}`
          : errorMessage;
        toast.error("Verbindung fehlgeschlagen", { description })
      }
    } catch (error: any) {
      console.error("Error testing/saving connection:", error)
      toast.error("Fehler", { description: error.message || "Ein unerwarteter Fehler ist aufgetreten." })
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

  const handleClearPassword = async () => {
    setIsClearingPassword(true);
    if (!window.electronAPI || !(window.electronAPI as any).invoke) {
      toast({ variant: "destructive", title: "Fehler", description: "Electron API ist nicht verfügbar." });
      setIsClearingPassword(false);
      return;
    }
    try {
      const result: { success: boolean; message: string } = await (window.electronAPI as any).invoke('mssql:clear-password');
      if (result.success) {
        let germanMessage = "Das Passwort wurde erfolgreich gelöscht."; // Default success message
        // You can customize the message further based on specific success scenarios if needed:
        if (result.message === 'No password found in secure storage for the current settings.') {
            germanMessage = "Es wurde kein zu löschendes Passwort für die aktuellen Einstellungen gefunden (möglicherweise bereits entfernt).";
        } else if (result.message === 'No connection settings are fully configured, so no password to clear.') {
            germanMessage = "Keine vollständigen Verbindungseinstellungen konfiguriert, daher gibt es kein Passwort zum Löschen.";
        } else if (result.message === 'Password successfully cleared from secure storage.') {
            germanMessage = "Das Passwort wurde erfolgreich aus dem sicheren Speicher entfernt.";
        }
        toast.success("Erfolg", { description: germanMessage });
        form.setValue('password', ''); // Clear password field in the form
      } else {
        console.error('Fehler beim Löschen des Passworts (Backend-Nachricht):', result.message);
        toast.error("Fehlgeschlagen", { description: "Das Passwort konnte nicht gelöscht werden. Bitte überprüfen Sie die Konsolenprotokolle für weitere Details." });
      }
    } catch (error: any) {
      console.error("Fehler beim Löschen des Passworts (IPC):", error);
      toast.error("Fehler", { description: "Ein unerwarteter Fehler ist aufgetreten beim Löschen des Passworts. Überprüfen Sie die Konsolenprotokolle." });
    } finally {
      setIsClearingPassword(false);
    }
  };

  const handleTestConnection = async () => {
    setIsConnecting(true)
    const formData = form.getValues()
    const dataToTest = { ...formData };
    if (dataToTest.password === "") {
        delete dataToTest.password; // Don't send empty password for testing if not changed
    }

    if (!window.electronAPI || !(window.electronAPI as any).invoke) {
      toast.error("Fehler", { description: "Electron API ist nicht verfügbar." })
      setIsConnecting(false)
      return
    }
    try {
      const testResult: { success: boolean; error?: string; errorDetails?: any } = await (window.electronAPI as any).invoke('mssql:test-connection', dataToTest)
      setConnectionStatus(testResult.success ? 'success' : 'error')
      if (testResult.success) {
        toast.success("Verbindung erfolgreich.")
      } else {
        const errorMessage = testResult.error || "Konnte keine Verbindung zum MSSQL-Server herstellen.";
        const errorDetails = testResult.errorDetails;
        const description = errorDetails?.suggestion
          ? `${errorMessage}\n\nLösungsvorschlag: ${errorDetails.suggestion}`
          : errorMessage;
        toast.error("Verbindung fehlgeschlagen", { description })
      }
    } catch (error: any) {
      console.error("Error testing connection:", error)
      toast.error("Fehler", { description: error.message || "Ein unerwarteter Fehler ist aufgetreten." })
      setConnectionStatus('error')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncStatusMessage("Starte Synchronisation...")
    if (!window.electronAPI || !(window.electronAPI as any).invoke) {
      toast.error("Fehler", { description: "Electron API ist nicht verfügbar." })
      setSyncStatusMessage("Fehler: Electron API nicht verfügbar.")
      setIsSyncing(false)
      return
    }
    try {
      const result: { success: boolean; message: string; details?: { found?: number; synced?: number } } = 
        await (window.electronAPI as any).invoke('sync:run')
      
      if (result.success) {
        let feedback = result.message || "Sync erfolgreich.";
        // Further check if details exist and have the expected properties
        if (result.details && typeof result.details.found === 'number' && typeof result.details.synced === 'number') {
            feedback += ` Gefunden: ${result.details.found}. Synchronisiert: ${result.details.synced}.`;
        } else if (result.details) {
            // Fallback if details structure is not as expected but exists
            feedback += ` (Details: ${JSON.stringify(result.details)})`;
        }
        toast.success("Synchronisation abgeschlossen", { description: feedback })
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
        const errorMsg = result.message || "Sync fehlgeschlagen."
        toast.error("Sync fehlgeschlagen", { description: errorMsg })
        setSyncStatusMessage(`Fehler: ${errorMsg}`)
      }
    } catch (error: any) {
      console.error("Error running sync:", error)
      let errorMsg = error.message || "Ein unerwarteter Fehler ist aufgetreten während der Synchronisation."

      if (error.errorDetails) {
        errorMsg = error.errorDetails.userMessage || errorMsg;
        if (error.errorDetails.suggestion) {
          errorMsg += `\n\nLösungsvorschlag: ${error.errorDetails.suggestion}`;
        }
      }

      toast.error("Sync Fehler", { description: errorMsg })
      setSyncStatusMessage(`Fehler: ${errorMsg}`)
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
    <div>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>MSSQL-Server & JTL</CardTitle>
            <CardDescription>
              Verbindung zum MSSQL-Server konfigurieren und JTL-spezifische Standardwerte festlegen.
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

                {/* New Force Port Switch */}
                <FormField
                  control={form.control}
                  name="forcePort"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0">
                        <FormLabel className="text-sm">Port erzwingen</FormLabel>
                        <FormDescription className="text-xs">
                          Direkte Verbindung zum Port, umgeht SQL Browser für benannte Instanzen.
                        </FormDescription>
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
                {/* End New Force Port Switch */}

                <CardTitle className="text-lg pt-4 border-t mt-4">JTL Standardwerte für Aufträge</CardTitle>
                
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="kBenutzer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Benutzer-ID</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="z.B. 1" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || undefined)} />
                        </FormControl>
                        <FormDescription>Ihre JTL-Benutzer-ID (kBenutzer). Zu finden unter JTL-Wawi → Benutzer.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="kShop"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shop-ID</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="z.B. 1" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || undefined)} />
                        </FormControl>
                        <FormDescription>ID des JTL-Shops (kShop), dem Aufträge zugeordnet werden.</FormDescription>
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
                        <FormLabel>Plattform-ID</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="z.B. 1" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || undefined)} />
                        </FormControl>
                        <FormDescription>Verkaufsplattform in JTL (kPlattform), z.B. 1 = JTL-Shop.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="kSprache"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sprach-ID</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="z.B. 1" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || undefined)} />
                        </FormControl>
                        <FormDescription>Sprache für Aufträge (kSprache), z.B. 1 = Deutsch.</FormDescription>
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

                {/* Test Connection + Sync */}
                <div className="flex items-center gap-3 pt-4 mt-6 border-t">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={isTesting || isConnecting || isSyncing || isClearingPassword}
                    >
                      {isConnecting || isTesting ? "Teste..." : "Verbindung testen"}
                    </Button>
                    {getConnectionStatusIcon()}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSync}
                    disabled={isTesting || isConnecting || isSyncing || isClearingPassword}
                  >
                    {isSyncing ? "Synchronisiere..." : "Synchronisation starten"}
                  </Button>
                </div>

                {(syncStatusMessage || lastSyncTimestamp) && (
                  <div className="pt-3 space-y-1">
                    {lastSyncTimestamp && (
                      <p className="text-sm font-medium">
                        Letzte erfolgreiche Synchronisation: {formatTimestamp(lastSyncTimestamp)}
                      </p>
                    )}
                    {syncStatusMessage && (
                      <p className="text-sm text-muted-foreground">{syncStatusMessage}</p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-8 pt-4 border-t">
                  <Button type="submit" disabled={isTesting || isConnecting || isSyncing || isClearingPassword}>
                    {isTesting ? "Speichern..." : "Einstellungen speichern"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="mt-6 border-destructive/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive">Gefahrenzone</CardTitle>
            <CardDescription>
              Aktionen hier können nicht rückgängig gemacht werden.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Passwort löschen</p>
                <p className="text-sm text-muted-foreground">Entfernt das gespeicherte MSSQL-Passwort aus dem sicheren Speicher.</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isTesting || isConnecting || isSyncing || isClearingPassword}
                  >
                    {isClearingPassword ? "Lösche..." : "Passwort löschen"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Passwort wirklich löschen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Das gespeicherte Passwort wird unwiderruflich aus dem sicheren Speicher entfernt. Sie müssen das Passwort anschließend neu eingeben, um eine Verbindung herzustellen.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearPassword}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Passwort löschen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
  )
}
