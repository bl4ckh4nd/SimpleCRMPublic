import {
  isElectron,
  electronAPI,
  sendToMain,
  receiveFromMain,
  getAppInfo,
  arrayToCSV,
  saveCSVToDesktop,
  saveDataToDesktop,
} from '@/lib/electron-utils';

// Helper to set up a mock window.electron
function setWindowElectron(api: Record<string, any> | undefined) {
  (global as any).window = api !== undefined ? { electron: api } : { electron: undefined };
}

describe('isElectron', () => {
  afterEach(() => {
    // Restore jsdom's window (no .electron property)
    delete (window as any).electron;
  });

  test('returns false when window.electron is undefined', () => {
    delete (window as any).electron;
    expect(isElectron()).toBe(false);
  });

  test('returns true when window.electron is set', () => {
    (window as any).electron = { send: jest.fn() };
    expect(isElectron()).toBe(true);
    delete (window as any).electron;
  });
});

describe('electronAPI', () => {
  afterEach(() => {
    delete (window as any).electron;
  });

  test('returns null when not in Electron', () => {
    delete (window as any).electron;
    expect(electronAPI()).toBeNull();
  });

  test('returns window.electron when in Electron', () => {
    const api = { send: jest.fn(), receive: jest.fn() };
    (window as any).electron = api;
    expect(electronAPI()).toBe(api);
  });
});

describe('sendToMain', () => {
  afterEach(() => {
    delete (window as any).electron;
    jest.restoreAllMocks();
  });

  test('calls api.send when in Electron', () => {
    const sendMock = jest.fn();
    (window as any).electron = { send: sendMock };
    sendToMain('test-channel', { foo: 'bar' });
    expect(sendMock).toHaveBeenCalledWith('test-channel', { foo: 'bar' });
  });

  test('logs to console when not in Electron', () => {
    delete (window as any).electron;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    sendToMain('some-channel', 42);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('some-channel'), 42);
  });
});

describe('receiveFromMain', () => {
  afterEach(() => {
    delete (window as any).electron;
    jest.restoreAllMocks();
  });

  test('calls api.receive when in Electron', () => {
    const receiveMock = jest.fn();
    (window as any).electron = { receive: receiveMock };
    const cb = jest.fn();
    receiveFromMain('reply-channel', cb);
    expect(receiveMock).toHaveBeenCalledWith('reply-channel', cb);
  });

  test('logs to console when not in Electron', () => {
    delete (window as any).electron;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    receiveFromMain('reply-channel', jest.fn());
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('reply-channel'));
  });
});

describe('getAppInfo', () => {
  afterEach(() => {
    delete (window as any).electron;
  });

  test('returns web fallback when not in Electron', () => {
    delete (window as any).electron;
    const info = getAppInfo();
    expect(info).toEqual({ name: 'SimpleCRM (Web)', version: 'web' });
  });

  test('returns api.appInfo when in Electron', () => {
    const appInfo = { name: 'SimpleCRM', version: '1.2.3' };
    (window as any).electron = { appInfo };
    expect(getAppInfo()).toEqual(appInfo);
  });
});

describe('saveDataToDesktop (Electron path)', () => {
  afterEach(() => {
    delete (window as any).electron;
    jest.restoreAllMocks();
  });

  test('calls api.send with save-data channel when in Electron and returns true', () => {
    const sendMock = jest.fn();
    (window as any).electron = { send: sendMock };
    const result = saveDataToDesktop([{ id: 1 }], 'export.json');
    expect(result).toBe(true);
    expect(sendMock).toHaveBeenCalledWith('save-data', { data: [{ id: 1 }], fileName: 'export.json' });
  });
});

describe('arrayToCSV', () => {
  test('returns empty string for empty array', () => {
    expect(arrayToCSV([])).toBe('');
  });

  test('returns empty string for null/undefined input', () => {
    expect(arrayToCSV(null as any)).toBe('');
    expect(arrayToCSV(undefined as any)).toBe('');
  });

  test('generates header row from object keys', () => {
    const result = arrayToCSV([{ name: 'Alice', age: 30 }]);
    const lines = result.split('\n');
    expect(lines[0]).toBe('name,age');
  });

  test('generates correct data row', () => {
    const result = arrayToCSV([{ name: 'Alice', age: 30 }]);
    const lines = result.split('\n');
    expect(lines[1]).toBe('Alice,30');
  });

  test('generates multiple rows', () => {
    const data = [
      { id: 1, label: 'foo' },
      { id: 2, label: 'bar' },
    ];
    const result = arrayToCSV(data);
    const lines = result.split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[1]).toBe('1,foo');
    expect(lines[2]).toBe('2,bar');
  });

  test('wraps values containing comma in double quotes', () => {
    const result = arrayToCSV([{ name: 'Smith, John', value: 5 }]);
    expect(result).toContain('"Smith, John"');
  });

  test('escapes double quotes inside values', () => {
    const result = arrayToCSV([{ note: 'He said "hello"' }]);
    expect(result).toContain('"He said ""hello"""');
  });

  test('wraps values containing newline in double quotes', () => {
    const result = arrayToCSV([{ text: 'line1\nline2' }]);
    expect(result).toContain('"line1\nline2"');
  });

  test('converts null and undefined values to empty string', () => {
    const result = arrayToCSV([{ a: null, b: undefined }]);
    const lines = result.split('\n');
    expect(lines[1]).toBe(',');
  });

  test('converts numeric and boolean values to string', () => {
    const result = arrayToCSV([{ count: 42, active: true }]);
    const lines = result.split('\n');
    expect(lines[1]).toBe('42,true');
  });

  test('uses keys from first object for all rows', () => {
    const data = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ];
    const result = arrayToCSV(data);
    expect(result.startsWith('id,name')).toBe(true);
  });
});

describe('saveCSVToDesktop', () => {
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;
  let clickSpy: jest.Mock;
  let createElementSpy: jest.SpyInstance;

  beforeEach(() => {
    createObjectURL = jest.fn(() => 'blob:mock-url');
    revokeObjectURL = jest.fn();
    clickSpy = jest.fn();

    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    const fakeAnchor = {
      href: '',
      download: '',
      click: clickSpy,
    };
    createElementSpy = jest
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) => {
        if (tag === 'a') return fakeAnchor as unknown as HTMLElement;
        return document.createElement(tag);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns true on successful export', () => {
    const result = saveCSVToDesktop([{ id: 1, name: 'Test' }], 'export.csv');
    expect(result).toBe(true);
  });

  test('calls click() to trigger download', () => {
    saveCSVToDesktop([{ id: 1, name: 'Alice' }], 'customers.csv');
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  test('creates a Blob with UTF-8 BOM', () => {
    const BlobSpy = jest.spyOn(global, 'Blob').mockImplementation(
      (parts: BlobPart[], options?: BlobPropertyBag) => new Blob(parts, options)
    );
    saveCSVToDesktop([{ a: 1 }], 'test.csv');
    const blobCall = BlobSpy.mock.calls[0];
    const content = blobCall[0] as string[];
    expect(content[0]).toMatch(/^\uFEFF/);
    BlobSpy.mockRestore();
  });

  test('revokes the object URL after click', () => {
    saveCSVToDesktop([{ id: 1 }], 'test.csv');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  test('sets correct download filename', () => {
    const fakeAnchor = { href: '', download: '', click: jest.fn() };
    createElementSpy.mockImplementation((tag: string) => {
      if (tag === 'a') return fakeAnchor as unknown as HTMLElement;
      return document.createElement(tag);
    });

    saveCSVToDesktop([{ id: 1 }], 'my-file.csv');
    expect(fakeAnchor.download).toBe('my-file.csv');
  });

  test('returns false when Blob creation throws', () => {
    jest.spyOn(global, 'Blob').mockImplementation(() => {
      throw new Error('Blob not supported');
    });
    const result = saveCSVToDesktop([{ id: 1 }], 'test.csv');
    expect(result).toBe(false);
  });
});

describe('saveDataToDesktop (JSON fallback)', () => {
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;
  let clickSpy: jest.Mock;

  beforeEach(() => {
    createObjectURL = jest.fn(() => 'blob:json-url');
    revokeObjectURL = jest.fn();
    clickSpy = jest.fn();

    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a')
        return { href: '', download: '', click: clickSpy } as unknown as HTMLElement;
      return document.createElement(tag);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('triggers download with JSON data in web fallback mode', () => {
    // window.electron is undefined in jsdom, so the web fallback path is used
    const result = saveDataToDesktop([{ id: 1 }], 'data.json');
    expect(result).toBe(true);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
