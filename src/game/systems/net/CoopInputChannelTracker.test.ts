import { describe, expect, it } from "vitest";
import { CoopInputChannelTracker } from "./CoopInputChannelTracker";

describe("CoopInputChannelTracker", () => {
  it("declara listo al host solo cuando sus tres topics estan unidos", () => {
    const tracker = new CoopInputChannelTracker<object>(3);
    const channels = [{}, {}, {}];

    expect(tracker.update(channels[0], "SUBSCRIBED").ready).toBe(false);
    expect(tracker.update(channels[1], "SUBSCRIBED").ready).toBe(false);
    expect(tracker.update(channels[2], "SUBSCRIBED").ready).toBe(true);
  });

  it("distingue un fallo inicial de una caida que requiere reconexion", () => {
    const tracker = new CoopInputChannelTracker<object>(1);
    const channel = {};

    expect(tracker.update(channel, "TIMED_OUT")).toEqual({
      ready: false,
      reconnectRequired: false,
      initialFailure: true,
    });
    expect(tracker.update(channel, "SUBSCRIBED").ready).toBe(true);
    expect(tracker.update(channel, "CLOSED")).toEqual({
      ready: false,
      reconnectRequired: true,
      initialFailure: false,
    });
    expect(tracker.update(channel, "SUBSCRIBED").ready).toBe(true);
  });
});
