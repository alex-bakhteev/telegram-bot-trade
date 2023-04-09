export const isAuthorized = (ctx) => {
  if (!ctx.chat) {
    return false;
  }

  const username = ctx.chat.username;

  if (!username) {
    return false;
  }

  if (!process.env.AUTHORIZED_USERNAMES) {
    return false;
  }

  const authUsers = process.env.AUTHORIZED_USERNAMES.split(',').map((it) =>
    it.trim()
  );
  return authUsers.includes(username);
};
