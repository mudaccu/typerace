// Live rooms over Supabase Realtime. No database tables are used:
// presence tracks who's in the room, broadcast sends start/progress/finish messages.
import { sb } from "./online.js";

let channel = null, code = null, myId = null, list = [];

export const room = () => code;
export const players = () => list;
// The host is whoever has been in the room the longest.
export const isHost = () => list.length > 0 && list[0].id === myId;

export const newCode = () =>
  Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)]).join("");

export async function joinRoom(roomCode, me, on) {
  const c = await sb();
  myId = me.id;
  code = roomCode;
  const joinedAt = Date.now();
  channel = c.channel("typerace-" + roomCode, { config: { presence: { key: me.id }, broadcast: { self: true } } });
  channel
    .on("presence", { event: "sync" }, () => {
      list = Object.entries(channel.presenceState())
        .map(([id, metas]) => ({ id, ...metas[0] }))
        .sort((a, b) => a.joinedAt - b.joinedAt);
      on.players(list);
    })
    .on("broadcast", { event: "start" }, ({ payload }) => on.start(payload))
    .on("broadcast", { event: "progress" }, ({ payload }) => on.progress(payload))
    .on("broadcast", { event: "finish" }, ({ payload }) => on.finish(payload));

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timed out")), 10000);
    channel.subscribe(async status => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        me.joinedAt = joinedAt;
        channel.me = me;
        await channel.track({ name: me.name, car: me.car, joinedAt });
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timer);
        reject(new Error(status));
      }
    });
  });
}

export function updateMe(changes) {
  if (!channel) return;
  Object.assign(channel.me, changes);
  channel.track({ name: channel.me.name, car: channel.me.car, joinedAt: channel.me.joinedAt });
}

export function send(event, payload) {
  if (channel) channel.send({ type: "broadcast", event, payload });
}

export async function leaveRoom() {
  if (channel) await channel.unsubscribe().catch(() => {});
  channel = null;
  code = null;
  list = [];
}
