const http = require('http')

const MAX_RETRIES = 30
const RETRY_INTERVAL = 1000

function checkServer(retries = 0) {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:5173', (res) => {
      console.log('Vite server is ready!')
      resolve()
    })

    req.on('error', () => {
      if (retries < MAX_RETRIES) {
        console.log(`Waiting for Vite server... (${retries + 1}/${MAX_RETRIES})`)
        setTimeout(() => {
          checkServer(retries + 1).then(resolve).catch(reject)
        }, RETRY_INTERVAL)
      } else {
        reject(new Error('Vite server did not start in time'))
      }
    })

    req.end()
  })
}

checkServer()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
