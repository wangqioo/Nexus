const http = require('http')
const fs = require('fs')
const path = require('path')

const MAX_RETRIES = 60
const RETRY_INTERVAL = 500
const portFile = path.join(__dirname, '..', '.vite-dev-port')

function waitForPortFile(retries = 0) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(portFile)) {
      try {
        const port = parseInt(fs.readFileSync(portFile, 'utf-8').trim(), 10)
        if (port > 0) return resolve(port)
      } catch (_) {}
    }
    if (retries >= MAX_RETRIES) return reject(new Error('Vite port file did not appear in time'))
    setTimeout(() => waitForPortFile(retries + 1).then(resolve).catch(reject), RETRY_INTERVAL)
  })
}

function checkServer(port, retries = 0) {
  const MAX_SERVER_RETRIES = 24
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      console.log('Vite server is ready!')
      resolve()
    })
    req.on('error', (err) => {
      if (retries >= MAX_SERVER_RETRIES) return reject(err)
      setTimeout(() => checkServer(port, retries + 1).then(resolve).catch(reject), 500)
    })
    req.end()
  })
}

waitForPortFile()
  .then((port) => checkServer(port))
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
