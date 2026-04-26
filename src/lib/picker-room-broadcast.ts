import type { PickerRoomState } from "./picker-room-state";

export type RoomBroadcast = {
  version: number;
  state: PickerRoomState;
  sourceTabId: string;
};

const listeners = new Map<string, Set<(msg: RoomBroadcast) => void>>();

export function subscribeToPickerRoom(
  roomId: string,
  onMessage: (msg: RoomBroadcast) => void
): () => void {
  if (!listeners.has(roomId)) listeners.set(roomId, new Set());
  const set = listeners.get(roomId)!;
  set.add(onMessage);
  return () => {
    set.delete(onMessage);
    if (set.size === 0) listeners.delete(roomId);
  };
}

export function broadcastPickerRoom(roomId: string, msg: RoomBroadcast): void {
  const set = listeners.get(roomId);
  if (!set) return;
  for (const cb of set) {
    try {
      cb(msg);
    } catch (e) {
      console.error("[picker-room] broadcast error:", e);
    }
  }
}
