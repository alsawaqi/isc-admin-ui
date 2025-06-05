export interface Post {
  id: string
  title: string
}

export const getPosts = async (): Promise<Post[]> => {
  const { default: api } = await import('@/composables/useAxios')
  const res = await api.get<Post[]>('/posts')
  return res.data
}