export class Signal<T = void> {
  private listeners: Array<(data: T) => void> = [];

  public connect(fn: (data: T) => void): void {
    this.listeners.push(fn);
  }

  public disconnect(fn: (data: T) => void): void {
    this.listeners = this.listeners.filter((l) => l !== fn);
  }

  public emit(data: T): void {
    this.listeners.slice().forEach((l) => l(data));
  }

  public disconnectAll(): void {
    this.listeners = [];
  }
}
