interface MssqlErrorTranslations {
  de: string;
  en: string;
}

interface MssqlErrorDetails extends MssqlErrorTranslations {
  title_de: string;
  title_en: string;
  actionable_advice_de?: string;
  actionable_advice_en?: string;
  docsUrl?: string;
}

const MSSQL_ERROR_MAP: Record<string, MssqlErrorDetails> = {
  // Existing entries...
  'ETIMEOUT': {
    title_de: 'Timeout bei der Verbindung',
    title_en: 'Connection Timeout',
    de: 'Der Server hat nicht innerhalb der erwarteten Zeit geantwortet. Bitte überprüfen Sie Ihre Netzwerkverbindung und die Erreichbarkeit des Servers.',
    en: 'The server did not respond within the expected time. Please check your network connection and server availability.',
    actionable_advice_de: 'Stellen Sie sicher, dass der Server läuft und keine Firewall die Verbindung blockiert. Erhöhen Sie ggf. das Timeout-Limit in den Einstellungen.',
    actionable_advice_en: 'Ensure the server is running and no firewall is blocking the connection. If applicable, increase the timeout limit in the settings.',
  },
  'ECONNREFUSED': {
    title_de: 'Verbindung abgelehnt',
    title_en: 'Connection Refused',
    de: 'Der Server hat die Verbindung aktiv abgelehnt. Dies kann bedeuten, dass der Datenbankdienst nicht läuft oder der Port falsch ist.',
    en: 'The server actively refused the connection. This might mean the database service isn\'t running or the port is incorrect.',
    actionable_advice_de: 'Überprüfen Sie, ob der MSSQL-Dienst auf dem Server gestartet ist und der angegebene Port korrekt ist. Prüfen Sie auch Firewalleinstellungen.',
    actionable_advice_en: 'Verify that the MSSQL service is started on the server and that the specified port is correct. Also, check firewall settings.',
    docsUrl: 'https://learn.microsoft.com/sql/connect/ado-net/step-3-connect-sql-ado-net', // Example URL
  },
  'ELOGIN': {
    title_de: 'Anmeldefehler',
    title_en: 'Login Failed',
    de: 'Die Anmeldung am Datenbankserver ist fehlgeschlagen. Bitte überprüfen Sie Benutzername und Passwort.',
    en: 'Login to the database server failed. Please check your username and password.',
    actionable_advice_de: 'Stellen Sie sicher, dass Benutzername und Passwort korrekt sind und der Benutzer die erforderlichen Berechtigungen hat.',
    actionable_advice_en: 'Ensure the username and password are correct and the user has the necessary permissions.',
  },
  'ENETUNREACH': {
    title_de: 'Netzwerk nicht erreichbar',
    title_en: 'Network Unreachable',
    de: 'Das Netzwerk zum Server ist nicht erreichbar. Überprüfen Sie Ihre Netzwerkverbindung und die Serveradresse.',
    en: 'The network to the server is unreachable. Check your network connection and the server address.',
  },
  'ESOCKET': {
    title_de: 'Socket-Fehler',
    title_en: 'Socket Error',
    de: 'Ein allgemeiner Netzwerk-Socket-Fehler ist aufgetreten. Dies kann auf verschiedene Netzwerkprobleme hinweisen.',
    en: 'A general network socket error occurred. This can indicate various network issues.',
  },
  // Common Tedious specific error codes (often include a number)
  // Example: Login failed for user '...' (Error Number: 18456)
  'LOGIN_FAILED_18456': {
    title_de: 'Anmeldung fehlgeschlagen',
    title_en: 'Login Failed',
    de: 'Die Anmeldung für den Benutzer ist fehlgeschlagen. Überprüfen Sie Benutzername und Passwort.',
    en: 'Login failed for the user. Check username and password.',
    actionable_advice_de: 'Stellen Sie sicher, dass der Benutzername und das Passwort korrekt sind. Der Fehlercode 18456 weist oft auf falsche Anmeldeinformationen hin.',
    actionable_advice_en: 'Ensure the username and password are correct. Error code 18456 often indicates incorrect credentials.',
  },
  'DB_NOT_FOUND_4060': {
    title_de: 'Datenbank nicht gefunden',
    title_en: 'Database Not Found',
    de: 'Die angegebene Datenbank konnte auf dem Server nicht gefunden werden.',
    en: 'The specified database could not be found on the server.',
    actionable_advice_de: 'Überprüfen Sie den Datenbanknamen auf Tippfehler und stellen Sie sicher, dass die Datenbank auf dem Server existiert.',
    actionable_advice_en: 'Check the database name for typos and ensure the database exists on the server.',
  },
  'SSL_CERT_ERROR': { // Generic placeholder for SSL errors
    title_de: 'SSL-Zertifikatsfehler',
    title_en: 'SSL Certificate Error',
    de: 'Es gab ein Problem mit dem SSL-Zertifikat des Servers. Stellen Sie sicher, dass das Zertifikat gültig ist oder aktivieren Sie "Serverzertifikat akzeptieren", wenn Sie dem Zertifikat vertrauen.',
    en: 'There was an issue with the server\'s SSL certificate. Ensure the certificate is valid, or enable "Trust server certificate" if you trust the certificate.',
    actionable_advice_de: 'Wenn Sie ein selbstsigniertes Zertifikat verwenden, müssen Sie möglicherweise "Serverzertifikat akzeptieren" aktivieren. Für Produktionsumgebungen wird ein gültiges Zertifikat von einer Zertifizierungsstelle empfohlen.',
    actionable_advice_en: 'If using a self-signed certificate, you might need to enable "Trust server certificate". For production environments, a valid certificate from a CA is recommended.',
  },
  // Add more specific error codes and their user-friendly messages here
  'ENOTFOUND': { // Added from previous plan
    title_de: 'Server nicht gefunden (DNS)',
    title_en: 'Server Not Found (DNS)',
    de: 'Die angegebene Serveradresse konnte nicht im DNS aufgelöst werden. Bitte überprüfen Sie die Adresse auf Tippfehler und Ihre Netzwerkkonfiguration.',
    en: 'The specified server address could not be resolved in DNS. Please check the address for typos and your network configuration.',
    actionable_advice_de: 'Stellen Sie sicher, dass der Servername korrekt ist und Ihr System DNS-Anfragen korrekt auflösen kann.',
    actionable_advice_en: 'Ensure the server name is correct and your system can resolve DNS queries correctly.',
  },
  'EINSTLOOKUP': { // Added for SQL Server instance lookup failure (e.g. "Port for JTLWAWI1 not found in localhost")
    title_de: 'SQL Server Instanz nicht gefunden',
    title_en: 'SQL Server Instance Not Found',
    de: 'Die angegebene SQL Server-Instanz konnte auf dem Server nicht gefunden werden oder der SQL Server Browser-Dienst antwortet nicht. Dies ist oft der Fall, wenn ein Instanzname (z.B. SERVER\\SQLEXPRESS) verwendet wird.',
    en: 'The specified SQL Server instance could not be found on the server, or the SQL Server Browser service is not responding. This often occurs when using an instance name (e.g., SERVER\\SQLEXPRESS).',
    actionable_advice_de: "Überprüfen Sie den Server- und Instanznamen. Stellen Sie sicher, dass der 'SQL Server Browser'-Dienst auf dem Zielserver läuft und nicht durch eine Firewall blockiert wird. Alternativ können Sie versuchen, den Port der Instanz explizit anzugeben (z.B. 'servername\\instanzname,portnummer' oder nur 'servername,portnummer', falls keine benannte Instanz).",
    actionable_advice_en: "Verify the server and instance name. Ensure the 'SQL Server Browser' service is running on the target server and is not blocked by a firewall. Alternatively, try specifying the instance's port explicitly (e.g., 'servername\\instancename,portnumber' or just 'servername,portnumber' if not a named instance).",
    docsUrl: 'https://learn.microsoft.com/sql/database-engine/configure-windows/sql-server-browser-service',
  },
  'PORT_NOT_FOUND': { // Custom code for "Port for ... not found" - EINSTLOOKUP is more specific if available from error.code
    title_de: 'Port für Instanz nicht gefunden',
    title_en: 'Port for Instance Not Found',
    de: 'Der SQL Server Browser-Dienst konnte den Port für die angegebene SQL Server-Instanz nicht finden. Dies geschieht oft, wenn der Instanzname angegeben wird, aber der Browser-Dienst nicht läuft oder blockiert ist.',
    en: 'The SQL Server Browser service could not find the port for the specified SQL Server instance. This often happens when the instance name is provided, but the Browser service is not running or is blocked.',
    actionable_advice_de: "Versuchen Sie, den Port explizit anzugeben (z.B. 'servername,1433') oder stellen Sie sicher, dass der 'SQL Server Browser'-Dienst auf dem Server läuft und nicht durch eine Firewall blockiert wird.",
    actionable_advice_en: "Try specifying the port explicitly (e.g., 'servername,1433') or ensure the 'SQL Server Browser' service is running on the server and is not blocked by a firewall.",
  }
};

interface ParsedError { // Ensure this matches the one in settings/page.tsx
  title: string;
  description: string;
  originalMessage?: string;
  code?: string;
  name?: string; // Added to store error.name
  actionableAdvice?: string;
  docsUrl?: string;
}

/**
 * Parses a connection error and returns a user-friendly message.
 * Attempts to identify known MSSQL/Tedious error codes.
 * @param error The error object or string.
 * @param lang The preferred language ('de' or 'en'). Defaults to 'de'.
 * @returns A ParsedError object with translated and original error information.
 */
export function getFriendlyMssqlError(error: any, lang: 'de' | 'en' = 'de'): ParsedError {
  let errorCode: string | undefined = undefined;
  let errorName: string | undefined = undefined;
  let errorMessage: string = lang === 'de' ? 'Ein unbekannter Fehler ist aufgetreten.' : 'An unknown error occurred.';
  
  console.log("[getFriendlyMssqlError] Input error:", JSON.stringify(error, null, 2));

  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error.message === 'string') { // Handles { message: string; code?: string; name?: string }
    errorMessage = error.message;
    if (error.code) {
      errorCode = String(error.code);
    }
    if (error.name) {
      errorName = String(error.name);
    }
  } else if (error instanceof Error) { // Fallback for actual Error instances
    errorMessage = error.message;
    if ((error as any).code) {
      errorCode = String((error as any).code);
    }
    errorName = error.name; // Standard Error.name
  }

  // Specific check for "Port for ... not found"
  if (errorMessage.includes("Port for") && errorMessage.includes("not found in")) {
    errorCode = 'PORT_NOT_FOUND'; // Use our custom code
  }

  // Tedious specific error numbers might be in error.message or error.number
  const tediousErrorNumberMatch = errorMessage.match(/number: (\d+)/i);
  if (tediousErrorNumberMatch && tediousErrorNumberMatch[1]) {
      const num = tediousErrorNumberMatch[1];
      if (num === '18456' && (!errorCode || !MSSQL_ERROR_MAP[errorCode])) errorCode = 'LOGIN_FAILED_18456';
      if (num === '4060' && (!errorCode || !MSSQL_ERROR_MAP[errorCode])) errorCode = 'DB_NOT_FOUND_4060';
  }
  // Check for SSL related errors
  if (errorMessage.toLowerCase().includes('ssl') || errorMessage.toLowerCase().includes('certificate')) {
      if (!errorCode || !MSSQL_ERROR_MAP[errorCode]) {
          errorCode = 'SSL_CERT_ERROR';
      }
  }

  const fallbackTitle = lang === 'de' ? 'Verbindungsfehler' : 'Connection Error';
  const fallbackDescription = lang === 'de' ? 'Es konnte keine Verbindung zum MSSQL-Server hergestellt werden oder die Verbindung wurde unterbrochen.' : 'Could not connect to the MSSQL server or the connection was lost.';

  let matchedDetailKey: string | undefined = errorCode;

  if (errorCode && MSSQL_ERROR_MAP[errorCode]) {
    // Already found by code
  } else if (errorName && MSSQL_ERROR_MAP[errorName]) {
    matchedDetailKey = errorName;
  } else { // Try to find by message substring if no code/name match
      for (const key in MSSQL_ERROR_MAP) {
          if (errorMessage.includes(key) && key.length > 3) { // Avoid too generic keys
              matchedDetailKey = key;
              break;
          }
      }
  }

  if (matchedDetailKey && MSSQL_ERROR_MAP[matchedDetailKey]) {
    const errorDetail = MSSQL_ERROR_MAP[matchedDetailKey];
    return {
      title: lang === 'de' ? errorDetail.title_de : errorDetail.title_en,
      description: lang === 'de' ? errorDetail.de : errorDetail.en,
      originalMessage: errorMessage,
      code: errorCode, // Original code from error object
      name: errorName, // Original name from error object
      actionableAdvice: lang === 'de' ? errorDetail.actionable_advice_de : errorDetail.actionable_advice_en,
      docsUrl: errorDetail.docsUrl,
    };
  }

  // Fallback for unknown errors
  return {
    title: fallbackTitle,
    description: `${fallbackDescription}`, // Removed (Details: ${errorMessage}) as originalMessage will be shown
    originalMessage: errorMessage,
    code: errorCode || 'UNKNOWN',
    name: errorName,
  };
}