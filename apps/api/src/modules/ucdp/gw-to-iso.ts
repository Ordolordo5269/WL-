/**
 * Gleditsch-Ward country code → ISO 3166-1 alpha-3 mapping
 * Used to convert UCDP country_id values to standard ISO codes
 */
export const GW_TO_ISO3: Record<number, string> = {
  2: 'USA', 20: 'CAN', 31: 'BHS', 40: 'CUB', 41: 'HTI', 42: 'DOM',
  51: 'JAM', 52: 'TTO', 53: 'BRB', 54: 'DMA', 55: 'GRD', 56: 'SLC',
  57: 'SVG', 58: 'ATG', 60: 'KNA', 70: 'MEX', 80: 'BLZ', 90: 'GTM',
  91: 'HND', 92: 'SLV', 93: 'NIC', 94: 'CRI', 95: 'PAN', 100: 'COL',
  101: 'VEN', 110: 'GUY', 115: 'SUR', 130: 'ECU', 135: 'PER', 140: 'BRA',
  145: 'BOL', 150: 'PRY', 155: 'CHL', 160: 'ARG', 165: 'URY',
  200: 'GBR', 205: 'IRL', 210: 'NLD', 211: 'BEL', 212: 'LUX',
  220: 'FRA', 225: 'CHE', 230: 'ESP', 235: 'PRT', 255: 'DEU',
  260: 'DEU', 265: 'DEU', 290: 'POL', 305: 'AUT', 310: 'HUN',
  315: 'CZE', 316: 'CZE', 317: 'SVK', 325: 'ITA', 338: 'MLT',
  339: 'ALB', 341: 'MNE', 343: 'MKD', 344: 'HRV', 345: 'SRB',
  346: 'BIH', 349: 'SVN', 350: 'GRC', 352: 'CYP', 355: 'BGR',
  359: 'MDA', 360: 'ROU', 365: 'RUS', 366: 'EST', 367: 'LVA',
  368: 'LTU', 369: 'UKR', 370: 'BLR', 371: 'ARM', 372: 'GEO',
  373: 'AZE', 375: 'FIN', 380: 'SWE', 385: 'NOR', 390: 'DNK',
  395: 'ISL',
  402: 'CPV', 404: 'GNB', 411: 'GIN', 420: 'GMB', 432: 'MLI',
  433: 'SEN', 434: 'BEN', 435: 'MRT', 436: 'NER', 437: 'CIV',
  438: 'GIN', 439: 'BFA', 450: 'LBR', 451: 'SLE', 452: 'GHA',
  461: 'TGO', 471: 'CMR', 475: 'NGA', 481: 'GAB', 482: 'CAF',
  483: 'TCD', 484: 'COG', 490: 'COD', 500: 'UGA', 501: 'KEN',
  510: 'TZA', 516: 'BDI', 517: 'RWA', 520: 'SOM', 522: 'DJI',
  530: 'ETH', 531: 'ERI', 540: 'AGO', 541: 'MOZ', 551: 'ZMB',
  552: 'ZWE', 553: 'MWI', 560: 'ZAF', 565: 'NAM', 570: 'LSO',
  571: 'BWA', 572: 'SWZ', 580: 'MDG', 581: 'COM', 590: 'MUS',
  591: 'SYC', 600: 'MAR', 615: 'DZA', 616: 'TUN', 620: 'LBY',
  625: 'SDN', 626: 'SSD', 630: 'IRN', 640: 'TUR', 645: 'IRQ',
  651: 'EGY', 652: 'SYR', 660: 'LBN', 663: 'JOR', 666: 'ISR',
  670: 'SAU', 678: 'YEM', 679: 'YEM', 680: 'YEM', 690: 'KWT',
  692: 'BHR', 694: 'QAT', 696: 'ARE', 698: 'OMN',
  700: 'AFG', 701: 'TKM', 702: 'TJK', 703: 'KGZ', 704: 'UZB',
  710: 'CHN', 711: 'TWN', 712: 'MNG', 713: 'TWN',
  730: 'KOR', 731: 'PRK', 732: 'KOR',
  740: 'JPN', 750: 'IND', 770: 'PAK', 771: 'BGD', 775: 'MMR',
  780: 'LKA', 781: 'MDV', 790: 'NPL', 800: 'THA', 811: 'KHM',
  812: 'LAO', 816: 'VNM', 817: 'VNM', 820: 'MYS', 830: 'SGP',
  835: 'BRN', 840: 'PHL', 850: 'IDN', 860: 'TLS',
  900: 'AUS', 910: 'PNG', 920: 'NZL', 935: 'VUT', 940: 'SLB',
  946: 'FJI',
  950: 'WSM', 955: 'TON',
};

export function gwToIso3(gwCode: number): string | undefined {
  return GW_TO_ISO3[gwCode];
}

/**
 * Extract all ISO3 codes from UCDP event's involved countries
 */
export function extractInvolvedISO(countryId: number, gwnoa: string | null, gwnob: string | null): string[] {
  const isos = new Set<string>();
  const mainIso = gwToIso3(countryId);
  if (mainIso) isos.add(mainIso);

  for (const gw of [gwnoa, gwnob]) {
    if (gw) {
      // Can be comma-separated
      for (const code of gw.split(',')) {
        const num = parseInt(code.trim(), 10);
        if (!isNaN(num)) {
          const iso = gwToIso3(num);
          if (iso) isos.add(iso);
        }
      }
    }
  }

  return Array.from(isos);
}
