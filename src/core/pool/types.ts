export interface Pool<T> {
  acquire(): Promise<T>;
  release(resource: T): Promise<void>;
  clear(): Promise<void>;
}

export interface Waiter<T> {
  resolve: (res: T) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}
