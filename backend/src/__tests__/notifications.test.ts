const request = require('supertest');
const app = require('../app');

describe('Notifications Endpoints', () => {
    it('should return 400 when token is missing', async () => {
        const res = await request(app)
            .post('/notifications/register')
            .send({});
        expect(res.status).toBe(400);
    });

    it('should return 403 when non-caregiver tries to register token', async () => {
        const res = await request(app)
            .post('/notifications/register')
            .send({ token: 'test-push-token', userType: 'patient' });
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Only caregivers can register push tokens');
    });

    it('should return 403 when caregiver is not found', async () => {
        const res = await request(app)
            .post('/notifications/register')
            .send({ token: 'test-push-token', userType: 'caregiver' });
        expect(res.status).toBe(404);
    });

    it('should return 403 when user is not found', async () => {
        const res = await request(app)
            .post('/notifications/register')
            .send({ token: 'test-push-token', userType: 'caregiver' });
        expect(res.status).toBe(404);
    });
});