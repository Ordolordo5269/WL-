import { AlignmentBlock, AlignmentDimension } from '../types/alignment.types';

export const DIMENSIONS: AlignmentDimension[] = [
  'un_ideal_points',
  'un_vote_similarity',
  'alliance_depth',
  'defense_network_centrality',
  'un_peacekeeping_troops',
  // Military
  'manpower_total_population',
  'manpower_military_age_population',
  'manpower_fit_for_service',
  'manpower_reaching_military_age_annual',
  'active_forces',
  'reserve_forces',
  'paramilitary_forces',
  'military_spending_total',
  'military_spending_per_capita',
  'tanks',
  'armored_vehicles',
  'towed_artillery',
  'self_propelled_artillery',
  'mlrs',
  'total_aircraft',
  'fighter_aircraft',
  'attack_aircraft',
  'transport_aircraft',
  'tanker_aircraft',
  'helicopters',
  'attack_helicopters',
  'carriers',
  'destroyers',
  'frigates',
  'corvettes',
  'submarines',
  'offshore_patrol_vessels',
  'minesweepers',
  'nuclear_warheads',
  'ballistic_missile_systems',
  'cyber_capabilities_index',
  'ew_capabilities_index',
  'readiness_aircraft_availability_rate',
  'overseas_bases_count',
  'refueling_capacity',
  'strategic_ports_count',
  'strategic_airports_count',
  'defense_industry_export_rank',
  'defense_industry_import_rank',
  // Economy & finance
  'gdp_ppp_total',
  'gdp_per_capita_ppp',
  'trade_exports_west_ratio',
  'trade_imports_west_ratio',
  'trade_exports_china_ratio',
  'trade_imports_china_ratio',
  'fdi_inflows_from_west_ratio',
  'fdi_inflows_from_china_ratio',
  'debt_from_china_bri_ratio',
  'swift_usage_share',
  'cips_usage_share',
  'fx_reserves_usd_eur_share',
  'fx_reserves_rmb_share',
  // Resources & logistics
  'oil_production',
  'gas_production',
  'coal_production',
  'oil_consumption',
  'gas_consumption',
  'coal_consumption',
  'proven_hydrocarbon_reserves_index',
  'strategic_minerals_reserves_index',
  'road_network_km',
  'rail_network_km',
  'port_count',
  'airport_count',
  'agriculture_self_sufficiency_index',
  // Technology & innovation
  'rnd_gdp_percent',
  'pct_patents',
  'tech_value_chain_participation_index',
  'space_satellites_launched',
  'space_launch_access',
  // Soft power & opinion
  'pew_usa_favorability',
  'pew_china_favorability',
  'soft_power_rank',
  'student_flows_to_usa',
  'student_flows_to_china',
  'inbound_tourism',
  // Stability & context
  'sanctions_imposed_score',
  'sanctions_received_score',
  'conflicts_active_count',
  'political_changes_recent_index',
  'disaster_epidemic_impact_index',
];

export const DIMENSION_BLOCK: Record<AlignmentDimension, AlignmentBlock> = Object.freeze({
  un_ideal_points: 'diplomacy',
  un_vote_similarity: 'diplomacy',
  alliance_depth: 'diplomacy',
  defense_network_centrality: 'diplomacy',
  un_peacekeeping_troops: 'diplomacy',

  manpower_total_population: 'military',
  manpower_military_age_population: 'military',
  manpower_fit_for_service: 'military',
  manpower_reaching_military_age_annual: 'military',
  active_forces: 'military',
  reserve_forces: 'military',
  paramilitary_forces: 'military',
  military_spending_total: 'military',
  military_spending_per_capita: 'military',
  tanks: 'military',
  armored_vehicles: 'military',
  towed_artillery: 'military',
  self_propelled_artillery: 'military',
  mlrs: 'military',
  total_aircraft: 'military',
  fighter_aircraft: 'military',
  attack_aircraft: 'military',
  transport_aircraft: 'military',
  tanker_aircraft: 'military',
  helicopters: 'military',
  attack_helicopters: 'military',
  carriers: 'military',
  destroyers: 'military',
  frigates: 'military',
  corvettes: 'military',
  submarines: 'military',
  offshore_patrol_vessels: 'military',
  minesweepers: 'military',
  nuclear_warheads: 'military',
  ballistic_missile_systems: 'military',
  cyber_capabilities_index: 'military',
  ew_capabilities_index: 'military',
  readiness_aircraft_availability_rate: 'military',
  overseas_bases_count: 'military',
  refueling_capacity: 'military',
  strategic_ports_count: 'military',
  strategic_airports_count: 'military',
  defense_industry_export_rank: 'military',
  defense_industry_import_rank: 'military',

  gdp_ppp_total: 'econ_fin',
  gdp_per_capita_ppp: 'econ_fin',
  trade_exports_west_ratio: 'econ_fin',
  trade_imports_west_ratio: 'econ_fin',
  trade_exports_china_ratio: 'econ_fin',
  trade_imports_china_ratio: 'econ_fin',
  fdi_inflows_from_west_ratio: 'econ_fin',
  fdi_inflows_from_china_ratio: 'econ_fin',
  debt_from_china_bri_ratio: 'econ_fin',
  swift_usage_share: 'econ_fin',
  cips_usage_share: 'econ_fin',
  fx_reserves_usd_eur_share: 'econ_fin',
  fx_reserves_rmb_share: 'econ_fin',

  oil_production: 'resources',
  gas_production: 'resources',
  coal_production: 'resources',
  oil_consumption: 'resources',
  gas_consumption: 'resources',
  coal_consumption: 'resources',
  proven_hydrocarbon_reserves_index: 'resources',
  strategic_minerals_reserves_index: 'resources',
  road_network_km: 'resources',
  rail_network_km: 'resources',
  port_count: 'resources',
  airport_count: 'resources',
  agriculture_self_sufficiency_index: 'resources',

  rnd_gdp_percent: 'technology',
  pct_patents: 'technology',
  tech_value_chain_participation_index: 'technology',
  space_satellites_launched: 'technology',
  space_launch_access: 'technology',

  pew_usa_favorability: 'soft',
  pew_china_favorability: 'soft',
  soft_power_rank: 'soft',
  student_flows_to_usa: 'soft',
  student_flows_to_china: 'soft',
  inbound_tourism: 'soft',

  sanctions_imposed_score: 'stability',
  sanctions_received_score: 'stability',
  conflicts_active_count: 'stability',
  political_changes_recent_index: 'stability',
  disaster_epidemic_impact_index: 'stability',
});

export const DEFAULT_BLOCK_WEIGHTS: Record<AlignmentBlock, number> = Object.freeze({
  military: 0.4,
  econ_fin: 0.2,
  diplomacy: 0.15,
  resources: 0.1,
  technology: 0.075,
  soft: 0.05,
  stability: 0.025,
});

export function computeDefaultDimensionWeights(blockWeights: Record<AlignmentBlock, number>) {
  const counts: Record<AlignmentBlock, number> = { diplomacy: 0, military: 0, econ_fin: 0, resources: 0, technology: 0, soft: 0, stability: 0 };
  for (const dim of DIMENSIONS) {
    counts[DIMENSION_BLOCK[dim]] += 1;
  }

  const byDimension: Record<AlignmentDimension, number> = {} as any;
  const vector: number[] = new Array(DIMENSIONS.length).fill(0);
  DIMENSIONS.forEach((dim, idx) => {
    const block = DIMENSION_BLOCK[dim];
    const w = blockWeights[block] / Math.max(1, counts[block]);
    byDimension[dim] = w;
    vector[idx] = w;
  });
  return { vector, byDimension };
}

export function dimensionIndexMap(): Record<AlignmentDimension, number> {
  const map: Record<AlignmentDimension, number> = {} as any;
  DIMENSIONS.forEach((d, i) => (map[d] = i));
  return map;
}

