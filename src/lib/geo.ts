import "server-only"

import { Country, State } from "country-state-city"

export type GeoOption = { name: string; isoCode: string }

export function listCountries(): GeoOption[] {
  return Country.getAllCountries()
    .map((c) => ({ name: c.name, isoCode: c.isoCode }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function listStatesOfCountry(countryIsoCode: string): GeoOption[] {
  return State.getStatesOfCountry(countryIsoCode)
    .map((s) => ({ name: s.name, isoCode: s.isoCode }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
