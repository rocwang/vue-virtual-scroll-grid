import { fromEventPattern, Observable } from "rxjs";
import { Ref, watchEffect } from "vue";
import { partial, pipe, unary } from "ramda";
import { useResizeObserver } from "@vueuse/core";
import { mergeAll } from "rxjs/operators";

export function fromProp<T, U extends keyof T>(
  props: T,
  propName: U
): Observable<T[U]> {
  return new Observable((subscriber) =>
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
