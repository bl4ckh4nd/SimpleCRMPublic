export function parsePort(portInput: unknown) {
  if (portInput === null || portInput === undefined) {
    return undefined;
  }

  let portNumber: number | undefined;
  if (typeof portInput === 'number') {
    portNumber = portInput;
  } else if (typeof portInput === 'string') {
    if (portInput.trim() === '') {
      return undefined;
    }
    const parsed = Number(portInput);
    if (!Number.isNaN(parsed)) {
      portNumber = parsed;
    }
  }

  if (portNumber && Number.isInteger(portNumber) && portNumber > 0 && portNumber <= 65535) {
    return portNumber;
  }

  return undefined;
}
