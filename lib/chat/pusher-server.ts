import "server-only";

import Pusher from "pusher";

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing ${name} in environment variables`);
  }

  return value;
}

const appId = requireEnv(process.env.PUSHER_APP_ID, "PUSHER_APP_ID");
const key = requireEnv(process.env.PUSHER_KEY, "PUSHER_KEY");
const secret = requireEnv(process.env.PUSHER_SECRET, "PUSHER_SECRET");
const cluster = requireEnv(process.env.PUSHER_CLUSTER, "PUSHER_CLUSTER");

export const pusherServer = new Pusher({
  appId,
  key,
  secret,
  cluster,
  useTLS: true,
});
