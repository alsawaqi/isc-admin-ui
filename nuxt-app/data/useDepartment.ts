import { useNuxtApp } from '#app';
export const useDepartment = () => {
  const { $axios } = (useNuxtApp() as any);

  const createDepartment = async (name: string, namear: string, uploadedImage: File | null) => {
  try {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('namear', namear);
    
    if (uploadedImage) {
      formData.append('file', uploadedImage); // ✅ Now sending actual File
    }

    const response = await $axios.post('/api/productdepartment', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
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


  const DeleteDepartment = async (id: number) => {
     
       try{
          const response = await $axios.delete(`/api/productdepartment/${id}`);
          if (response.status === 200) {
            console.log('Department deleted successfully');
            return true; // Indicate success
          } else {
            console.error('Failed to delete department:', response.data);
            return false; // Indicate failure
          }

       }catch (error) {
          console.error('Failed to delete department:', error);
          throw error;
       }
    
   
  
  }

  return {
    createDepartment,
     getDepartments,
     DeleteDepartment,
  };
};
