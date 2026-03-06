import request from 'supertest';
import app from '../../src/app';

describe('GET /api/countries', () => {
  it('should return countries', async () => {
    const res = await request(app).get('/api/countries');
    expect(res.status).toBe(200);
  });
});
