export const useProductType = () => {
  const { $axios } = useNuxtApp();
    
   const getProductType = async () => {
        try {
        const response = await $axios.get('/api/producttype');
        return response.data.data;
        } catch (error) {
        console.error('Failed to create product type:', error);
        throw error;
        }
    };

 return {
    getProductType,
 }


}  