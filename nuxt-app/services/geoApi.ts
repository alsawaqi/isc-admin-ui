export const useGeoApi = () => {
  const { $axios } = useNuxtApp()

  // Countries (for regions & districts context)
  const listCountries = () => $axios.get('/api/regions/countries')

  // Regions with optional filter
  // - all: GET /api/regions
  // - by country: GET /api/regions?country_id=#
  const listRegions = (countryId?: number) =>
    $axios.get('/api/geo/regions', { params: countryId ? { country_id: countryId } : {} })

  // Districts with optional filters
  // - by region:   GET /api/districts?region_id=#
  // - by country:  GET /api/districts?country_id=#   (your controller supports both)
  // - both:        GET /api/districts?country_id=#&region_id=#
  const listDistricts = (opts: { country_id?: number; region_id?: number }) =>
    $axios.get(`/api/geo/districts/by-region/${opts.region_id}`, { params: opts })

  return { listCountries, listRegions, listDistricts }
}
