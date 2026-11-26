/**
 * Server-Sent Events, without `EventSource`.
 *
 * A browser's `EventSource` cannot send an `Authorization` header, and the access token must stay out of
 * query strings (nginx and uvicorn log URLs). So the notification stream is read with `fetch`, and this
 * parser turns its chunks into events. Pure: no React, no DOM, no runtime imports.
 */

export interface SseEvent {
  /** The `event:` field; "message" when the server named none. */
  event: string;
  data: string;
}

export interface SseParser {
  /** Feed the next piece of text. A piece may end in the middle of a line or of an event. */
  push(chunk: string): void;
}

/**
 * Parse an event stream as the HTML spec defines it: events end at a blank line, a field is `name: value`
 * (one optional space after the colon), lines starting with `:` are comments (keep-alives), several `data:`
 * lines join with a newline, and an event without data is dropped. Lines may end in `\n`, `\r\n` or `\r`.
 */
export function createSseParser(onEvent: (event: SseEvent) => void): SseParser {
  let buffer = "";
  let eventName = "";
  let dataLines: string[] = [];
  let sawCarriageReturn = false;

  const handleLine = (line: string) => {
    if (line === "") {
      if (dataLines.length > 0) onEvent({ event: eventName || "message", data: dataLines.join("\n") });
      eventName = "";
      dataLines = [];
      return;
    }
    if (line.startsWith(":")) return;

    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") eventName = value;
    else if (field === "data") dataLines.push(value);
    // `id` and `retry` are not used by this app.
  };

  return {
    push(chunk) {
      if (chunk === "") return;

      let text = chunk;
      if (sawCarriageReturn) {
        // A "\r\n" split across two chunks: the "\n" that opens this chunk belongs to the previous line break.
        sawCarriageReturn = false;
        if (text.startsWith("\n")) text = text.slice(1);
      }

      buffer += text;
      let start = 0;
      for (let index = 0; index < buffer.length; index += 1) {
        const char = buffer[index];
        if (char !== "\n" && char !== "\r") continue;

        handleLine(buffer.slice(start, index));
        if (char === "\r") {
          if (buffer[index + 1] === "\n") index += 1;
          else if (index === buffer.length - 1) sawCarriageReturn = true;
        }
        start = index + 1;
      }
      buffer = buffer.slice(start);
    },
  };
}

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 5 * 60_000;

/**
 * How long to wait before reconnecting after `failures` failed attempts in a row: one second, doubling up to
 * five minutes, plus up to a quarter more at random so many tabs do not come back at the same instant.
 * Never under one second: the server accepts a token for the second it expires in, so an immediate retry
 * after a stream that ended with its token could land on a stream that ends at once.
 */
export function reconnectDelay(failures: number, random: () => number = Math.random): number {
  const base = Math.min(RECONNECT_BASE_MS * 2 ** Math.max(0, failures), RECONNECT_MAX_MS);
  return Math.round(base + random() * base * 0.25);
}
