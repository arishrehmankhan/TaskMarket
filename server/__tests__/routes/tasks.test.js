const request = require('supertest');
const app = require('../../src/app');
const Task = require('../../src/models/task.model');
const Offer = require('../../src/models/offer.model');
const { connectTestDb, disconnectTestDb, clearDatabase, createUserWithToken, createTask, createOffer } = require('../helpers');

describe('Task Lifecycle', () => {
  let requester, fulfiller, otherUser;

  beforeAll(async () => {
    await connectTestDb();
  });

  beforeEach(async () => {
    await clearDatabase();
    requester = await createUserWithToken({ email: 'requester@test.com', name: 'Requester' });
    fulfiller = await createUserWithToken({ email: 'fulfiller@test.com', name: 'Fulfiller' });
    otherUser = await createUserWithToken({ email: 'other@test.com', name: 'Other User' });
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('POST /:taskId/offers', () => {
    it('should create an offer on an open task', async () => {
      const task = await createTask(requester.user._id);

      const response = await request(app)
        .post(`/api/v1/tasks/${task._id}/offers`)
        .set('Authorization', `Bearer ${fulfiller.token}`)
        .send({
          amount: 75,
          message: 'I can complete this task',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.offer).toMatchObject({
        taskId: String(task._id),
        fulfillerId: String(fulfiller.user._id),
        amount: 75,
        message: 'I can complete this task',
        status: 'pending',
      });
    });

    it('should reject offers on non-open tasks', async () => {
      const task = await createTask(requester.user._id);
      task.status = 'closed';
      await task.save();

      const response = await request(app)
        .post(`/api/v1/tasks/${task._id}/offers`)
        .set('Authorization', `Bearer ${fulfiller.token}`)
        .send({
          amount: 75,
          message: 'I can complete this task',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('INVALID_TASK_STATE');
    });

    it('should reject offers from the requester', async () => {
      const task = await createTask(requester.user._id);

      const response = await request(app)
        .post(`/api/v1/tasks/${task._id}/offers`)
        .set('Authorization', `Bearer ${requester.token}`)
        .send({
          amount: 75,
          message: 'I can complete this task',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('INVALID_OFFER');
    });

    it('should validate offer amount and message', async () => {
      const task = await createTask(requester.user._id);

      const response = await request(app)
        .post(`/api/v1/tasks/${task._id}/offers`)
        .set('Authorization', `Bearer ${fulfiller.token}`)
        .send({
          amount: -10, // negative amount
          message: 'x', // too short
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /:taskId/offers/:offerId/accept', () => {
    it('should accept an offer and assign fulfiller', async () => {
      const task = await createTask(requester.user._id);
      const offer = await createOffer(task._id, fulfiller.user._id);

      const response = await request(app)
        .post(`/api/v1/tasks/${task._id}/offers/${offer._id}/accept`)
        .set('Authorization', `Bearer ${requester.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.task).toMatchObject({
        status: 'assigned',
        assignedFulfillerId: String(fulfiller.user._id),
        acceptedOfferId: String(offer._id),
        requesterConfirmedOffline: false,
        fulfillerConfirmedOffline: false,
      });

      // Verify other offers are rejected
      const updatedOffer = await Offer.findById(offer._id);
      expect(updatedOffer.status).toBe('accepted');
    });

    it('should reject other offers when one is accepted', async () => {
      const task = await createTask(requester.user._id);
      const offer1 = await createOffer(task._id, fulfiller.user._id);
      const offer2 = await createOffer(task._id, otherUser.user._id);

      await request(app)
        .post(`/api/v1/tasks/${task._id}/offers/${offer1._id}/accept`)
        .set('Authorization', `Bearer ${requester.token}`);

      const updatedOffer2 = await Offer.findById(offer2._id);
      expect(updatedOffer2.status).toBe('rejected');
    });

    it('should only allow requester to accept offers', async () => {
      const task = await createTask(requester.user._id);
      const offer = await createOffer(task._id, fulfiller.user._id);

      const response = await request(app)
        .post(`/api/v1/tasks/${task._id}/offers/${offer._id}/accept`)
        .set('Authorization', `Bearer ${fulfiller.token}`); // Different user

      expect(response.status).toBe(403);
    });
  });

  describe('POST /:taskId/offers/:offerId/withdraw', () => {
    it('should allow fulfiller to withdraw pending offer', async () => {
      const task = await createTask(requester.user._id);
      const offer = await createOffer(task._id, fulfiller.user._id);

      const response = await request(app)
        .post(`/api/v1/tasks/${task._id}/offers/${offer._id}/withdraw`)
        .set('Authorization', `Bearer ${fulfiller.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.offer.status).toBe('withdrawn');
    });

    it('should reject withdrawal of non-pending offers', async () => {
      const task = await createTask(requester.user._id);
      const offer = await createOffer(task._id, fulfiller.user._id);
      offer.status = 'accepted';
      await offer.save();

      const response = await request(app)
        .post(`/api/v1/tasks/${task._id}/offers/${offer._id}/withdraw`)
        .set('Authorization', `Bearer ${fulfiller.token}`);

      expect(response.status).toBe(409);
    });
  });

  describe('POST /:taskId/work-submitted', () => {
    it('should mark work submitted when task is assigned', async () => {
      const task = await createTask(requester.user._id);
      const offer = await createOffer(task._id, fulfiller.user._id);

      // Accept offer first
      await request(app)
        .post(`/api/v1/tasks/${task._id}/offers/${offer._id}/accept`)
        .set('Authorization', `Bearer ${requester.token}`);

      const response = await request(app)
        .post(`/api/v1/tasks/${task._id}/work-submitted`)
        .set('Authorization', `Bearer ${fulfiller.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.task.status).toBe('work_submitted');
      expect(response.body.data.task.workSubmittedAt).toBeDefined();
    });

    it('should only allow assigned fulfiller to mark work submitted', async () => {
      const task = await createTask(requester.user._id);
      const offer = await createOffer(task._id, fulfiller.user._id);

      await request(app)
        .post(`/api/v1/tasks/${task._id}/offers/${offer._id}/accept`)
        .set('Authorization', `Bearer ${requester.token}`);

      const response = await request(app)
        .post(`/api/v1/tasks/${task._id}/work-submitted`)
        .set('Authorization', `Bearer ${otherUser.token}`);

      expect(response.status).toBe(403);
    });

    it('should reject work-submitted on non-assigned tasks', async () => {
      const task = await createTask(requester.user._id);

      const response = await request(app)
        .post(`/api/v1/tasks/${task._id}/work-submitted`)
        .set('Authorization', `Bearer ${fulfiller.token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /:taskId/confirm-offline', () => {
    it('should confirm offline payment from requester side', async () => {
      const task = await createTask(requester.user._id);
      const offer = await createOffer(task._id, fulfiller.user._id);

      // Accept offer
      await request(app)
        .post(`/api/v1/tasks/${task._id}/offers/${offer._id}/accept`)
        .set('Authorization', `Bearer ${requester.token}`);

      // Mark work submitted
      await request(app)
        .post(`/api/v1/tasks/${task._id}/work-submitted`)
        .set('Authorization', `Bearer ${fulfiller.token}`);

      const response = await request(app)
        .post(`/api/v1/tasks/${task._id}/confirm-offline`)
        .set('Authorization', `Bearer ${requester.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.task.requesterConfirmedOffline).toBe(true);
      expect(response.body.data.task.status).toBe('work_submitted'); // Not closed yet
    });

    it('should close task after both parties confirm', async () => {
      const task = await createTask(requester.user._id);
      const offer = await createOffer(task._id, fulfiller.user._id);

      // Accept offer
      await request(app)
        .post(`/api/v1/tasks/${task._id}/offers/${offer._id}/accept`)
        .set('Authorization', `Bearer ${requester.token}`);

      // Mark work submitted
      await request(app)
        .post(`/api/v1/tasks/${task._id}/work-submitted`)
        .set('Authorization', `Bearer ${fulfiller.token}`);

      // Requester confirms
      await request(app)
        .post(`/api/v1/tasks/${task._id}/confirm-offline`)
        .set('Authorization', `Bearer ${requester.token}`);

      // Fulfiller confirms
      const response = await request(app)
        .post(`/api/v1/tasks/${task._id}/confirm-offline`)
        .set('Authorization', `Bearer ${fulfiller.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.task.status).toBe('closed');
      expect(response.body.data.task.closedAt).toBeDefined();
      expect(response.body.data.task.requesterConfirmedOffline).toBe(true);
      expect(response.body.data.task.fulfillerConfirmedOffline).toBe(true);
    });

    it('should reject confirmation when task not in work_submitted state', async () => {
      const task = await createTask(requester.user._id);

      const response = await request(app)
        .post(`/api/v1/tasks/${task._id}/confirm-offline`)
        .set('Authorization', `Bearer ${requester.token}`);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('INVALID_TASK_STATE');
    });

    it('should only allow task participants to confirm', async () => {
      const task = await createTask(requester.user._id);
      const offer = await createOffer(task._id, fulfiller.user._id);

      await request(app)
        .post(`/api/v1/tasks/${task._id}/offers/${offer._id}/accept`)
        .set('Authorization', `Bearer ${requester.token}`);

      await request(app)
        .post(`/api/v1/tasks/${task._id}/work-submitted`)
        .set('Authorization', `Bearer ${fulfiller.token}`);

      const response = await request(app)
        .post(`/api/v1/tasks/${task._id}/confirm-offline`)
        .set('Authorization', `Bearer ${otherUser.token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Full workflow (open → assigned → work_submitted → closed)', () => {
    it('should complete full task lifecycle', async () => {
      // 1. Create task
      const taskRes = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${requester.token}`)
        .send({
          title: 'Build a website',
          description: 'I need a website built for my business',
          budgetAmount: 500,
          currency: 'INR',
        });

      expect(taskRes.status).toBe(201);
      const taskId = taskRes.body.data.task.id;

      // 2. Submit offer
      const offerRes = await request(app)
        .post(`/api/v1/tasks/${taskId}/offers`)
        .set('Authorization', `Bearer ${fulfiller.token}`)
        .send({
          amount: 400,
          message: 'I have 5 years of web development experience',
        });

      expect(offerRes.status).toBe(201);
      const offerId = offerRes.body.data.offer.id;

      // 3. Accept offer
      const acceptRes = await request(app)
        .post(`/api/v1/tasks/${taskId}/offers/${offerId}/accept`)
        .set('Authorization', `Bearer ${requester.token}`);

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.task.status).toBe('assigned');

      // 4. Mark work submitted
      const submitRes = await request(app)
        .post(`/api/v1/tasks/${taskId}/work-submitted`)
        .set('Authorization', `Bearer ${fulfiller.token}`);

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.data.task.status).toBe('work_submitted');

      // 5. Confirm from requester side
      const confirmReqRes = await request(app)
        .post(`/api/v1/tasks/${taskId}/confirm-offline`)
        .set('Authorization', `Bearer ${requester.token}`);

      expect(confirmReqRes.status).toBe(200);
      expect(confirmReqRes.body.data.task.requesterConfirmedOffline).toBe(true);
      expect(confirmReqRes.body.data.task.status).toBe('work_submitted');

      // 6. Confirm from fulfiller side (should close task)
      const confirmFulRes = await request(app)
        .post(`/api/v1/tasks/${taskId}/confirm-offline`)
        .set('Authorization', `Bearer ${fulfiller.token}`);

      expect(confirmFulRes.status).toBe(200);
      expect(confirmFulRes.body.data.task.status).toBe('closed');
      expect(confirmFulRes.body.data.task.fulfillerConfirmedOffline).toBe(true);
      expect(confirmFulRes.body.data.task.closedAt).toBeDefined();
    });
  });
});
