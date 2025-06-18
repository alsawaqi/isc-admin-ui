import axios from 'axios'

export default () => {
  const config = useRuntimeConfig()

  return axios.create({
    baseURL: config.public.apiBase
  })
}
