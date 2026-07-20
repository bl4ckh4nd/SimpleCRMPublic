interface ElectronAPI {
  send: (channel: string, data: unknown) => void;
  receive: (channel: string, func: (...args: unknown[]) => void) => void;
  appInfo: {
    name: string;
    version: string;
  };
}

const WEB_APP_INFO = {
  name: 'SimpleCRM (Web)',
  version: 'web',
};

export const electronAPI = (): ElectronAPI | null =>
  typeof window !== 'undefined' ? ((window as Window & { electron?: ElectronAPI }).electron ?? null) : null;

export const isElectron = (): boolean => electronAPI() !== null;

function triggerDownload(createBlob: () => Blob, fileName: string, errorMessage: string): boolean {
  try {
    const blob = createBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error(errorMessage, error);
    return false;
  }
}

export const sendToMain = (channel: string, data: unknown): void => {
  const api = electronAPI();
  if (!api) {
    console.log(`Would send to ${channel} if in Electron:`, data);
    return;
  }

  api.send(channel, data);
};

export const receiveFromMain = (
  channel: string,
  func: (...args: unknown[]) => void
): void => {
  const api = electronAPI();
  if (!api) {
    console.log(`Would listen to ${channel} if in Electron`);
    return;
  }

  api.receive(channel, func);
};

export const getAppInfo = () => electronAPI()?.appInfo ?? WEB_APP_INFO;

export const saveDataToDesktop = (data: unknown, fileName: string) => {
  const api = electronAPI();
  if (api) {
    api.send('save-data', { data, fileName });
    return true;
  } else {
    return triggerDownload(
      () => new Blob([JSON.stringify(data)], { type: 'application/json' }),
      fileName,
      'Failed to save data:'
    );
  }
};

export const arrayToCSV = (data: Record<string, unknown>[]): string => {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const escape = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const rows = data.map(row => headers.map(h => escape(row[h])).join(','));
  return [headers.join(','), ...rows].join('\n');
};

export const saveCSVToDesktop = (data: Record<string, unknown>[], fileName: string): boolean => {
  const csv = arrayToCSV(data);
  return triggerDownload(
    () => new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }),
    fileName,
    'Failed to save CSV:'
  );
};
