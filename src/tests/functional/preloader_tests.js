import { test } from "@playwright/test"
import { assert } from "chai"
import { nextEventOnTarget } from "../helpers/page"

test("preloads snapshot on initial load", async ({ page }) => {
  const requestLocations = []

  page.on("request", (request) => {
    requestLocations.push(request.url())
  })

  // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloaded.html"]`
  await page.goto("/src/tests/fixtures/preloading.html")

  const preloadLink = page.locator("#preload_anchor")
  const href = await preloadLink.evaluate((link) => link.href)

  assert.include(requestLocations, href)
})

test("preloads snapshot on page visit", async ({ page }) => {
  // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloading.html"]`
  await page.goto("/src/tests/fixtures/hot_preloading.html")

  const requestLocations = []

  page.on("request", (request) => {
    requestLocations.push(request.url())
  })

  await page.click("#hot_preload_anchor")

  const preloadLink = page.locator("#preload_anchor")
  const href = await preloadLink.evaluate((link) => link.href)

  assert.include(requestLocations, href)
})

test("preloads anchor from frame that will drive the page", async ({
  page
}) => {
  const requestLocations = []

  page.on("request", (request) => {
    requestLocations.push(request.url())
  })

  await page.goto("/src/tests/fixtures/frame_preloading.html")
  await nextEventOnTarget(page, "menu", "turbo:frame-load")

  const preloadLink = page.locator("#menu a[data-turbo-frame=_top]")
  const href = await preloadLink.evaluate((link) => link.href)

  assert.include(requestLocations, href)
})

test("does not preload anchor off-site", async ({ page }) => {
  const requestLocations = []

  page.on("request", (request) => {
    requestLocations.push(request.url())
  })

  await page.goto("/src/tests/fixtures/preloading.html")

  const link = page.locator("a[href*=https]")
  const href = await link.evaluate((link) => link.href)

  assert.notInclude(requestLocations, href)
})

test("does not preload anchor that will drive an ancestor frame", async ({
  page
}) => {
  const requestLocations = []

  page.on("request", (request) => {
    requestLocations.push(request.url())
  })

  await page.goto("/src/tests/fixtures/frame_preloading.html")

  const preloadLink = page.locator("#hello a[data-turbo-preload]")
  const href = await preloadLink.evaluate((link) => link.href)

  assert.notInclude(requestLocations, href)
})

test("does not preload anchor that will drive a target frame", async ({
  page
}) => {
  const requestLocations = []

  page.on("request", (request) => {
    requestLocations.push(request.url())
  })

  await page.goto("/src/tests/fixtures/frame_preloading.html")

  const link = page.locator("a[data-turbo-frame=hello]")
  const href = await link.evaluate((link) => link.href)

  assert.notInclude(requestLocations, href)
})

test("does not preload a link with [data-turbo=false]", async ({ page }) => {
  const requestLocations = []

  page.on("request", (request) => {
    requestLocations.push(request.url())
  })

  await page.goto("/src/tests/fixtures/preloading.html")

  const link = page.locator("[data-turbo=false] a")
  const href = await link.evaluate((link) => link.href)

  assert.notInclude(requestLocations, href)
})

test("does not preload a link with [data-turbo-method]", async ({ page }) => {
  const requestLocations = []

  page.on("request", (request) => {
    requestLocations.push(request.url())
  })

  await page.goto("/src/tests/fixtures/preloading.html")

  const preloadLink = page.locator("a[data-turbo-method]")
  const href = await preloadLink.evaluate((link) => link.href)

  assert.notInclude(requestLocations, href)
})

test("test preloads after adding data-turbo-preload attribute at runtime", async ({
  page
}) => {
  const requestLocations = []

  page.on("request", (request) => {
    requestLocations.push(request.url())
  })

  await page.goto("/src/tests/fixtures/preloading.html")

  await page.evaluate(async () => {
    document
      .querySelector("#preload_anchor_without_preload_attribute")
      .setAttribute("data-turbo-preload", "true")
  })

  const preloadLink = page.locator("#preload_anchor_without_preload_attribute")
  const href = await preloadLink.evaluate((link) => link.href)

  assert.include(requestLocations, href)
})
