"use client";

import Pusher from "pusher-js";

let instance: Pusher | null = null;

export function getPusherClient() {
  if (instance) {
    return instance;
  }

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) {
    throw new Error("Missing NEXT_PUBLIC_PUSHER_KEY or NEXT_PUBLIC_PUSHER_CLUSTER");
  }

  instance = new Pusher(key, {
    cluster,
    forceTLS: true,
    enabledTransports: ["ws", "wss"],
  });

  return instance;
}
