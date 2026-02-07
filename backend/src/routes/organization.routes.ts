import { Router } from 'express';
import { prisma } from '../db/client';

const router = Router();

// GET /api/organizations/:org/members
router.get('/:org/members', async (req, res) => {
  const orgParam = String(req.params.org || '').toLowerCase();
  const aliasToSlug: Record<string, string> = {
    nato: 'nato', otan: 'nato',
    eu: 'eu', ue: 'eu'
  };
  const slug = aliasToSlug[orgParam] || orgParam;
  try {
    const org = await prisma.entity.findFirst({ where: { slug, type: 'ORGANIZATION' } });
    if (!org) {
      // Fallback static members when DB is not seeded yet
      const FALLBACK: Record<string, string[]> = {
        nato: ['USA','CAN','GBR','FRA','DEU','ITA','ESP','PRT','NLD','BEL','LUX','DNK','NOR','ISL','GRC','TUR','POL','CZE','SVK','HUN','ROU','BGR','HRV','SVN','LTU','LVA','EST','ALB','MNE','MKD','FIN','SWE'],
        eu: ['FRA','DEU','ITA','ESP','PRT','NLD','BEL','LUX','IRL','DNK','SWE','FIN','POL','CZE','SVK','HUN','ROU','BGR','HRV','SVN','LTU','LVA','EST','MLT','CYP','AUT','GRC']
      };
      const iso = FALLBACK[slug];
      if (iso) {
        return res.json({ organization: { slug, name: slug.toUpperCase() }, members: iso.map(i => ({ iso3: i })) });
      }
      return res.status(404).json({ error: 'Organization not found' });
    }
    const relations = await prisma.relation.findMany({ where: { type: 'MEMBER_OF', toId: org.id }, include: { from: true } });
    const members = relations.map(r => ({ iso3: r.from.iso3, name: r.from.name })).filter(m => !!m.iso3);
    res.json({ organization: { slug, name: org.name }, members });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;


