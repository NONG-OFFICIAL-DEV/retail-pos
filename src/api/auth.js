import http from './api'

/**
 * login
 * @param {string} email
 * @param {string} password
 * @param {route name get from laravel base one api url} /v1/auth/login
 * @returns
 */
export default {
  userLogin(email, password) {
    return http.post('/login', {
      email: email, // must match Laravel field
      password: password // must match Laravel field
    })
  },

  userLogout() {
    return http.post('/logout') // call your backend logout endpoint
  },

  me() {
    return http.get('/me', {
      meta: { loader: 'skeleton' }
    })
  }
}
