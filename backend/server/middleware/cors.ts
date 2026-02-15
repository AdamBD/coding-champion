import { eventHandler, setResponseHeaders, sendNoContent } from 'h3'

export default eventHandler((event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })

  if (event.method === 'OPTIONS') {
    sendNoContent(event, 204)
    return
  }
})

