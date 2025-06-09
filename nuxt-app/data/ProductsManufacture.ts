export const useProductsManufacture = () => {
  const { $axios } = useNuxtApp();

  const getManufactures = async () => {
    try {
      const response = await $axios.get('/api/productmanufacture');
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