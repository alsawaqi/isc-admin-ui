// services/shippingApi.ts
export const useShippingApi = () => {
  const { $axios } = useNuxtApp()

  // Shipper
  const createShipper = (payload:any) => $axios.post('/api/v1/shipping/shippers', payload)

  // Contacts
  const createContact = (shipperId:number, payload:any) =>
    $axios.post(`/api/v1/shipping/shippers/${shipperId}/contacts`, payload)

  // Destinations
  const createDestination = (shipperId:number, payload:any) =>
    $axios.post(`/api/v1/shipping/shippers/${shipperId}/destinations`, payload)

  // Rate flags
  const createRateFlags = (destinationId:number, payload:any) =>
    $axios.post(`/api/v1/shipping/destinations/${destinationId}/shipping-rates`, payload)

  // Volume rates
  const createVolumeRate = (destinationId:number, payload:any) =>
    $axios.post(`/api/v1/shipping/destinations/${destinationId}/volume-rates`, payload)

  // Weight rates
  const createWeightRate = (destinationId:number, payload:any) =>
    $axios.post(`/api/v1/shipping/destinations/${destinationId}/weight-rates`, payload)

  // Heavy
  const createVehicle = (shipperId:number, payload:any) =>
    $axios.post(`/api/v1/shipping/shippers/${shipperId}/vehicles`, payload)

  const createHeavyRate = (destinationId:number, payload:any) =>
    $axios.post(`/api/v1/shipping/destinations/${destinationId}/heavy-rates`, payload)

  return {
    createShipper, createContact, createDestination, createRateFlags,
    createVolumeRate, createWeightRate, createVehicle, createHeavyRate
  }
}
