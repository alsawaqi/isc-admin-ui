export const useProductsBrands = () => {
  const { $axios } = useNuxtApp();


  const getProductBrands = async () => {
    try {
      const response = await $axios.get('/api/productbrands');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch product brands:', error);
      throw error;
    }
  };

  return {
    getProductBrands,
  };
}