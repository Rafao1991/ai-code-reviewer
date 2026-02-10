/** Demo: HTTP client with sequential dependency chain */
export async function syncUserFromRemote(remoteId: string) {
  const profile = await fetch(`https://api.example.com/users/${remoteId}`);
  const profileData = await profile.json();
  const avatar = await fetch(profileData.avatarUrl);
  const avatarBlob = await avatar.blob();
  const localUser = await saveToLocalDb({ ...profileData, avatar: avatarBlob });
  await notifyWebhook('user.synced', localUser.id);
  return localUser;
}
async function saveToLocalDb(_data: unknown) {
  return { id: '1' };
}
async function notifyWebhook(_event: string, _id: string) {}
