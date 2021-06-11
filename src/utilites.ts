import { fromEvent, fromEventPattern, Observable } from "rxjs";
import { Ref, watchEffect } from "vue";
import { partial, pipe, unary } from "ramda";
import { ResizeObserverEntry, useResizeObserver } from "@vueuse/core";
import { mergeAll, pluck } from "rxjs/operators";

export function fromProp<T, U extends keyof T>(
  props: T,
  propName: U
): Observable<T[U]> {
  return new Observable((subscriber) =>
    watchEffect(() => subscriber.next(props[propName]))
  );
}

export function fromResizeObserver<T extends keyof ResizeObserverEntry>(
  elRef: Ref<Element>,
  pluckTarget: T
): Observable<ResizeObserverEntry[T]> {
  return fromEventPattern<ResizeObserverEntry[]>(
    pipe(unary, partial(useResizeObserver, [elRef]))
  ).pipe(mergeAll(), pluck<ResizeObserverEntry, T>(pluckTarget));
}

export function fromWindowScroll<T>(
  resultSelector: (e: Event) => T
): Observable<T> {
  // @ts-expect-error Rxjs has a typing bug on fromEvent() with resultSelector,
  // which is fixed in https://github.com/ReactiveX/rxjs/pull/6447.
  // TODO: Remove this comment when the PR above is merged.
  return fromEvent(
    window,
    "scroll",
    { passive: true, capture: true },
    resultSelector
  );
}
