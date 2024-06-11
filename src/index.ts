import { Server } from "rjweb-server"
import { Runtime } from "@rjweb/runtime-node"
import fs from "fs"
import { getAbsoluteFSPath } from "swagger-ui-dist"
import database from "@/globals/database"
import version from "@/globals/version"
import logger from "@/globals/logger"
import env from "@/globals/env"

const startTime = performance.now()

export const server = new Server(Runtime, {
  port: env.PORT
}, [], {
  database
})

fs.writeFileSync(getAbsoluteFSPath().concat('/swagger-initializer.js'), `
window.onload = function() {
  //<editor-fold desc="Changeable Configuration Block">

  // the following lines will be replaced by docker/configurator, when it runs in a docker-container
  window.ui = SwaggerUIBundle({
    url: "/openapi",
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: "StandaloneLayout"
  });

  //</editor-fold>
};
`)

export const apiRouter = new server.FileLoader('/v2')
  .load('./routes', { fileBasedRouting: true })
  .export()

server.path('/', (path) => path
  .static(getAbsoluteFSPath(), {
    stripHtmlEnding: true
  })
  .http('GET', '/openapi', (http) => http
    .onRequest((ctr) => {
      const openAPI = server.openAPI(env.OPENAPI_TITLE, version, {
        url: env.OPENAPI_URL
      })

      return ctr.print(openAPI)
    })
  )
)

server.http((ctr) => {
  logger()
    .text(`${ctr.type.toUpperCase()} ${ctr.url.method}`, (c) => c.green)
    .text(':')
    .text(ctr.url.href, (c) => c.green)
    .text(ctr.client.ip.usual(), (c) => c.cyan)
    .text(ctr.client.proxied ? '(proxied)' : '(raw)', (c) => c.gray)
    .info()
})

server.notFound((ctr) => {
  return ctr.status(ctr.$status.NOT_FOUND).print({ error: 'Route not found' })
})

server.finish('httpRequest', (ctr) => {
  logger()
    .text(`${ctr.context.response.status} ${ctr.url.method}`, (c) => c.green)
    .text(':')
    .text(ctr.url.href, (c) => c.green)
    .text(ctr.client.ip.usual(), (c) => c.cyan)
    .text(ctr.client.proxied ? '(proxied)' : '(raw)', (c) => c.gray)
    .text(`${ctr.context.elapsed().toFixed(1)}ms`, (c) => c.gray)
    .debug()
})

server.start()
  .then((port) => {
    logger()
      .text('HTTP Server', (c) => c.redBright)
      .text(`(${version}) started on port`)
      .text(port, (c) => c.cyan)
      .text(`(${(performance.now() - startTime).toFixed(1)}ms)`, (c) => c.gray)
      .info()
  })
  .catch((err: Error) => {
    logger()
      .text('HTTP Server', (c) => c.redBright)
      .text('failed starting')
      .text('\n')
      .text(err.stack!, (c) => c.red)
      .error()
  })