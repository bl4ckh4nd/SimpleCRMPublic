type MssqlErrorCategory =
  | 'authentication'
  | 'network'
  | 'database'
  | 'permission'
  | 'ssl'
  | 'timeout'
  | 'configuration'
  | 'unknown';

type MssqlErrorSeverity = 'low' | 'medium' | 'high';

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
  category?: MssqlErrorCategory;
  severity?: MssqlErrorSeverity;
}

const MSSQL_ERROR_MAP: Record<string, MssqlErrorDetails> = {
  ETIMEOUT: {
    title_de: 'Timeout bei der Verbindung',
    title_en: 'Connection Timeout',
    de: 'Der Server hat nicht innerhalb der erwarteten Zeit geantwortet. Bitte überprüfen Sie Ihre Netzwerkverbindung und die Erreichbarkeit des Servers.',
    en: 'The server did not respond within the expected time. Please check your network connection and server availability.',
    actionable_advice_de: 'Stellen Sie sicher, dass der Server läuft und keine Firewall die Verbindung blockiert. Erhöhen Sie ggf. das Timeout-Limit in den Einstellungen.',
    actionable_advice_en: 'Ensure the server is running and no firewall is blocking the connection. If applicable, increase the timeout limit in the settings.',
    category: 'timeout',
    severity: 'medium',
  },
  ECONNREFUSED: {
    title_de: 'Verbindung abgelehnt',
    title_en: 'Connection Refused',
    de: 'Der Server hat die Verbindung aktiv abgelehnt. Dies kann bedeuten, dass der Datenbankdienst nicht läuft oder der Port falsch ist.',
    en: 'The server actively refused the connection. This might mean the database service isn\'t running or the port is incorrect.',
    actionable_advice_de: 'Überprüfen Sie, ob der MSSQL-Dienst auf dem Server gestartet ist und der angegebene Port korrekt ist. Prüfen Sie auch Firewalleinstellungen.',
    actionable_advice_en: 'Verify that the MSSQL service is started on the server and that the specified port is correct. Also, check firewall settings.',
    docsUrl: 'https://learn.microsoft.com/sql/connect/ado-net/step-3-connect-sql-ado-net',
    category: 'network',
    severity: 'high',
  },
  ELOGIN: {
    title_de: 'Anmeldefehler',
    title_en: 'Login Failed',
    de: 'Die Anmeldung am Datenbankserver ist fehlgeschlagen. Bitte überprüfen Sie Benutzername und Passwort.',
    en: 'Login to the database server failed. Please check your username and password.',
    actionable_advice_de: 'Stellen Sie sicher, dass Benutzername und Passwort korrekt sind und der Benutzer die erforderlichen Berechtigungen hat.',
    actionable_advice_en: 'Ensure the username and password are correct and the user has the necessary permissions.',
    category: 'authentication',
    severity: 'high',
  },
  ENETUNREACH: {
    title_de: 'Netzwerk nicht erreichbar',
    title_en: 'Network Unreachable',
    de: 'Das Netzwerk zum Server ist nicht erreichbar. Überprüfen Sie Ihre Netzwerkverbindung und die Serveradresse.',
    en: 'The network to the server is unreachable. Check your network connection and the server address.',
    category: 'network',
    severity: 'high',
  },
  ESOCKET: {
    title_de: 'Socket-Fehler',
    title_en: 'Socket Error',
    de: 'Ein allgemeiner Netzwerk-Socket-Fehler ist aufgetreten. Dies kann auf verschiedene Netzwerkprobleme hinweisen.',
    en: 'A general network socket error occurred. This can indicate various network issues.',
    category: 'network',
    severity: 'medium',
  },
  LOGIN_FAILED_18456: {
    title_de: 'Anmeldung fehlgeschlagen',
    title_en: 'Login Failed',
    de: 'Die Anmeldung für den Benutzer ist fehlgeschlagen. Überprüfen Sie Benutzername und Passwort.',
    en: 'Login failed for the user. Check username and password.',
    actionable_advice_de: 'Stellen Sie sicher, dass der Benutzername und das Passwort korrekt sind. Der Fehlercode 18456 weist oft auf falsche Anmeldeinformationen hin.',
    actionable_advice_en: 'Ensure the username and password are correct. Error code 18456 often indicates incorrect credentials.',
    category: 'authentication',
    severity: 'high',
  },
  DB_NOT_FOUND_4060: {
    title_de: 'Datenbank nicht gefunden',
    title_en: 'Database Not Found',
    de: 'Die angegebene Datenbank konnte auf dem Server nicht gefunden werden.',
    en: 'The specified database could not be found on the server.',
    actionable_advice_de: 'Überprüfen Sie den Datenbanknamen auf Tippfehler und stellen Sie sicher, dass die Datenbank auf dem Server existiert.',
    actionable_advice_en: 'Check the database name for typos and ensure the database exists on the server.',
    category: 'database',
    severity: 'high',
  },
  SSL_CERT_ERROR: {
    title_de: 'SSL-Zertifikatsfehler',
    title_en: 'SSL Certificate Error',
    de: 'Es gab ein Problem mit dem SSL-Zertifikat des Servers. Stellen Sie sicher, dass das Zertifikat gültig ist oder aktivieren Sie "Serverzertifikat akzeptieren", wenn Sie dem Zertifikat vertrauen.',
    en: 'There was an issue with the server\'s SSL certificate. Ensure the certificate is valid, or enable "Trust server certificate" if you trust the certificate.',
    actionable_advice_de: 'Wenn Sie ein selbstsigniertes Zertifikat verwenden, aktivieren Sie "Serverzertifikat akzeptieren". Für Produktion sollten Sie ein Zertifikat einer Zertifizierungsstelle verwenden.',
    actionable_advice_en: 'If you use a self-signed certificate, enable "Trust server certificate". For production use a certificate from a trusted authority.',
    category: 'ssl',
    severity: 'medium',
  },
  PORT_NOT_FOUND: {
    title_de: 'Port für Instanz nicht gefunden',
    title_en: 'Port for Instance Not Found',
    de: 'Der SQL Server Browser-Dienst konnte den Port für die angegebene SQL Server-Instanz nicht finden. Dies geschieht oft, wenn der Instanzname angegeben wird, aber der Browser-Dienst nicht läuft oder blockiert ist.',
    en: 'The SQL Server Browser service could not find the port for the specified SQL Server instance. This often happens when the instance name is provided, but the Browser service is not running or is blocked.',
    actionable_advice_de: "Versuchen Sie, den Port explizit anzugeben (z.B. 'servername,1433') oder stellen Sie sicher, dass der 'SQL Server Browser'-Dienst auf dem Server läuft.",
    actionable_advice_en: "Try specifying the port explicitly (e.g., 'servername,1433') or ensure the 'SQL Server Browser' service is running on the server.",
    category: 'configuration',
    severity: 'medium',
  },
};

export interface ParsedError {
  title: string;
  description: string;
  originalMessage?: string;
  code?: string;
  name?: string;
  actionableAdvice?: string;
  docsUrl?: string;
  category?: MssqlErrorCategory;
  severity?: MssqlErrorSeverity;
}

/**
 * Parses a connection error and returns a user-friendly message.
 * Attempts to identify known MSSQL/Tedious error codes.
 * @param error The error object or string.
 * @param lang The preferred language ('de' or 'en'). Defaults to 'de'.
 */
export function getFriendlyMssqlError(error: unknown, lang: 'de' | 'en' = 'de'): ParsedError {
  let errorCode: string | undefined;
  let errorName: string | undefined;
  let errorMessage =
    lang === 'de' ? 'Ein unbekannter Fehler ist aufgetreten.' : 'An unknown error occurred.';

  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof (error as any).message === 'string') {
    const err = error as { message: string; code?: string | number; name?: string };
    errorMessage = err.message;
    if (err.code !== undefined) {
      errorCode = String(err.code);
    }
    if (err.name) {
      errorName = err.name;
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
    const anyError = error as Error & { code?: string | number };
    if (anyError.code !== undefined) {
      errorCode = String(anyError.code);
    }
    errorName = error.name;
  }

  if (errorMessage.includes('Port for') && errorMessage.includes('not found in')) {
    errorCode = 'PORT_NOT_FOUND';
  }

  const tediousErrorNumberMatch = errorMessage.match(/number: (\d+)/i);
  if (tediousErrorNumberMatch && tediousErrorNumberMatch[1]) {
    const num = tediousErrorNumberMatch[1];
    if (num === '18456' && (!errorCode || !MSSQL_ERROR_MAP[errorCode])) {
      errorCode = 'LOGIN_FAILED_18456';
    }
    if (num === '4060' && (!errorCode || !MSSQL_ERROR_MAP[errorCode])) {
      errorCode = 'DB_NOT_FOUND_4060';
    }
  }

  if (errorMessage.toLowerCase().includes('ssl') || errorMessage.toLowerCase().includes('certificate')) {
    if (!errorCode || !MSSQL_ERROR_MAP[errorCode]) {
      errorCode = 'SSL_CERT_ERROR';
    }
  }

  const fallbackTitle = lang === 'de' ? 'Verbindungsfehler' : 'Connection Error';
  const fallbackDescription =
    lang === 'de'
      ? 'Es konnte keine Verbindung zum MSSQL-Server hergestellt werden oder die Verbindung wurde unterbrochen.'
      : 'Could not connect to the MSSQL server or the connection was lost.';

  let matchedDetailKey: string | undefined = errorCode;

  if (errorCode && MSSQL_ERROR_MAP[errorCode]) {
    matchedDetailKey = errorCode;
  } else if (errorName && MSSQL_ERROR_MAP[errorName]) {
    matchedDetailKey = errorName;
  } else {
    for (const key in MSSQL_ERROR_MAP) {
      if (errorMessage.includes(key) && key.length > 3) {
        matchedDetailKey = key;
        break;
      }
    }
  }

  if (matchedDetailKey && MSSQL_ERROR_MAP[matchedDetailKey]) {
    const detail = MSSQL_ERROR_MAP[matchedDetailKey];
    return {
      title: lang === 'de' ? detail.title_de : detail.title_en,
      description: lang === 'de' ? detail.de : detail.en,
      originalMessage: errorMessage,
      code: errorCode,
      name: errorName,
      actionableAdvice:
        lang === 'de' ? detail.actionable_advice_de : detail.actionable_advice_en,
      docsUrl: detail.docsUrl,
      category: detail.category,
      severity: detail.severity,
    };
  }

  return {
    title: fallbackTitle,
    description: fallbackDescription,
    originalMessage: errorMessage,
    code: errorCode || 'UNKNOWN',
    name: errorName,
    category: 'unknown',
    severity: 'medium',
  };
}

export type { MssqlErrorCategory, MssqlErrorSeverity };
