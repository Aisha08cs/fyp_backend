const { sendPushNotification } = require('../services/notifications.service');

describe('Notifications Service', () => {
    it('should send push notification successfully', async () => {
        const result = await sendPushNotification('test@example.com', 'Test Title', 'Test Body');
        expect(result).toEqual([{ status: 'ok' }]);
    });

    // it('should handle missing push token', async () => {
    //     const result = await sendPushNotification('test@example.com', 'Test Title', 'Test Body');
    //     expect(result).toBeUndefined();
    // });

    // it('should handle invalid push token', async () => {
    //     const result = await sendPushNotification('test@example.com', 'Test Title', 'Test Body');
    //     expect(result).toBeUndefined();
    // });

    // it('should handle error sending notifications', async () => {
    //     const result = await sendPushNotification('test@example.com', 'Test Title', 'Test Body');
    //     expect(result).toEqual([]);
    // });
});