import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  subscribeToPickerRoom,
  type RoomBroadcast,
} from "@/lib/picker-room-broadcast";
import { isPickerState } from "@/lib/picker-room-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function sseEncode(event: string, data: unknown): Uint8Array {
  const str = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(str);
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id: roomId } = await params;

  const room = await prisma.pickerRoom.findUnique({ where: { id: roomId } });
  if (!room) {
    return new Response("Not found", { status: 404 });
  }
  if (!isPickerState(room.state)) {
    return new Response("Invalid room", { status: 500 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: object) => {
        try {
          controller.enqueue(sseEncode(event, data));
        } catch {
          // stream closed
        }
      };

      send("sync", {
        version: room.version,
        state: room.state,
        sourceTabId: "",
        sourceUserId: "",
      });

      const onBroadcast = (msg: RoomBroadcast) => {
        send("update", msg);
      };
      const unsub = subscribeToPickerRoom(roomId, onBroadcast);
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`: keepalive\n\n`));
        } catch {
          clearInterval(keepAlive);
        }
      }, 30000);

      const onAbort = () => {
        clearInterval(keepAlive);
        unsub();
        try {
          controller.close();
        } catch {
          // ignore
        }
      };
      req.signal.addEventListener("abort", onAbort, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform, no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
