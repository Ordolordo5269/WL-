export type AlignmentDimension =
	| 'un_ideal_points'
	| 'un_vote_similarity'
	| 'alliance_depth'
	| 'defense_network_centrality'
	| 'un_peacekeeping_troops'
	// Military
	| 'manpower_total_population'
	| 'manpower_military_age_population'
	| 'manpower_fit_for_service'
	| 'manpower_reaching_military_age_annual'
	| 'active_forces'
	| 'reserve_forces'
	| 'paramilitary_forces'
	| 'military_spending_total'
	| 'military_spending_per_capita'
	| 'tanks'
	| 'armored_vehicles'
	| 'towed_artillery'
	| 'self_propelled_artillery'
	| 'mlrs'
	| 'total_aircraft'
	| 'fighter_aircraft'
	| 'attack_aircraft'
	| 'transport_aircraft'
	| 'tanker_aircraft'
	| 'helicopters'
	| 'attack_helicopters'
	| 'carriers'
	| 'destroyers'
	| 'frigates'
	| 'corvettes'
	| 'submarines'
	| 'offshore_patrol_vessels'
	| 'minesweepers'
	| 'nuclear_warheads'
	| 'ballistic_missile_systems'
	| 'cyber_capabilities_index'
	| 'ew_capabilities_index'
	| 'readiness_aircraft_availability_rate'
	| 'overseas_bases_count'
	| 'refueling_capacity'
	| 'strategic_ports_count'
	| 'strategic_airports_count'
	| 'defense_industry_export_rank'
	| 'defense_industry_import_rank'
	// Economy & finance
	| 'gdp_ppp_total'
	| 'gdp_per_capita_ppp'
	| 'trade_exports_west_ratio'
	| 'trade_imports_west_ratio'
	| 'trade_exports_china_ratio'
	| 'trade_imports_china_ratio'
	| 'fdi_inflows_from_west_ratio'
	| 'fdi_inflows_from_china_ratio'
	| 'debt_from_china_bri_ratio'
	| 'swift_usage_share'
	| 'cips_usage_share'
	| 'fx_reserves_usd_eur_share'
	| 'fx_reserves_rmb_share'
	// Resources & logistics
	| 'oil_production'
	| 'gas_production'
	| 'coal_production'
	| 'oil_consumption'
	| 'gas_consumption'
	| 'coal_consumption'
	| 'proven_hydrocarbon_reserves_index'
	| 'strategic_minerals_reserves_index'
	| 'road_network_km'
	| 'rail_network_km'
	| 'port_count'
	| 'airport_count'
	| 'agriculture_self_sufficiency_index'
	// Technology & innovation
	| 'rnd_gdp_percent'
	| 'pct_patents'
	| 'tech_value_chain_participation_index'
	| 'space_satellites_launched'
	| 'space_launch_access'
	// Soft power & opinion
	| 'pew_usa_favorability'
	| 'pew_china_favorability'
	| 'soft_power_rank'
	| 'student_flows_to_usa'
	| 'student_flows_to_china'
	| 'inbound_tourism'
	// Stability & context
	| 'sanctions_imposed_score'
	| 'sanctions_received_score'
	| 'conflicts_active_count'
	| 'political_changes_recent_index'
	| 'disaster_epidemic_impact_index';

export type AlignmentBlock =
	| 'diplomacy'
	| 'military'
	| 'econ_fin'
	| 'resources'
	| 'technology'
	| 'soft'
	| 'stability';

export interface AlignmentSubindices {
	diplomacy: number;
	military: number;
	econ_fin: number;
	resources: number;
	technology: number;
	soft: number;
	stability: number;
}

export interface AlignmentCountryEntry {
	name: string;
	iso3: string;
	vector: number[];
	subindices: AlignmentSubindices;
	sources: Record<string, string>;
	dataQuality: {
		missing: number;
		imputed: string[];
	};
}

export interface AlignmentDataset {
	updatedAt: string; // ISO date
	dimensions: AlignmentDimension[];
	countries: AlignmentCountryEntry[];
}

export interface ProjectionRequestBody {
	vec_x: number[];
	vec_a: number[];
	vec_b: number[];
	weights?: number[];
}

export interface SensitivityRequestBody {
	baseWeights?: number[];
	axis?: {
		vec_a: number[];
		vec_b: number[];
	};
	step?: number; // e.g., 0.2 for ±20%
}

