import { useNuxtApp } from '#app';
export const useProductsManufacture = () => {
  const { $axios } = (useNuxtApp() as any);

  const getManufactures = async () => {
    try {
      const response = await $axios.get('/api/productmanufacture/all');
      return response.data;
       } catch (error) {
      console.error('Failed to fetch manufactures:', error);
      throw error;
    }
  };

  return {
     getManufactures,
  };
}