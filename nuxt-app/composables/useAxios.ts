import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:81', // Laravel API
})

export default api
