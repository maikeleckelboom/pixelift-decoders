export interface Pool<T> {
  acquire(): Promise<T>;
  release(resource: T): Promise<void>;
  clear(): Promise<void>;
}
