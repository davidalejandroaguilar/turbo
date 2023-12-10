import {
  getLocationForLink,
  getMetaContent,
  findClosestRecursively,
  doesNotTargetIFrame
} from "../../util"
import { preloadCache, cacheTtl } from "./preload_cache"
import { FetchRequest, FetchMethod } from "../../http/fetch_request"

export class Preloader {
  constructor(delegate) {
    this.delegate = delegate
  }

  preloadAnchor(link) {
    const location = getLocationForLink(link)
    const cacheTtl =
      link.dataset.turboPredictivePreloadCacheTtl || this.#cacheTtl
    const absoluteUrl = location.toString()
    const fetchRequest = new FetchRequest(
      this,
      FetchMethod.get,
      location,
      new URLSearchParams(),
      link
    )

    fetchRequest.perform()

    preloadCache.set(absoluteUrl, {
      fetchRequest,
      ttl: new Date(new Date().getTime() + cacheTtl)
    })
  }

  predictivePreloadTriggered(link) {
    const delay =
      link.dataset.turboPredictivePreloadDelay || this.#predictivePreloadDelay

    if (delay) {
      this.preloadTimeout = setTimeout(
        () => this.#preloadAnchorUnlessCached(link),
        Number(delay)
      )

      link.addEventListener("mouseleave", this.#cancelPreloadTimeoutIfAny, {
        capture: true,
        passive: true
      })
    } else {
      this.#preloadAnchorUnlessCached(link)
    }
  }

  #preloadAnchorUnlessCached = (link) => {
    const location = getLocationForLink(link)
    const absoluteUrl = location.toString()
    const cached = preloadCache.get(absoluteUrl)

    if (!cached || cached.ttl < new Date()) {
      this.preloadAnchor(link)
    }
  }

  #cancelPreloadTimeoutIfAny = () => {
    if (this.preloadTimeout) {
      clearTimeout(this.preloadTimeout)
    }
  }

  useCachedRequestForPreloadFetchRequestEvent = (event) => {
    if (
      event.target.tagName !== "FORM" &&
      event.detail.fetchOptions.method === "get"
    ) {
      const cached = preloadCache.get(event.detail.url.toString())

      if (cached && cached.ttl > new Date()) {
        // User clicked link, use cache response and clear cache.
        event.detail.fetchRequest = cached.fetchRequest
        preloadCache.clear()
      }
    }
  }

  // Fetch request interface

  prepareRequest(request) {
    const link = request.target

    request.headers["Sec-Purpose"] = "prefetch"

    if (link.dataset.turboFrame && link.dataset.turboFrame !== "_top") {
      request.headers["Turbo-Frame"] = link.dataset.turboFrame
    } else if (link.dataset.turboFrame !== "_top") {
      const turboFrame = link.closest("turbo-frame")

      if (turboFrame) {
        request.headers["Turbo-Frame"] = turboFrame.id
      }
    }
  }

  requestSucceededWithResponse() {}

  requestStarted(fetchRequest) {}

  requestErrored(fetchRequest) {}

  requestFinished(fetchRequest) {}

  requestPreventedHandlingResponse(fetchRequest, fetchResponse) {}

  requestFailedWithResponse(fetchRequest, fetchResponse) {}

  isPreloadable(link) {
    const href = link.getAttribute("href")

    if (
      !href ||
      href === "#" ||
      link.dataset.turbo === "false" ||
      link.dataset.turboPredictivePreload === "false"
    ) {
      return false
    }

    if (link.origin !== document.location.origin) {
      return false
    }

    if (!["http:", "https:"].includes(link.protocol)) {
      return false
    }

    if (
      link.pathname + link.search ===
      document.location.pathname + document.location.search
    ) {
      return false
    }

    if (link.dataset.turboMethod && link.dataset.turboMethod !== "get") {
      return false
    }

    if (targetsIframe(link)) {
      return false
    }

    if (
      link.pathname + link.search ===
      document.location.pathname + document.location.search
    ) {
      return false
    }

    const turboPreloadParent = findClosestRecursively(
      link,
      "[data-turbo-predictive-preload]"
    )

    if (
      turboPreloadParent &&
      turboPreloadParent.dataset.turboPredictivePreload === "false"
    ) {
      return false
    }

    return true
  }

  get #cacheTtl() {
    return (
      Number(getMetaContent("turbo-predictive-preload-cache-time")) || cacheTtl
    )
  }

  get #predictivePreloadDelay() {
    return getMetaContent("turbo-predictive-preload-delay")
  }
}

const targetsIframe = (link) => {
  return !doesNotTargetIFrame(link)
}
