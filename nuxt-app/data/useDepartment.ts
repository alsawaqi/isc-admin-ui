export const useDepartment = () => {
  const { $axios } = useNuxtApp();

  const createDepartment = async (name: string) => {
    try {
      const response = await $axios.post('/api/productdepartment', {
        name,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create department:', error);
      throw error;
    }
  };


   const getDepartments = async () => {
    try {
      const response = await $axios.get('/api/productdepartment');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      throw error;
    }
  };

  return {
    createDepartment,
     getDepartments,
  };
};
