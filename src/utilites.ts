import { fromEventPattern, Observable } from "rxjs";
import { Ref, watchEffect } from "vue";
import { partial, pipe, unary } from "ramda";
import { useResizeObserver } from "@vueuse/core";
import { mergeAll } from "rxjs/operators";

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
