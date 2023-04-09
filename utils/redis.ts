import { createClient } from 'redis';

declare const global: {
  client: any;
};

export const initRedis = async () => {
  const redisUrl = process.env.REDIS_TLS_URL || process.env.REDIS_URL || '';

  const client = createClient({
    url: redisUrl,
    socket: {
      tls: !!process.env.REDIS_TLS_URL,
      rejectUnauthorized: false
    }
  });

  client.on('error', (err) => console.log('Redis Client Error', err));

  await client.connect();

  console.log('Redis connected');

  global.client = client;
};

export const getUserSession = async (chatId) => {
  console.log('get', chatId);
  const { client } = global;

  const users = await client.get('users');

  const user = JSON.parse(users)[chatId];

  return user || {};
};

export const updateUserSession = async (chatId, key, data) => {
  console.log('update', chatId);
  const { client } = global;

  const usersSession = JSON.parse(await client.get('users'));

  if (!usersSession[chatId]) {
    usersSession[chatId] = {};
  }

  usersSession[chatId][key] = { ...usersSession[chatId][key], ...data };

  await client.set('users', JSON.stringify(usersSession));
};

export const setUserSession = async (chatId, data) => {
  const { client } = global;

  const usersSession = JSON.parse(await client.get('users'));

  usersSession[chatId] = { ...usersSession[chatId], ...data };

  await client.set('users', JSON.stringify(usersSession));
};

export const clearUserSession = async (chatId) => {
  const { client } = global;

  const usersSession = JSON.parse(await client.get('users')) || {};
  usersSession[chatId] = {};

  await client.set('users', JSON.stringify(usersSession));
};

export const getAuthorizedUsers = async () => {
  const { client } = global;

  const authorizedUsers = JSON.parse(await client.get('authorizedUsers')) || [];

  return authorizedUsers || [];
};

export const setAuthorizedUser = async (ctx) => {
  const { username, id } = ctx.chat;

  const { client } = global;

  const authorizedUsers = JSON.parse(await client.get('authorizedUsers')) || [];

  const updatedAuthorizedUsers = [
    ...authorizedUsers,
    { username, id, receivedMessage: false }
  ];

  await client.set('authorizedUsers', JSON.stringify(updatedAuthorizedUsers));
};

export const setAuthorizedUsers = async (users) => {
  const { client } = global;

  await client.set('authorizedUsers', JSON.stringify(users));
};

// export const setAuthorizedUserReceivedMessage = async (id) => {
//   const { client } = global;

//   const authorizedUsers = JSON.parse(await client.get('authorizedUsers')) || [];

//   const updatedAuthorizedUsers = authorizedUsers.map((user) => {
//     return user.id === id ? { ...user, receivedMessage: true } : user;
//   });

//   await client.set('authorizedUsers', JSON.stringify(updatedAuthorizedUsers));
// };

// export const clearAuthorizedUserReceivedMessage = async () => {
//   const { client } = global;

//   const authorizedUsers = JSON.parse(await client.get('authorizedUsers')) || [];

//   const updatedAuthorizedUsers = authorizedUsers.map((user) => ({
//     ...user,
//     receivedMessage: false
//   }));

//   await client.set('authorizedUsers', JSON.stringify(updatedAuthorizedUsers));
// };

export const getSignals = async () => {
  const { client } = global;

  const signals = JSON.parse(await client.get('signals')) || [];

  return signals;
};

export const setSuccessSignal = async (signal, message, user) => {
  const { client } = global;

  const signals = JSON.parse(await client.get('signals')) || [];

  const updatedSignals = [...signals, { ...signal, message, user }];

  await client.set('signals', JSON.stringify(updatedSignals));
};

export const removeSignal = async (signalId) => {
  const { client } = global;

  const signals = JSON.parse(await client.get('signals')) || [];

  const updatedSignals = signals.filter((item) => item.id !== signalId);

  await client.set('signals', JSON.stringify(updatedSignals));
};

export const clearMainSession = async () => {
  const { client } = global;

  await client.set('signals', JSON.stringify([]));
};
