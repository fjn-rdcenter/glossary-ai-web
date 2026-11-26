"use client";

import { useRef } from "react";

/** A ref that always holds the newest `value`, for callbacks that outlive a render. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
