import { fromEvent, fromEventPattern, Observable } from "rxjs";
import { watchEffect } from "vue";
import { partial, pipe, unary } from "ramda";
import {
  MaybeElementRef,
  ResizeObserverEntry,
  unrefElement,
  useResizeObserver,
} from "@vueuse/core";
import { filter, map, mergeAll, pluck } from "rxjs/operators";

export function fromProp<T, U extends keyof T>(
  props: T,
  propName: U
): Observable<T[U]> {
  return new Observable((subscriber) =>
    watchEffect(() => subscriber.next(props[propName]))
  );
}

export function fromResizeObserver<T extends keyof ResizeObserverEntry>(
  elRef: MaybeElementRef,
  pluckTarget: T
): Observable<ResizeObserverEntry[T]> {
  return fromEventPattern<ResizeObserverEntry[]>(
    pipe(unary, partial(useResizeObserver, [elRef]))
  ).pipe(mergeAll(), pluck<ResizeObserverEntry, T>(pluckTarget));
}

export function fromWindowScroll(elRef: MaybeElementRef): Observable<Element> {
  return fromEvent(window, "scroll", {
    passive: true,
    capture: true,
  }).pipe(
    map(() => unrefElement(elRef)),
    filter<Element | undefined | null, Element>((el): el is Element =>
      Boolean(el)
    )
  );
}
