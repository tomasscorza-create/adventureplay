export type CoopChannelStatus =
  | "SUBSCRIBED"
  | "CHANNEL_ERROR"
  | "TIMED_OUT"
  | "CLOSED"
  | string;

export interface CoopInputChannelState {
  ready: boolean;
  reconnectRequired: boolean;
  initialFailure: boolean;
}

// Contabilidad pura de los topics de input. CoopSession conserva la apertura
// real de canales; esta clase hace testeable cuando el conjunto esta listo y
// cuando una caida posterior debe activar la ventana de reconexion.
export class CoopInputChannelTracker<TChannel extends object> {
  private readonly subscribed = new Set<TChannel>();
  private readonly everSubscribed = new Set<TChannel>();

  constructor(private readonly expectedChannels: number) {}

  update(channel: TChannel, status: CoopChannelStatus): CoopInputChannelState {
    if (status === "SUBSCRIBED") {
      this.subscribed.add(channel);
      this.everSubscribed.add(channel);
      return {
        ready: this.subscribed.size === this.expectedChannels,
        reconnectRequired: false,
        initialFailure: false,
      };
    }

    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      this.subscribed.delete(channel);
      const reconnectRequired = this.everSubscribed.has(channel);
      return { ready: false, reconnectRequired, initialFailure: !reconnectRequired };
    }

    return {
      ready: this.subscribed.size === this.expectedChannels,
      reconnectRequired: false,
      initialFailure: false,
    };
  }
}
