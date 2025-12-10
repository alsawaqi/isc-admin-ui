import { useNuxtApp } from "nuxt/app";

export const useProductsBrands = () => {
  
  
  const { $axios } = (useNuxtApp() as any);


  const getProductBrands = async () => {
    try {
      const response = await $axios.get('/api/productbrands/all');
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