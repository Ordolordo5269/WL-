import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function queryGdpData() {
  try {
    console.log('\n=== GDP Data in Database ===\n');

    // Get total count
    const totalCount = await prisma.indicatorValue.count({
      where: { indicatorCode: 'GDP_USD' }
    });
    console.log(`Total GDP records: ${totalCount}\n`);

    // Get countries with GDP data
    const countriesWithGdp = await prisma.entity.findMany({
      where: {
        type: 'COUNTRY',
        iso3: { not: null },
        indicators: {
          some: {
            indicatorCode: 'GDP_USD',
            value: { not: null }
          }
        }
      },
      select: {
        name: true,
        iso3: true,
        indicators: {
          where: {
            indicatorCode: 'GDP_USD',
            value: { not: null }
          },
          orderBy: {
            year: 'desc'
          },
          select: {
            year: true,
            value: true,
            source: true
          }
        }
      },
      orderBy: {
        iso3: 'asc'
      }
    });

    console.log(`Countries with GDP data: ${countriesWithGdp.length}\n`);
    console.log('Country | ISO3 | Latest Year | GDP (USD) | Source');
    console.log('─'.repeat(80));

    for (const country of countriesWithGdp) {
      if (!country.indicators || country.indicators.length === 0) continue;
      
      const latest = country.indicators[0];
      const gdpValue = latest.value ? Number(latest.value.toString()) : null;
      const gdpFormatted = gdpValue 
        ? gdpValue >= 1e12 
          ? `$${(gdpValue / 1e12).toFixed(2)}T`
          : gdpValue >= 1e9
          ? `$${(gdpValue / 1e9).toFixed(2)}B`
          : gdpValue >= 1e6
          ? `$${(gdpValue / 1e6).toFixed(2)}M`
          : `$${gdpValue.toFixed(2)}`
        : 'N/A';
      
      console.log(
        `${country.name.padEnd(20)} | ${country.iso3?.padEnd(3) || 'N/A'} | ${String(latest.year).padEnd(11)} | ${gdpFormatted.padEnd(12)} | ${latest.source || 'N/A'}`
      );
    }

    // Summary by year
    console.log('\n' + '─'.repeat(80));
    console.log('\n=== Summary by Year ===\n');
    
    const byYear = await prisma.indicatorValue.groupBy({
      by: ['year'],
      where: {
        indicatorCode: 'GDP_USD',
        value: { not: null }
      },
      _count: {
        id: true
      },
      orderBy: {
        year: 'desc'
      },
      take: 10
    });

    console.log('Year | Count');
    console.log('─'.repeat(20));
    for (const item of byYear) {
      console.log(`${item.year} | ${item._count.id}`);
    }

    // Check for Yemen specifically
    console.log('\n' + '─'.repeat(80));
    console.log('\n=== Yemen GDP Data ===\n');
    
    const yemen = await prisma.entity.findFirst({
      where: {
        type: 'COUNTRY',
        OR: [
          { iso3: 'YEM' },
          { name: { contains: 'Yemen', mode: 'insensitive' } }
        ]
      },
      include: {
        indicators: {
          where: {
            indicatorCode: 'GDP_USD'
          },
          orderBy: {
            year: 'desc'
          },
          take: 5
        }
      }
    });

    if (yemen) {
      console.log(`Found: ${yemen.name} (ISO3: ${yemen.iso3 || 'N/A'})`);
      if (yemen.indicators.length > 0) {
        console.log('\nGDP Records:');
        for (const ind of yemen.indicators) {
          const val = ind.value ? Number(ind.value.toString()) : null;
          const formatted = val ? `$${(val / 1e9).toFixed(2)}B` : 'N/A';
          console.log(`  ${ind.year}: ${formatted} (${ind.source || 'N/A'})`);
        }
      } else {
        console.log('No GDP data found for Yemen');
      }
    } else {
      console.log('Yemen not found in database');
    }

  } catch (error) {
    console.error('Error querying GDP data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

queryGdpData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });



















