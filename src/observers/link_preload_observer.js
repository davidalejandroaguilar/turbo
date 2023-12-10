import { getMetaContent } from "../util"

export class LinkPreloadObserver {
  triggerEvents = {
    mouseover: "mouseenter",
    mousedown: "mousedown"
  }
  started = false
  instantPreloadAttributeName = "data-turbo-preload"

  constructor(delegate) {
    this.delegate = delegate
    this.mutationObserver = new MutationObserver(
      this.#notifyDelegateOfMutations
    )
    this.useCachedRequestForPreloadFetchRequestEvent =
      this.delegate.useCachedRequestForPreloadFetchRequestEvent.bind(
        this.delegate
      )
  }

  start() {
    if (this.started) return

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", this.#start, {
        once: true
      })
    } else {
      this.#start()
    }
  }

  #start = () => {
    this.#observeLinksToPreloadImmediately()
    this.#preloadLinksImmediately()

    if (this.#preloadLinksPredictively) {
      this.#observeLinksToPreloadPredictively()
    }

    this.started = true
  }

  stop() {
    if (this.started) {
      this.#stopObservingLinksToPreloadImmediately()
      this.#stopObservingLinksToPreloadPredictively()
      this.started = false
    }
  }

  #observeLinksToPreloadImmediately() {
    document.addEventListener("turbo:load", this.#preloadLinksImmediately, true)
    document.addEventListener(
      "turbo:frame-load",
      this.#preloadLinksImmediately,
      true
    )
    document.addEventListener(
      "turbo:before-fetch-request",
      this.useCachedRequestForPreloadFetchRequestEvent,
      true
    )
    this.mutationObserver.observe(document.body, {
      attributeFilter: [this.instantPreloadAttributeName],
      subtree: true
    })
  }

  #preloadLinksImmediately = () => {
    for (const element of document.body.querySelectorAll(
      `[${this.instantPreloadAttributeName}]`
    )) {
      this.#notifyDelegateToPreloadAnchor(element)
    }
  }

  #observeLinksToPreloadPredictively() {
    document.addEventListener(
      this.#triggerEvent,
      this.#notifyDelegateOfPredictivePreloadTrigger,
      {
        capture: true,
        passive: true
      }
    )
  }

  #stopObservingLinksToPreloadImmediately() {
    document.removeEventListener(
      "turbo:load",
      this.#preloadLinksImmediately,
      true
    )
    document.removeEventListener(
      "turbo:frame-load",
      this.#preloadLinksImmediately,
      true
    )
    document.removeEventListener(
      "turbo:before-fetch-request",
      this.useCachedRequestForPreloadFetchRequestEvent,
      true
    )
    this.mutationObserver.disconnect()
  }

  #stopObservingLinksToPreloadPredictively() {
    document.removeEventListener(
      this.#triggerEvent,
      this.#notifyDelegateOfPredictivePreloadTrigger,
      {
        capture: true,
        passive: true
      }
    )
  }

  get #preloadLinksPredictively() {
    return getMetaContent("turbo-predictive-preload") === "true"
  }

  get #triggerEvent() {
    return (
      this.triggerEvents[
        getMetaContent("turbo-predictive-preload-trigger-event")
      ] || this.triggerEvents.mouseover
    )
  }

  #notifyDelegateOfPredictivePreloadTrigger = (event) => {
    if (!this.#preloadLinksPredictively) return

    const target = event.target
    const isLink =
      target.matches &&
      target.matches("a[href]:not([target^=_]):not([download])")
    const link = target

    if (isLink) {
      this.delegate.predictivePreloadTriggered(link)
    }
  }

  #notifyDelegateOfMutations = (mutationList) => {
    for (const { target } of mutationList) {
      this.#notifyDelegateToPreloadAnchor(target)
    }
  }

  #notifyDelegateToPreloadAnchor = (element) => {
    if (element instanceof HTMLAnchorElement) {
      this.delegate.preloadAnchor(element)
    }
  }
}
