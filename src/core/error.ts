export class PixeliftError extends Error {
  override readonly name: string;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class PixeliftHttpError extends PixeliftError {
  public readonly response: Response;
  public readonly status: number;
  public readonly statusText: string;
  public readonly url: string;

  constructor(response: Response) {
    const message = `HTTP error ${response.status} (${response.statusText}) for URL: ${response.url}`;
    super(message);
    this.response = response;
    this.status = response.status;
    this.statusText = response.statusText;
    this.url = response.url;
  }
}

export class PixeliftBufferOverflowError extends PixeliftError {
  constructor(maxSize: number, actualSize: number) {
    super(`Buffer size exceeded: ${actualSize} > ${maxSize}`);
  }
}

export class PixeliftFetchAbortedError extends PixeliftError {
  constructor(message: string = 'Request aborted', options?: { cause?: unknown }) {
    super(message, options);
  }
}

export class PixeliftWorkerError extends PixeliftError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(`Worker error: ${message}`, options);
  }
}

export class PixeliftInputError extends PixeliftError {
  constructor(expected: string, received: string, options?: { cause?: unknown }) {
    super(`Invalid input: expected ${expected}, received ${received}`, options);
  }
}

export class PixeliftDependencyError extends PixeliftError {
  constructor(dependency: string, message: string, options?: { cause?: unknown }) {
    super(`Missing dependency: ${dependency}. ${message}`, options);
  }
}

export class PixeliftDecodeError extends PixeliftError {
  constructor(type: string, message: string, options?: { cause?: unknown }) {
    super(`Decoding failed for type "${type}": ${message}`, options);
  }
}

export class PixeliftNetworkError extends PixeliftError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(`Network error: ${message}`, options);
  }
}

export class PixeliftInvalidInputError extends PixeliftError {
  constructor(expected: string, received: string, options?: { cause?: unknown }) {
    super(`Invalid input: expected ${expected}, received ${received}`, options);
  }
}
