import { useNuxtApp } from '#app';

export const useProductType = () => {
  const { $axios } = (useNuxtApp() as any);
    
   const getProductType = async () => {
        try {
        const response = await $axios.get('/api/producttype/all');
        return response.data;
        } catch (error) {
        console.error('Failed to create product type:', error);
        throw error;
        }
    };

 return {
    getProductType,
 }


}  