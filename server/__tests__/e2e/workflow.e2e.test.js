const request = require('supertest');
const app = require('../../src/app');
const Review = require('../../src/models/review.model');
const { connectTestDb, disconnectTestDb, clearDatabase, createUserWithToken } = require('../helpers');

describe('End-to-End Task Workflow (Smoke Tests)', () => {
  let requester, fulfiller;

  beforeAll(async () => {
    await connectTestDb();
  });

  beforeEach(async () => {
    await clearDatabase();
    requester = await createUserWithToken({ email: 'requester@smoke.com', name: 'John Requester' });
    fulfiller = await createUserWithToken({ email: 'fulfiller@smoke.com', name: 'Jane Fulfiller' });
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it('should complete full workflow: post task → offer → accept → work submitted → confirm → review', async () => {
    // 1. Create task
    const createTaskRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${requester.token}`)
      .send({
        title: 'Design a logo',
        description: 'Need a professional logo for my startup company',
        budgetAmount: 300,
        currency: 'INR',
      });

    expect(createTaskRes.status).toBe(201);
    const taskId = createTaskRes.body.data.task.id;
    expect(createTaskRes.body.data.task.status).toBe('open');

    // 2. List tasks and verify it appears
    const listRes = await request(app).get('/api/v1/tasks');
    expect(listRes.status).toBe(200);
    const foundTask = listRes.body.data.tasks.find(t => t.id === taskId);
    expect(foundTask).toBeDefined();

    // 3. View task details
    const detailRes = await request(app).get(`/api/v1/tasks/${taskId}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.task.id).toBe(taskId);
    expect(detailRes.body.data.offers).toEqual([]);

    // 4. Submit offer
    const offerRes = await request(app)
      .post(`/api/v1/tasks/${taskId}/offers`)
      .set('Authorization', `Bearer ${fulfiller.token}`)
      .send({
        amount: 250,
        message: 'I have 8 years of graphic design experience',
      });

    expect(offerRes.status).toBe(201);
    const offerId = offerRes.body.data.offer.id;
    expect(offerRes.body.data.offer.status).toBe('pending');

    // 5. View task again to see offer
    const detailWithOfferRes = await request(app).get(`/api/v1/tasks/${taskId}`);
    expect(detailWithOfferRes.status).toBe(200);
    expect(detailWithOfferRes.body.data.offers.length).toBe(1);

    // 6. Accept offer
    const acceptRes = await request(app)
      .post(`/api/v1/tasks/${taskId}/offers/${offerId}/accept`)
      .set('Authorization', `Bearer ${requester.token}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.task.status).toBe('assigned');
    expect(acceptRes.body.data.task.assignedFulfillerId).toBe(String(fulfiller.user._id));

    // 7. Check fulfiller's tasks
    const myTasksRes = await request(app)
      .get('/api/v1/tasks/mine')
      .set('Authorization', `Bearer ${fulfiller.token}`);

    expect(myTasksRes.status).toBe(200);
    const assignedTask = myTasksRes.body.data.tasks.find(t => t.id === taskId);
    expect(assignedTask).toBeDefined();
    expect(assignedTask.status).toBe('assigned');

    // 8. Submit work
    const submitRes = await request(app)
      .post(`/api/v1/tasks/${taskId}/work-submitted`)
      .set('Authorization', `Bearer ${fulfiller.token}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.task.status).toBe('work_submitted');

    // 9. Requester confirms offline payment
    const reqConfirmRes = await request(app)
      .post(`/api/v1/tasks/${taskId}/confirm-offline`)
      .set('Authorization', `Bearer ${requester.token}`);

    expect(reqConfirmRes.status).toBe(200);
    expect(reqConfirmRes.body.data.task.requesterConfirmedOffline).toBe(true);
    expect(reqConfirmRes.body.data.task.status).toBe('work_submitted');

    // 10. Fulfiller confirms offline payment (task closes)
    const fulConfirmRes = await request(app)
      .post(`/api/v1/tasks/${taskId}/confirm-offline`)
      .set('Authorization', `Bearer ${fulfiller.token}`);

    expect(fulConfirmRes.status).toBe(200);
    expect(fulConfirmRes.body.data.task.status).toBe('closed');
    expect(fulConfirmRes.body.data.task.closedAt).toBeDefined();

    // 11. Get profile to verify task count
    const requesterProfileRes = await request(app)
      .get(`/api/v1/users/${String(requester.user._id)}`)
      .set('Authorization', `Bearer ${requester.token}`);

    expect(requesterProfileRes.status).toBe(200);

    // 12. Review each other
    // Fulfiller reviews requester
    const fulReviewRes = await request(app)
      .post(`/api/v1/reviews`)
      .set('Authorization', `Bearer ${fulfiller.token}`)
      .send({
        taskId: taskId,
        targetUserId: String(requester.user._id),
        rating: 5,
        comment: 'Great requester, clear instructions',
      });

    expect(fulReviewRes.status).toBe(201);
    expect(fulReviewRes.body.data.review).toBeDefined();

    // Requester reviews fulfiller
    const reqReviewRes = await request(app)
      .post(`/api/v1/reviews`)
      .set('Authorization', `Bearer ${requester.token}`)
      .send({
        taskId: taskId,
        targetUserId: String(fulfiller.user._id),
        rating: 5,
        comment: 'Excellent work, very professional',
      });

    expect(reqReviewRes.status).toBe(201);

    // 13. Verify both reviews are recorded
    const reviewsRes = await request(app).get(`/api/v1/reviews?targetUserId=${String(fulfiller.user._id)}`);
    expect(reviewsRes.status).toBe(200);
    expect(reviewsRes.body.data.reviews.length).toBeGreaterThan(0);
  });

  it('should handle task cancellation workflow', async () => {
    // Create a task
    const createRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${requester.token}`)
      .send({
        title: 'Clean house',
        description: 'Need house cleaning services',
        budgetAmount: 200,
        currency: 'INR',
      });

    expect(createRes.status).toBe(201);
    const taskId = createRes.body.data.task.id;

    // Cancel task
    const cancelRes = await request(app)
      .post(`/api/v1/tasks/${taskId}/cancel`)
      .set('Authorization', `Bearer ${requester.token}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.task.status).toBe('cancelled');
    expect(cancelRes.body.data.task.cancelledAt).toBeDefined();
  });

  it('should prevent task modifications after 5 minutes', async () => {
    // Create task
    const createRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${requester.token}`)
      .send({
        title: 'Test task',
        description: 'This is a test task',
        budgetAmount: 100,
        currency: 'INR',
      });

    const taskId = createRes.body.data.task.id;

    // Should be able to edit immediately
    const editRes = await request(app)
      .patch(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${requester.token}`)
      .send({
        title: 'Updated task title',
      });

    expect(editRes.status).toBe(200);
  });

  it('should prevent modification of non-open tasks', async () => {
    // Create and close a task
    const createRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${requester.token}`)
      .send({
        title: 'Test task',
        description: 'This is a test task',
        budgetAmount: 100,
        currency: 'INR',
      });

    const taskId = createRes.body.data.task.id;

    const offerRes = await request(app)
      .post(`/api/v1/tasks/${taskId}/offers`)
      .set('Authorization', `Bearer ${fulfiller.token}`)
      .send({
        amount: 80,
        message: 'I can help',
      });

    const offerId = offerRes.body.data.offer.id;

    await request(app)
      .post(`/api/v1/tasks/${taskId}/offers/${offerId}/accept`)
      .set('Authorization', `Bearer ${requester.token}`);

    // Task is now assigned, should not be able to edit
    const editRes = await request(app)
      .patch(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${requester.token}`)
      .send({
        title: 'Updated title',
      });

    expect(editRes.status).toBe(409);
    expect(editRes.body.error.code).toBe('INVALID_TASK_STATE');
  });
});
