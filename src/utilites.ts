import { fromEventPattern, Observable } from "rxjs";
import { watchEffect } from "vue";
import { Ref } from "vue";
import { invoker, min, partial, pipe, prop, unary } from "ramda";
import { useResizeObserver } from "@vueuse/core";
import { mergeAll, pluck } from "rxjs/operators";

export function fromProp<T>(
  propName: string,
  props: Record<string, any>
): Observable<T> {
  return new Observable<T>((subscriber) =>
    watchEffect(() => subscriber.next(props[propName]))
  );
}

export function fromResizeObserver(
  elRef: Ref<Element>
): Observable<ResizeObserverEntry> {
  return fromEventPattern<ResizeObserverEntry[]>(
    pipe(unary, partial(useResizeObserver, [elRef]))
  ).pipe(mergeAll());
}

export const computeHeightAboveWindowOf: (el: Element) => number = pipe(
  invoker(0, "getBoundingClientRect"),
  prop("top"),
  min(0),
  Math.abs
);
