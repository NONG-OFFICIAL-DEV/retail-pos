import http from './api'

export default {
  list: () => http.get('/v1/branches'),
}