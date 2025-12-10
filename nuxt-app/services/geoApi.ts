import {useNuxtApp} from  '#imports';
export const useGeoApi = () => {
  const { $axios } = (useNuxtApp() as any)

  // Countries (for regions & districts context)
  const listCountries = () => $axios.get('/api/geo/countries/all')

  // Regions with optional filter
  // - all: GET /api/regions
  // - by country: GET /api/regions?country_id=#
  const listRegions = (countryId?: number) =>
    $axios.get(`/api/geo/regions/by-country/${countryId}`)

  // Districts with optional filters
  // - by region:   GET /api/districts?region_id=#
  // - by country:  GET /api/districts?country_id=#   (your controller supports both)
  // - both:        GET /api/districts?country_id=#&region_id=#
  const listDistricts = (opts: { region_id?: number }) =>
    $axios.get(`/api/geo/districts/by-region/${opts.region_id}`)

  return { listCountries, listRegions, listDistricts }
}
