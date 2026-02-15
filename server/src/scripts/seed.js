const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');
const env = require('../config/env');
const { connectDatabase } = require('../config/database');
const User = require('../models/user.model');
const Task = require('../models/task.model');
const Offer = require('../models/offer.model');
const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');
const Review = require('../models/review.model');
const Report = require('../models/report.model');

faker.seed(20260215);

const RESET_BY_DEFAULT = !process.argv.includes('--append');

const TASK_TOPICS = [
  'AC servicing',
  'math tutoring',
  'resume review',
  'IKEA furniture assembly',
  'laptop cleanup',
  'birthday decor setup',
  'wedding photo shortlist',
  'Excel dashboard',
  'kitchen deep cleaning',
  'packers and movers coordination',
  'logo touch-up',
  'WordPress bug fix',
];

const TASK_LOCATIONS = [
  'Koramangala',
  'Whitefield',
  'Indiranagar',
  'Noida Sector 62',
  'Gurgaon DLF Phase 3',
  'Andheri East',
  'Powai',
  'Salt Lake',
  'Banjara Hills',
  'Velachery',
];

const OFFER_MESSAGES = [
  'I can start this today evening and share progress photos every 2 hours.',
  'I have done similar jobs in this area and can complete it within your timeline.',
  'This budget works for me; I can handle pickup, execution, and final handover.',
  'I can complete this by tomorrow and provide a short checklist before closure.',
  'I am nearby and available this weekend; happy to align on the exact scope first.',
  'I can take this up with one revision included if you need any small changes.',
];

const CHAT_MESSAGES = [
  'I have reached the location and started the work.',
  'Sharing update: first milestone is completed.',
  'Please confirm this approach before I proceed to the next step.',
  'I have uploaded the latest files for your review.',
  'Can we close this by tonight once you verify?',
  'Offline payment received, thanks. Please confirm from your side too.',
  'I need 30 more minutes to finish the final touches.',
  'Looks good from my side, proceeding with handover now.',
];

const REVIEW_COMMENTS = [
  'Delivered exactly as discussed and kept me updated throughout.',
  'Finished on time, communication was clear, and quality was strong.',
  'Very reliable and easy to coordinate with for offline handover.',
  'Good execution and responsive when I asked for a minor change.',
  'Professional work and completed within the agreed budget.',
  'Great experience overall; would hire again for similar tasks.',
];

const REPORT_REASONS = [
  'The assignee stopped responding after accepting the offer.',
  'The task details were edited after agreement without notice.',
  'Spam-like messages were sent repeatedly in chat.',
  'The user posted misleading requirements and changed scope drastically.',
  'Inappropriate language was used during task discussion.',
  'Suspected duplicate account behavior while bidding on tasks.',
];

const FIXED_DEMO_USERS = [
  {
    fullName: 'Ayesha Khan',
    email: 'ayesha@example.com',
    role: 'user',
    bio: 'Posts home and admin tasks with clear requirements and quick confirmation.',
  },
  {
    fullName: 'Bilal Ahmed',
    email: 'bilal@example.com',
    role: 'user',
    bio: 'Handles on-site and remote jobs with regular progress updates.',
  },
  {
    fullName: 'Hina Noor',
    email: 'hina@example.com',
    role: 'user',
    bio: 'Uses TaskMarket to both post and complete local paid tasks.',
  },
];

function buildTaskTitle() {
  const prefixes = ['Need help with', 'Looking for support on', 'Urgent help required for'];
  const topic = pick(TASK_TOPICS);
  return {
    topic,
    title: `${pick(prefixes)} ${topic}`,
  };
}
function buildTaskDescription(topic) {
  const location = pick(TASK_LOCATIONS);
  const deadlineText = `${randomInt(1, 4)} day${randomInt(1, 4) > 1 ? 's' : ''}`;
  const lines = [
    `Task: ${topic} in ${location}.`,
    'Scope: Please share a quick plan before starting and keep status updates in chat.',
    'Closure: Task will be marked closed only after work handover and offline payment confirmation by both sides.',
  ];
  return lines.join(' ');
}
function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function sample(array, count) {
  return [...array].sort(() => Math.random() - 0.5).slice(0, count);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function clearCollections() {
  await Message.deleteMany({});
  await Conversation.deleteMany({});
  await Review.deleteMany({});
  await Report.deleteMany({});
  await Offer.deleteMany({});
  await Task.deleteMany({});
  await User.deleteMany({});
}

async function createUsers() {
  const users = [];

  const adminPasswordHash = await bcrypt.hash(env.adminPassword, 12);
  users.push(
    await User.create({
      fullName: env.adminFullName,
      email: env.adminEmail,
      passwordHash: adminPasswordHash,
      role: 'admin',
    })
  );

  const fixedPasswordHash = await bcrypt.hash('12345678', 12);
  for (const fixedUser of FIXED_DEMO_USERS) {
    const createdOrUpdated = await User.findOneAndUpdate(
      { email: fixedUser.email },
      {
        $set: {
          fullName: fixedUser.fullName,
          role: fixedUser.role,
          passwordHash: fixedPasswordHash,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
    users.push(createdOrUpdated);
  }

  const userCount = 16;

  for (let index = 0; index < userCount; index += 1) {
    users.push(
      await User.create({
        fullName: faker.person.fullName(),
        email: `member${index + 1}.${faker.string.alphanumeric(4)}@example.com`.toLowerCase(),
        passwordHash: await bcrypt.hash('Passw0rd!', 12),
        role: 'user',
      })
    );
  }

  return users;
}

async function createTasksAndOffers(users) {
  const members = users.filter((user) => user.role !== 'admin');
  const tasks = [];
  const offers = [];

  for (let index = 0; index < 16; index += 1) {
    const requester = pick(members);
    const lifecycle = pick(['open', 'open', 'assigned', 'work_submitted', 'closed', 'cancelled']);
    const taskText = buildTaskTitle();
    const task = await Task.create({
      requesterId: requester._id,
      title: taskText.title,
      description: buildTaskDescription(taskText.topic),
      budgetAmount: randomInt(500, 8000),
      currency: 'INR',
      status: lifecycle,
      cancelledAt: lifecycle === 'cancelled' ? faker.date.recent({ days: 7 }) : null,
    });

    const candidateFulfillers = members.filter(
      (fulfiller) => String(fulfiller._id) !== String(requester._id)
    );
    const offeringFulfillers = sample(candidateFulfillers, randomInt(1, Math.min(3, candidateFulfillers.length)));

    const taskOffers = [];
    for (const fulfiller of offeringFulfillers) {
      const createdOffer = await Offer.create({
        taskId: task._id,
        fulfillerId: fulfiller._id,
        amount: Math.max(100, task.budgetAmount + randomInt(-400, 900)),
        message: pick(OFFER_MESSAGES),
        status: 'pending',
      });
      taskOffers.push(createdOffer);
      offers.push(createdOffer);
    }

    if (['assigned', 'work_submitted', 'closed'].includes(lifecycle) && taskOffers.length > 0) {
      const acceptedOffer = pick(taskOffers);

      await Offer.updateMany(
        { taskId: task._id, _id: { $ne: acceptedOffer._id } },
        { $set: { status: 'rejected' } }
      );

      await Offer.findByIdAndUpdate(acceptedOffer._id, { $set: { status: 'accepted' } });

      task.assignedFulfillerId = acceptedOffer.fulfillerId;
      task.acceptedOfferId = acceptedOffer._id;

      if (lifecycle === 'work_submitted' || lifecycle === 'closed') {
        task.workSubmittedAt = faker.date.recent({ days: 5 });
      }

      if (lifecycle === 'closed') {
        task.requesterConfirmedOffline = true;
        task.fulfillerConfirmedOffline = true;
        task.closedAt = faker.date.recent({ days: 2 });
      }

      await task.save();
    }

    tasks.push(task);
  }

  return { tasks, offers };
}

async function createConversationsAndMessages(tasks) {
  const conversations = [];
  let messagesCreated = 0;

  const assignedTasks = tasks.filter((task) => task.assignedFulfillerId);
  for (const task of assignedTasks) {
    const conversation = await Conversation.create({
      taskId: task._id,
      requesterId: task.requesterId,
      fulfillerId: task.assignedFulfillerId,
    });
    conversations.push(conversation);

    const senderIds = [task.requesterId, task.assignedFulfillerId];
    const messageCount = randomInt(3, 7);
    for (let index = 0; index < messageCount; index += 1) {
      await Message.create({
        conversationId: conversation._id,
        senderId: senderIds[index % 2],
        body: pick(CHAT_MESSAGES),
      });
      messagesCreated += 1;
    }
  }

  return { conversations, messagesCreated };
}

async function createReviewsAndRatings(tasks) {
  const closedTasks = tasks.filter((task) => task.status === 'closed' && task.assignedFulfillerId);
  let reviewsCreated = 0;

  for (const task of sample(closedTasks, Math.min(8, closedTasks.length))) {
    await Review.create({
      taskId: task._id,
      reviewerId: task.requesterId,
      revieweeId: task.assignedFulfillerId,
      rating: randomInt(4, 5),
      comment: pick(REVIEW_COMMENTS),
    });
    reviewsCreated += 1;
  }

  const ratingRows = await Review.aggregate([
    {
      $group: {
        _id: '$revieweeId',
        averageRating: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  await User.updateMany({}, { $set: { averageRating: 0, ratingCount: 0 } });

  for (const row of ratingRows) {
    await User.updateOne(
      { _id: row._id },
      {
        $set: {
          averageRating: Number(row.averageRating.toFixed(2)),
          ratingCount: row.ratingCount,
        },
      }
    );
  }

  return reviewsCreated;
}

async function createReports(users, tasks) {
  const nonAdminUsers = users.filter((user) => user.role !== 'admin');
  let reportsCreated = 0;

  for (let index = 0; index < 4; index += 1) {
    const reporter = pick(nonAdminUsers);
    const targetType = pick(['task', 'user']);
    const targetId = targetType === 'task' ? pick(tasks)._id : pick(nonAdminUsers)._id;

    await Report.create({
      reporterId: reporter._id,
      targetType,
      targetId,
      reason: pick(REPORT_REASONS),
      status: index % 3 === 0 ? 'resolved' : 'open',
      resolutionNote: index % 3 === 0 ? 'Checked by moderation team.' : '',
      resolvedBy: index % 3 === 0 ? users.find((user) => user.role === 'admin')._id : null,
      resolvedAt: index % 3 === 0 ? faker.date.recent({ days: 3 }) : null,
    });
    reportsCreated += 1;
  }

  return reportsCreated;
}

async function run() {
  await connectDatabase(env.mongoUri);

  if (RESET_BY_DEFAULT) {
    await clearCollections();
  }

  const users = await createUsers();
  const { tasks, offers } = await createTasksAndOffers(users);
  const { conversations, messagesCreated } = await createConversationsAndMessages(tasks);
  const reviewsCreated = await createReviewsAndRatings(tasks);
  const reportsCreated = await createReports(users, tasks);

  console.log('Seed complete');
  console.log(`- users: ${users.length}`);
  console.log(`- tasks: ${tasks.length}`);
  console.log(`- offers: ${offers.length}`);
  console.log(`- conversations: ${conversations.length}`);
  console.log(`- messages: ${messagesCreated}`);
  console.log(`- reviews: ${reviewsCreated}`);
  console.log(`- reports: ${reportsCreated}`);
  console.log(`- mode: ${RESET_BY_DEFAULT ? 'reset' : 'append'}`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  });
